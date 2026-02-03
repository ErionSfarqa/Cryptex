"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { SettingsResponse } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingWalkthrough, setResettingWalkthrough] = useState(false);

  const { data, refetch } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: () => fetcher("/api/settings"),
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!data) return;
    setName(data.profile?.name ?? "");
    setDarkMode(Boolean(data.settings?.darkMode));
    setEmailAlerts(Boolean(data.settings?.emailAlerts));
    setInAppAlerts(Boolean(data.settings?.inAppAlerts));
  }, [data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const saveSettings = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        darkMode,
        emailAlerts,
        inAppAlerts,
      }),
    });
    setSaving(false);
    refetch();
  };

  const resetWalkthrough = async () => {
    setResettingWalkthrough(true);
    await fetch("/api/settings/first-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    const identifier = data.user?.id ?? data.user?.email ?? null;
    if (identifier) {
      localStorage.removeItem(`walkthrough_seen:${identifier}`);
    }
    setResettingWalkthrough(false);
    refetch();
  };

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Settings" />
      <Card className="flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-semibold">Profile</h3>
          <p className="text-sm text-[var(--muted)]">
            Manage your public information.
          </p>
        </div>
        <div className="grid gap-3">
          <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Display name
          </label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-3">
          <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Email
          </label>
          <Input value={data?.profile?.email ?? ""} disabled />
        </div>
      </Card>

      <Card className="flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-semibold">Preferences</h3>
          <p className="text-sm text-[var(--muted)]">
            Customize your experience.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(event) => setDarkMode(event.target.checked)}
          />
          <div>
            <div className="font-semibold">Dark mode</div>
            <div className="text-xs text-[var(--muted)]">
              Use a darker UI theme.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(event) => setEmailAlerts(event.target.checked)}
          />
          <div>
            <div className="font-semibold">Email alerts</div>
            <div className="text-xs text-[var(--muted)]">
              Receive critical system emails only.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
          <input
            type="checkbox"
            checked={inAppAlerts}
            onChange={(event) => setInAppAlerts(event.target.checked)}
          />
          <div>
            <div className="font-semibold">In-app alerts</div>
            <div className="text-xs text-[var(--muted)]">
              Show trade confirmations and system alerts.
            </div>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <button
          type="button"
          onClick={resetWalkthrough}
          disabled={resettingWalkthrough}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resettingWalkthrough ? "Resetting walkthrough..." : "Reset walkthrough"}
        </button>
      </Card>
    </div>
  );
}

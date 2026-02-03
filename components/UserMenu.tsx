"use client";

import Button from "./ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function UserMenu({ name }: { name?: string | null }) {
  const signOut = async () => {
    await fetch("/api/admin/lock", { method: "POST" }).catch(() => {});
    await fetch("/api/admin99/logout", { method: "POST" }).catch(() => {});
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col text-right">
        <span className="text-xs text-[var(--muted)]">Signed in as</span>
        <span className="text-sm font-semibold">{name ?? "Trader"}</span>
      </div>
      <Button variant="secondary" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

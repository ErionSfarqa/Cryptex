"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import WalkthroughModal from "@/components/WalkthroughModal";
import { formatNumber, formatUsd } from "@/lib/utils";
import type { PortfolioResponse, SettingsResponse, Trade } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

import LiveBalance from "@/components/ui/LiveBalance";

export default function DashboardPage() {
  const [resetting, setResetting] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughKey, setWalkthroughKey] = useState<string | null>(null);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== "undefined" ? document.hidden : false
  );
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const REFETCH_MS = 8000;
  const { data: portfolio } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio"],
    queryFn: () => fetcher("/api/portfolio"),
    refetchInterval: tabHidden ? false : REFETCH_MS,
    refetchIntervalInBackground: false,
  });
  const { data: openTrades } = useQuery<{ trades: Trade[] }>({
    queryKey: ["trades", "open"],
    queryFn: () => fetcher("/api/trades?status=open"),
    refetchInterval: tabHidden ? false : REFETCH_MS,
    refetchIntervalInBackground: false,
  });
  const { data: closedTrades } = useQuery<{ trades: Trade[] }>({
    queryKey: ["trades", "closed"],
    queryFn: () => fetcher("/api/trades?status=closed"),
    refetchInterval: tabHidden ? false : REFETCH_MS,
    refetchIntervalInBackground: false,
  });
  const { data: settings, refetch: refetchSettings } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: () => fetcher("/api/settings"),
  });

  const handleReset = async () => {
    setResetting(true);
    await fetch("/api/demo/reset", { method: "POST" });
    setResetting(false);
  };

  const firstRun = settings?.settings && !settings.settings.firstRunComplete;

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const identifier = data.user?.id ?? data.user?.email ?? null;
        if (!identifier || !active) return;
        setWalkthroughKey(`walkthrough_seen:${identifier}`);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!firstRun || !walkthroughKey) return;
    // Use a per-user localStorage flag so the walkthrough only shows once per browser.
    if (localStorage.getItem(walkthroughKey)) return;
    setTimeout(() => setWalkthroughOpen(true), 0);
  }, [firstRun, walkthroughKey]);

  const markWalkthroughSeen = () => {
    if (walkthroughKey) {
      localStorage.setItem(walkthroughKey, "true");
    }
    setWalkthroughOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Available Balance
          </span>
          <span className="text-2xl font-semibold">
            {portfolio ? formatUsd(portfolio.balance) : "$0.00"}
          </span>
          <Button variant="secondary" onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset balance"}
          </Button>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Equity
          </span>
          <span className="text-2xl font-semibold">
            {portfolio ? formatUsd(portfolio.equity) : "$0.00"}
          </span>
          <span className="text-xs text-[var(--muted)]">
            Includes open positions.
          </span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Open Positions
          </span>
          <span className="text-2xl font-semibold">
            {portfolio?.positions?.length ?? 0}
          </span>
          <span className="text-xs text-[var(--muted)]">
            Track unrealized P&L in Portfolio.
          </span>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Open orders</h3>
            <Badge tone="neutral">{openTrades?.trades?.length ?? 0} open</Badge>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            {(openTrades?.trades ?? []).slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div>
                  <div className="font-semibold">
                    {trade.side} {trade.qty} {trade.symbol}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {trade.type} {trade.limitPrice ? `@ ${trade.limitPrice}` : ""}
                  </div>
                </div>
                <Badge tone="neutral">{trade.status}</Badge>
              </div>
            ))}
            {(openTrades?.trades?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No open orders. Place a trade to get started.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Recent trades</h3>
            <Badge tone="success">
              {closedTrades?.trades?.length ?? 0} filled
            </Badge>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            {(closedTrades?.trades ?? []).slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div>
                  <div className="font-semibold">
                    {trade.side} {formatNumber(trade.qty)} {trade.symbol}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Filled @ {trade.fillPrice?.toFixed(2)}
                  </div>
                </div>
                <Badge tone="success">FILLED</Badge>
              </div>
            ))}
            {(closedTrades?.trades?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No filled trades yet.
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      <WalkthroughModal
        open={walkthroughOpen}
        onClose={markWalkthroughSeen}
        onComplete={() => refetchSettings()}
      />
    </div>
  );
}

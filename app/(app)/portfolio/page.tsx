"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatUsd } from "@/lib/utils";
import type { PortfolioResponse, PortfolioPosition } from "@/lib/types";
import LiveBalance from "@/components/ui/LiveBalance";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function PortfolioRow({ pos }: { pos: PortfolioPosition }) {
  const [isClosing, setIsClosing] = useState(false);
  const qc = useQueryClient();

  const handleClose = async () => {
    if (!confirm(`Close ${pos.qty} ${pos.assetSymbol}?`)) return;
    setIsClosing(true);

    try {
      const res = await fetch('/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pos.assetSymbol, quantity: Math.abs(pos.qty), id: pos.id }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        alert(data.error ?? 'Failed to close position.');
        setIsClosing(false);
      } else {
        // Success - invalidate queries to refresh data
        qc.invalidateQueries({ queryKey: ["portfolio"] });
        qc.invalidateQueries({ queryKey: ["trades"] });
      }
    } catch (e) {
      setIsClosing(false);
      alert("An error occurred while closing the position.");
    }
  };

  const pnl = pos.unrealizedPnl ?? 0;
  const tone = pnl >= 0 ? "text-emerald-600" : "text-rose-600";
  
  return (
    <tr className={`border-t border-[var(--border)] transition-all duration-500 ${isClosing ? "opacity-50 bg-red-500/10" : ""}`}>
      <td className="py-3 font-semibold">{pos.assetSymbol}</td>
      <td className="py-3">{formatNumber(pos.qty)}</td>
      <td className="py-3">{formatUsd(pos.avgEntry)}</td>
      <td className="py-3">{formatUsd(pos.latestPrice ?? 0)}</td>
      <td className={`py-3 font-semibold ${tone}`}>
        {formatUsd(pnl)}
      </td>
      <td className="py-3">
        <Button 
            variant="secondary" 
            className="px-2 py-1 text-xs" 
            onClick={handleClose}
            disabled={isClosing}
        >
          {isClosing ? "Closing..." : "Close"}
        </Button>
      </td>
    </tr>
  );
}

const PORTFOLIO_REFETCH_MS = 5000;

export default function PortfolioPage() {
  const [tabHidden, setTabHidden] = useState(typeof document !== "undefined" ? document.hidden : false);
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const { data: portfolio } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio"],
    queryFn: () => fetcher("/api/portfolio"),
    refetchInterval: tabHidden ? false : PORTFOLIO_REFETCH_MS,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Portfolio" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Balance
          </span>
          <span className="text-2xl font-semibold">
            {portfolio ? <LiveBalance value={portfolio.balance} /> : "$0.00"}
          </span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Total Equity
          </span>
          <span className="text-2xl font-semibold">
            {portfolio ? <LiveBalance value={portfolio.equity} /> : "$0.00"}
          </span>
        </Card>
      </div>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Open positions</h3>
          <Badge tone="neutral">{portfolio?.positions?.length ?? 0} active</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Asset</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Avg Entry</th>
                <th className="py-2">Last Price</th>
                <th className="py-2">Unrealized P&L</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(portfolio?.positions ?? []).map((pos, i) => {
                const key = pos.id ?? `${pos.assetSymbol}-${i}`;
                return <PortfolioRow key={key} pos={pos} />;
              })}
              {(portfolio?.positions?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                    No open positions. Trade to create your first position.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

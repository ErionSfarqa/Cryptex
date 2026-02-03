"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatNumber, formatUsd } from "@/lib/utils";
import type { Trade } from "@/lib/types";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function HistoryPage() {
  const { data } = useQuery<{ trades: Trade[] }>({
    queryKey: ["trades", "closed"],
    queryFn: () => fetcher("/api/trades?status=closed"),
  });
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [sideFilter, setSideFilter] = useState("ALL");

  const trades = useMemo(() => {
    const items = data?.trades ?? [];
    return items.filter((trade: Trade) => {
      if (symbolFilter !== "ALL" && trade.symbol !== symbolFilter) return false;
      if (sideFilter !== "ALL" && trade.side !== sideFilter) return false;
      return true;
    });
  }, [data, symbolFilter, sideFilter]);

  const exportCsv = () => {
    const headers = [
      "id",
      "symbol",
      "side",
      "type",
      "qty",
      "fillPrice",
      "realizedPnl",
      "filledAt",
    ];
    const rows = trades.map((trade) =>
      [
        trade.id,
        trade.symbol,
        trade.side,
        trade.type,
        trade.qty,
        trade.fillPrice,
        trade.realizedPnl ?? "",
        trade.filledAt,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trade-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Trade History" />
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={symbolFilter}
              onChange={(event) => setSymbolFilter(event.target.value)}
            >
              <option value="ALL">All assets</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
            <select
              className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={sideFilter}
              onChange={(event) => setSideFilter(event.target.value)}
            >
              <option value="ALL">All sides</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <Button variant="secondary" onClick={exportCsv} className="w-full sm:w-auto">
            Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Asset</th>
                <th className="py-2">Side</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Fill Price</th>
                <th className="py-2">Realized P&L</th>
                <th className="py-2">Filled At</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-t border-[var(--border)]">
                  <td className="py-3 font-semibold">{trade.symbol}</td>
                  <td className="py-3">{trade.side}</td>
                  <td className="py-3">{formatNumber(trade.qty)}</td>
                  <td className="py-3">{formatUsd(trade.fillPrice ?? 0)}</td>
                  <td className="py-3">
                    {trade.realizedPnl != null
                      ? formatUsd(trade.realizedPnl)
                      : "-"}
                  </td>
                  <td className="py-3">
                    {trade.filledAt
                      ? new Date(trade.filledAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                    No trades found.
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

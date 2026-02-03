"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PriceChart from "@/components/PriceChart";
import type { TradeSignal } from "@/components/PriceChart";
import Badge from "@/components/ui/Badge";
import OrderForm from "@/components/trade/OrderForm";
import { formatUsd } from "@/lib/utils";
import type { Asset } from "@/lib/types";

type LatestResponse = {
  symbol: string;
  price: number;
  delayedMinutes?: number;
  timestamp?: string;
};

type Position = {
  id: string;
  assetSymbol: string;
  qty: number;
  avgEntry: number;
  unrealizedPnl: number;
  latestPrice: number;
  marketValue: number;
  sl?: number | null;
  tp?: number | null;
  updated_at?: string | null;
};

type KlinesResponse = {
  symbol: string;
  interval: string;
  candles: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
};

async function fetcher(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal, cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed");
  }
  return data;
}

function toMarketSymbol(value: string) {
  const upper = value.trim().toUpperCase();
  return upper.endsWith("USDT") ? upper : `${upper}USDT`;
}

export default function TradePage() {
  const [symbol, setSymbol] = useState("BTC");
  const [interval, setInterval] = useState("15m");
  const [message, setMessage] = useState<string | null>(null);
  const [stopMessage, setStopMessage] = useState<string | null>(null);
  const [stopOverrides, setStopOverrides] = useState<Record<string, { sl: string; tp: string }>>({});
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== "undefined" ? document.hidden : false
  );
  // Optimistic buy/sell signal shown the moment order is filled (cleared when trades refetch)
  const [lastFilledSignal, setLastFilledSignal] = useState<{
    symbol: string;
    time: string;
    price: number;
    side: "buy" | "sell";
  } | null>(null);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const { data: assets } = useQuery<{ assets: Asset[] }>({
    queryKey: ["assets"],
    queryFn: ({ signal }) => fetcher("/api/assets", signal),
  });

  const { data: portfolio } = useQuery<{ positions: Position[] }>({
    queryKey: ["portfolio"],
    queryFn: ({ signal }) => fetcher("/api/portfolio", signal),
  });

  const marketSymbol = useMemo(() => toMarketSymbol(symbol), [symbol]);

  const positionsForSymbol = useMemo(() => {
    const rows = (portfolio?.positions ?? []).filter((p) => p.assetSymbol === marketSymbol);
    return rows.sort((a, b) => {
      const ta = new Date(a.updated_at ?? 0).getTime();
      const tb = new Date(b.updated_at ?? 0).getTime();
      return tb - ta;
    });
  }, [portfolio, marketSymbol]);

  const currentPosition = useMemo(() => {
    if (selectedPositionId) {
      const found = positionsForSymbol.find((p) => p.id === selectedPositionId);
      if (found) return found;
    }
    return positionsForSymbol[0];
  }, [positionsForSymbol, selectedPositionId]);

  const DATA_REFETCH_MS = 8000;
  const { data: tradesForSymbol } = useQuery<{ trades: Array<{ side: string; fillPrice: number | null; createdAt: string; filledAt: string | null }> }>({
    queryKey: ["trades", marketSymbol],
    queryFn: ({ signal }) => fetcher(`/api/trades?symbol=${marketSymbol}`, signal),
    refetchInterval: tabHidden ? false : DATA_REFETCH_MS,
    refetchIntervalInBackground: false,
  });

  const chartSignals: TradeSignal[] = useMemo(() => {
    const list = tradesForSymbol?.trades ?? [];
    const fromApi = list.map((t) => ({
      time: t.filledAt ?? t.createdAt ?? new Date().toISOString(),
      price: Number(t.fillPrice ?? 0),
      side: t.side.toLowerCase() as "buy" | "sell",
    }));
    if (lastFilledSignal && lastFilledSignal.symbol === marketSymbol) {
      fromApi.push({
        time: lastFilledSignal.time,
        price: lastFilledSignal.price,
        side: lastFilledSignal.side,
      });
      fromApi.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }
    return fromApi;
  }, [tradesForSymbol, lastFilledSignal, marketSymbol]);

  // Clear optimistic signal once trades refetch (avoids duplicate marker)
  useEffect(() => {
    if (tradesForSymbol?.trades?.length != null) setLastFilledSignal(null);
  }, [tradesForSymbol?.trades?.length]);

  const {
    data: latest,
    error: latestError,
    refetch: refetchLatest,
  } = useQuery<LatestResponse>({
    queryKey: ["latest", marketSymbol],
    queryFn: ({ signal }) =>
      fetcher(`/api/market/latest?symbol=${marketSymbol}`, signal),
    refetchInterval: tabHidden ? false : 4000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
  } = useQuery<KlinesResponse>({
    queryKey: ["history", marketSymbol, interval],
    queryFn: ({ signal }) =>
      fetcher(
        `/api/market/klines?symbol=${marketSymbol}&interval=${interval}&limit=1000&t=${Date.now()}`,
        signal
      ),
    // full candles refresh every 15 minutes
    refetchInterval: tabHidden ? false : 900000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Poll for latest candle frequently (10s) to update chart incrementally without replacing full data
  const [latestCandle, setLatestCandle] = useState<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  useEffect(() => {
    if (!marketSymbol) return;
    let stopped = false;
    let controller: AbortController | null = null;

    const run = async () => {
      if (stopped || document.hidden) {
        // Schedule next check when visible
        setTimeout(() => {
          if (!stopped) run();
        }, 10000);
        return;
      }
      controller?.abort();
      controller = new AbortController();
      try {
        const url = `/api/market/klines?symbol=${marketSymbol}&interval=${interval}&limit=1&t=${Date.now()}`;
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const data: KlinesResponse = await res.json().catch(() => null);
        const c = data?.candles?.[0];
        if (c) {
          setLatestCandle({
            timestamp: new Date(Number(c.openTime)).toISOString(),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          });
        }
      } catch (_) {
        // ignore fetch errors
      } finally {
        // next poll in ~5s
        setTimeout(() => {
          if (!stopped) run();
        }, 5000);
      }
    };

    run();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, [marketSymbol, interval]);

  // Map interval string to milliseconds for intra-candle updates
  function intervalToMs(i: string) {
    switch (i) {
      case "1m":
        return 60_000;
      case "5m":
        return 5 * 60_000;
      case "15m":
        return 15 * 60_000;
      case "30m":
        return 30 * 60_000;
      case "1h":
        return 60 * 60_000;
      case "4h":
        return 4 * 60 * 60_000;
      case "1d":
        return 24 * 60 * 60_000;
      default:
        return 15 * 60_000;
    }
  }

  // Use latest price to drive intra-candle updates so the chart moves without a manual refresh
  useEffect(() => {
    if (!history?.candles || !latest) return;
    const rows = history.candles;
    const last = rows[rows.length - 1];
    if (!last) return;
    const openTime = Number(last.openTime);
    const now = Date.now();
    const windowMs = intervalToMs(interval);
    if (now >= openTime && now < openTime + windowMs) {
      const lp = latest.price;
      if (!Number.isFinite(lp)) return;
      const newLatest = {
        timestamp: new Date(openTime).toISOString(),
        open: Number(last.open),
        high: Math.max(Number(last.high), lp),
        low: Math.min(Number(last.low), lp),
        close: lp,
      };
      setLatestCandle(newLatest);
    }
  }, [latest, history, interval]);

  const qc = useQueryClient();

  const placeOrderSignal = async (payload: { symbol: string; side: string; price?: number }) => {
    const fillSymbol = String(payload.symbol);
    if (fillSymbol === marketSymbol) {
      setLastFilledSignal({
        symbol: fillSymbol,
        time: new Date().toISOString(),
        price: Number(payload.price ?? 0),
        side: String(payload.side ?? "").toLowerCase() as "buy" | "sell",
      });
    }
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["trades"] });
    refetchLatest();
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetch("/api/positions/check-tp-sl", { method: "POST" });
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!positionsForSymbol.length) {
      setSelectedPositionId(null);
      return;
    }
    if (!selectedPositionId || !positionsForSymbol.find((p) => p.id === selectedPositionId)) {
      setSelectedPositionId(positionsForSymbol[0].id);
    }
  }, [positionsForSymbol, selectedPositionId]);

  const getStopInputValue = (p: Position, key: "sl" | "tp") => {
    const override = stopOverrides[p.id]?.[key];
    if (override != null) return override;
    const v = key === "sl" ? p.sl : p.tp;
    return v == null ? "" : String(v);
  };

  const getStopNumberValue = (p: Position | undefined, key: "sl" | "tp") => {
    if (!p) return null;
    const override = stopOverrides[p.id]?.[key];
    if (override != null && override !== "") {
      const n = Number(override);
      return Number.isFinite(n) ? n : null;
    }
    const v = key === "sl" ? p.sl : p.tp;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const persistStops = async (id: string, slValue: string, tpValue: string) => {
    setStopMessage(null);
    const sl = slValue.trim() === "" ? null : Number(slValue);
    const tp = tpValue.trim() === "" ? null : Number(tpValue);
    const res = await fetch("/api/positions/update-stops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sl, tp }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStopMessage(data?.error ?? "Failed to update stops.");
      return;
    }
    setStopOverrides((prev) => ({
      ...prev,
      [id]: {
        sl: data.sl == null ? "" : String(data.sl),
        tp: data.tp == null ? "" : String(data.tp),
      },
    }));
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["trades"] });
  };

  const latestPrice = latest?.price ?? 0;
  const delayLabel = latest?.delayedMinutes
    ? `${latest.delayedMinutes} min delayed`
    : "15m delayed";

  const candles = useMemo(() => {
    const rows = history?.candles ?? [];
    return rows.map((row) => ({
      timestamp: new Date(Number(row.openTime)).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
    }));
  }, [history]);
  const candlesLoading = historyLoading && candles.length === 0 && !historyError;

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Trading" />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
              >
                {(assets?.assets ?? []).map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.symbol} - {asset.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm"
                value={interval}
                onChange={(event) => setInterval(event.target.value)}
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="30m">30m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
              <Badge tone="neutral">{delayLabel}</Badge>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                Latest price
              </div>
              <div className="text-2xl font-semibold">{formatUsd(latestPrice)}</div>
            </div>
          </div>
          {latestError instanceof Error ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-xs text-[var(--muted)]">
              {latestError.message}
            </div>
          ) : null}
          <PriceChart
            symbol={marketSymbol}
            candles={candles}
            latestCandle={latestCandle}
            error={historyError ? (historyError instanceof Error ? historyError.message : String(historyError)) : null}
            loading={candlesLoading}
            signals={chartSignals}
            sl={getStopNumberValue(currentPosition, "sl")}
            tp={getStopNumberValue(currentPosition, "tp")}
            onStopPreview={(type, price) => {
              if (!currentPosition) return;
              setSelectedPositionId(currentPosition.id);
              setStopOverrides((prev) => {
                const current = prev[currentPosition.id] ?? {
                  sl: getStopInputValue(currentPosition, "sl"),
                  tp: getStopInputValue(currentPosition, "tp"),
                };
                return {
                  ...prev,
                  [currentPosition.id]: {
                    ...current,
                    [type]: price.toFixed(2),
                  },
                };
              });
            }}
            onStopCommit={(type, price) => {
              if (!currentPosition) return;
              const next = {
                sl: type === "sl" ? price.toFixed(2) : getStopInputValue(currentPosition, "sl"),
                tp: type === "tp" ? price.toFixed(2) : getStopInputValue(currentPosition, "tp"),
              };
              setStopOverrides((prev) => ({
                ...prev,
                [currentPosition.id]: next,
              }));
              persistStops(currentPosition.id, next.sl, next.tp);
            }}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Place order</h3>
            <Badge tone="neutral">Order ticket</Badge>
          </div>
          <div className="grid gap-3">
            <OrderForm symbol={symbol} latestPrice={latestPrice} />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold">Open Positions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="pb-2 font-medium">Symbol</th>
                <th className="pb-2 text-right font-medium">Size</th>
                <th className="pb-2 text-right font-medium">Avg Entry</th>
                <th className="pb-2 text-right font-medium">Price</th>
                <th className="pb-2 text-right font-medium">SL</th>
                <th className="pb-2 text-right font-medium">TP</th>
                <th className="pb-2 text-right font-medium">PnL</th>
              </tr>
            </thead>
            <tbody>
              {(portfolio?.positions ?? []).map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 font-medium">{p.assetSymbol}</td>
                  <td className={`py-3 text-right ${p.qty > 0 ? "text-green-500" : "text-red-500"}`}>
                    {p.qty}
                  </td>
                  <td className="py-3 text-right">{formatUsd(p.avgEntry)}</td>
                  <td className="py-3 text-right">{formatUsd(p.latestPrice)}</td>
                  <td className="py-3 text-right">
                    <Input
                      value={getStopInputValue(p, "sl")}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStopOverrides((prev) => ({
                          ...prev,
                          [p.id]: {
                            sl: value,
                            tp: prev[p.id]?.tp ?? getStopInputValue(p, "tp"),
                          },
                        }));
                      }}
                      onFocus={() => setSelectedPositionId(p.id)}
                      onBlur={() => {
                        const slValue = stopOverrides[p.id]?.sl ?? getStopInputValue(p, "sl");
                        const tpValue = stopOverrides[p.id]?.tp ?? getStopInputValue(p, "tp");
                        const baseSl = p.sl == null ? "" : String(p.sl);
                        const baseTp = p.tp == null ? "" : String(p.tp);
                        if (slValue === baseSl && tpValue === baseTp) return;
                        persistStops(p.id, slValue, tpValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.currentTarget as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </td>
                  <td className="py-3 text-right">
                    <Input
                      value={getStopInputValue(p, "tp")}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStopOverrides((prev) => ({
                          ...prev,
                          [p.id]: {
                            sl: prev[p.id]?.sl ?? getStopInputValue(p, "sl"),
                            tp: value,
                          },
                        }));
                      }}
                      onFocus={() => setSelectedPositionId(p.id)}
                      onBlur={() => {
                        const slValue = stopOverrides[p.id]?.sl ?? getStopInputValue(p, "sl");
                        const tpValue = stopOverrides[p.id]?.tp ?? getStopInputValue(p, "tp");
                        const baseSl = p.sl == null ? "" : String(p.sl);
                        const baseTp = p.tp == null ? "" : String(p.tp);
                        if (slValue === baseSl && tpValue === baseTp) return;
                        persistStops(p.id, slValue, tpValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.currentTarget as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </td>
                  <td className={`py-3 text-right ${p.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatUsd(p.unrealizedPnl)}
                  </td>
                </tr>
              ))}
              {(!portfolio?.positions || portfolio.positions.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-[var(--muted)]">
                    No open positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {stopMessage ? (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--text)]">
              {stopMessage}
            </div>
          ) : null}
        </div>
      </Card>

    </div>
  );
}

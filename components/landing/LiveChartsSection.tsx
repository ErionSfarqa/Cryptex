"use client";

import { useEffect, useMemo, useState } from "react";

const ASSETS = [
  { label: "BTC", symbol: "BTCUSDT", name: "Bitcoin" },
  { label: "ETH", symbol: "ETHUSDT", name: "Ethereum" },
  { label: "SOL", symbol: "SOLUSDT", name: "Solana" },
];

const TIMEFRAMES = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
];

type Stats = {
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
};

type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type MarketState = {
  latestPrice: number | null;
  stats: Stats | null;
  candles: Candle[];
  loading: boolean;
  error: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return currencyFormatter.format(value);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function LiveChartsSection() {
  const [assetIndex, setAssetIndex] = useState(0);
  const [timeframe, setTimeframe] = useState("15m");
  const [refreshKey, setRefreshKey] = useState(0);
  const [demoOrders, setDemoOrders] = useState(3);
  const [market, setMarket] = useState<MarketState>({
    latestPrice: null,
    stats: null,
    candles: [],
    loading: true,
    error: null,
  });

  const asset = ASSETS[assetIndex];

  const chartMeta = useMemo(() => {
    if (market.candles.length < 2) {
      return { points: "", area: "", min: null, max: null };
    }

    const closes = market.candles.map((candle) => candle.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const points = closes
      .map((value, index) => {
        const x = (index / (closes.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(" ");

    const area = `M 0 100 L ${points} L 100 100 Z`;

    return { points, area, min, max };
  }, [market.candles]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadMarket(isInitial = false) {
      if (isInitial) {
        setMarket((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const [latestRes, statsRes, klinesRes] = await Promise.all([
          fetch(`/api/market/latest?symbol=${asset.symbol}`, {
            signal: controller.signal,
          }),
          fetch(`/api/market/stats?symbol=${asset.symbol}`, {
            signal: controller.signal,
          }),
          fetch(
            `/api/market/klines?symbol=${asset.symbol}&interval=${timeframe}&limit=200`,
            { signal: controller.signal }
          ),
        ]);

        if (!latestRes.ok || !statsRes.ok || !klinesRes.ok) {
          throw new Error("Market data unavailable");
        }

        const latestData: { price: number } = await latestRes.json();
        const statsData: Stats = await statsRes.json();
        const klinesData: { candles: Candle[] } = await klinesRes.json();

        if (!active) return;

        setMarket({
          latestPrice: latestData.price,
          stats: statsData,
          candles: klinesData.candles,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!active) return;
        if ((error as Error).name === "AbortError") return;
        setMarket((prev) => ({
          ...prev,
          loading: false,
          error: "Live data is temporarily unavailable.",
        }));
      }
    }

    loadMarket(true);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadMarket(false);
      }
    }, 5000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [asset.symbol, timeframe, refreshKey]);

  const currentPrice = market.latestPrice ?? market.stats?.lastPrice ?? null;
  const changePercent = market.stats?.priceChangePercent ?? null;
  const changeTone =
    changePercent !== null && changePercent >= 0
      ? "text-emerald-600"
      : "text-rose-600";

  return (
    <section id="charts" className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
              Live charts
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Live charts (15-min delayed)
            </h2>
          </div>
          <span className="chip inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]">
            Delayed by 15 minutes
          </span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Preview BTC, ETH, and SOL pricing with 15-minute delayed market data
          from Binance. Demo mode uses a fixed $10,000 simulated balance and is
          not real trading.
        </p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Asset">
          {ASSETS.map((item, index) => (
            <button
              key={item.symbol}
              type="button"
              role="tab"
              aria-selected={index === assetIndex}
              aria-controls="charts-panel"
              onClick={() => setAssetIndex(index)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                index === assetIndex
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Timeframe"
        >
          {TIMEFRAMES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={item.value === timeframe}
              aria-controls="charts-panel"
              onClick={() => setTimeframe(item.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                item.value === timeframe
                  ? "bg-[var(--panel-strong)] text-[var(--text)]"
                  : "border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Current price",
              value: formatCurrency(currentPrice),
            },
            {
              label: "24h change",
              value: formatPercent(changePercent),
              tone: changeTone,
            },
            {
              label: "24h high",
              value: formatCurrency(market.stats?.highPrice ?? null),
            },
            {
              label: "24h low",
              value: formatCurrency(market.stats?.lowPrice ?? null),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm"
            >
              <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                {item.label}
              </div>
              <div
                className={`mt-2 text-lg font-semibold ${item.tone ?? ""}`}
              >
                {market.loading ? "Loading..." : item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        id="charts-panel"
        className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
        role="tabpanel"
        aria-label="Chart panel"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--muted)]">
              {asset.name} / USDT
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {market.loading ? "Loading..." : formatCurrency(currentPrice)}
            </p>
          </div>
          <div
            className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold ${changeTone}`}
          >
            {market.loading ? "--" : formatPercent(changePercent)}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
          {market.loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
              Loading chart...
            </div>
          ) : market.error ? (
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
              <span>{market.error}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-semibold"
              >
                Try again
              </button>
            </div>
          ) : chartMeta.points ? (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-40 w-full"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(20,184,166,0.35)" />
                  <stop offset="100%" stopColor="rgba(20,184,166,0)" />
                </linearGradient>
              </defs>
              <path d={chartMeta.area} fill="url(#chartFill)" />
              <polyline
                points={chartMeta.points}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
              Not enough chart data.
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-xs text-[var(--muted)]">
            15-minute delayed market data.
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-xs text-[var(--muted)]">
            DEMO MODE - Simulated funds. Not real trading.
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-xs">
            <div className="text-[var(--muted)]">Demo balance</div>
            <div className="mt-1 font-semibold">$10,000 fixed</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
              Simulated orders
            </div>
            <div className="mt-1 text-lg font-semibold">{demoOrders}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDemoOrders((value) => Math.max(0, value - 1))}
              className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-semibold"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setDemoOrders((value) => value + 1)}
              className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-semibold"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

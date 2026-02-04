import { NextResponse } from "next/server";
import { buildMarketResponseHeaders, fetchMarketJson } from "@/lib/market";

export const runtime = "nodejs";

const CACHE_SECONDS = 30;
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60";
const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]);

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  ...unknown[]
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol." }, { status: 400 });
  }

  const rawInterval = searchParams.get("interval") ?? "15m";

  function normalizeInterval(input: string): string {
    const v = String(input).trim();
    const lower = v.toLowerCase();
    if (ALLOWED_INTERVALS.has(lower)) return lower;
    if (/^\d+$/.test(v)) {
      const num = Number(v);
      if (num === 1) return "1m";
      if (num === 5) return "5m";
      if (num === 15) return "15m";
      if (num === 30) return "30m";
      if (num === 60) return "1h";
      if (num === 240) return "4h";
      if (num === 1440) return "1d";
    }
    if (lower === "m" || lower === "min") return "1m";
    if (lower === "d" || lower === "day" || lower === "1day") return "1d";
    if (lower === "h" || lower === "hour" || lower === "1hour") return "1h";
    const match = lower.match(/^(\d+)\s*(m|min|h|hour|d|day)$/);
    if (match) {
      const n = Number(match[1]);
      const unit = match[2];
      if (unit.startsWith("m")) {
        if (n === 1 || n === 5 || n === 15 || n === 30) return `${n}m`;
      } else if (unit.startsWith("h")) {
        if (n === 1 || n === 4) return `${n}h`;
      } else if (unit.startsWith("d")) {
        if (n === 1) return "1d";
      }
    }
    return "15m";
  }

  const interval = normalizeInterval(rawInterval);

  const limitParam = Number(searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 50), 1000)
    : 200;

  const { data, sourceBaseUrl } = await fetchMarketJson<BinanceKline[]>(
    "/api/v3/klines",
    { symbol, interval, limit: String(limit) },
    { cacheSeconds: CACHE_SECONDS }
  );

  if (!data) {
    return NextResponse.json(
      { error: "Market data unavailable." },
      {
        status: 502,
        headers: buildMarketResponseHeaders(CACHE_CONTROL, sourceBaseUrl),
      }
    );
  }

  return NextResponse.json(
    {
      symbol,
      interval,
      candles: data.map((row) => ({
        openTime: row[0],
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      })),
    },
    {
      headers: buildMarketResponseHeaders(CACHE_CONTROL, sourceBaseUrl),
    }
  );
}

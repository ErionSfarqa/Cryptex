import { NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";
const CACHE_CONTROL = "public, s-maxage=15, stale-while-revalidate=30";
const FETCH_TIMEOUT_MS = 5000;
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  ...unknown[]
];

function resolveKlineOptions(range: string) {
  switch (range) {
    case "1d":
      return { interval: "15m", limit: 96 };
    case "1w":
      return { interval: "1h", limit: 168 };
    case "1m":
      return { interval: "4h", limit: 180 };
    case "1y":
    default:
      return { interval: "4h", limit: 200 };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }

  const mappedSymbol = SYMBOL_MAP[symbol];
  if (!mappedSymbol) {
    return NextResponse.json({ error: "Unsupported symbol." }, { status: 400 });
  }

  const range = searchParams.get("range") ?? "1y";
  const { interval, limit } = resolveKlineOptions(range);

  const url = new URL("/api/v3/klines", BINANCE_BASE);
  url.searchParams.set("symbol", mappedSymbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url.toString(), {
      next: { revalidate: 15 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return NextResponse.json(
        { error: "Market data unavailable." },
        { status: 502 }
      );
    }

    const data: BinanceKline[] = await response.json();
    const history = data.map((row) => ({
      timestamp: new Date(row[0]).toISOString(),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));

    return NextResponse.json(
      { history },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error("Klines error", error);
    return NextResponse.json(
      { error: "Market data unavailable." },
      { status: 502 }
    );
  }
}

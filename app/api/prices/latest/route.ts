import { NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";
const CACHE_CONTROL = "public, s-maxage=5, stale-while-revalidate=10";
const FETCH_TIMEOUT_MS = 5000;
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};
const DELAY_MINUTES = 15;

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

  const url = new URL("/api/v3/ticker/price", BINANCE_BASE);
  url.searchParams.set("symbol", mappedSymbol);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url.toString(), {
      next: { revalidate: 5 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return NextResponse.json(
        { error: "Market data unavailable." },
        { status: 502 }
      );
    }

    const data: { symbol: string; price: string } = await response.json();
    const delayedTimestamp = new Date(
      Date.now() - DELAY_MINUTES * 60 * 1000
    ).toISOString();

    return NextResponse.json(
      {
        symbol,
        price: Number(data.price),
        delayedMinutes: DELAY_MINUTES,
        timestamp: delayedTimestamp,
      },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error("Latest price error", error);
    return NextResponse.json(
      { error: "Market data unavailable." },
      { status: 502 }
    );
  }
}

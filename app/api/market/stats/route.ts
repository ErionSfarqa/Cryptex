import { NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";
const CACHE_CONTROL = "public, s-maxage=15, stale-while-revalidate=30";
const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
const FETCH_TIMEOUT_MS = 5000;

type BinanceStats = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol." }, { status: 400 });
  }

  const url = new URL("/api/v3/ticker/24hr", BINANCE_BASE);
  url.searchParams.set("symbol", symbol);

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

    const data: BinanceStats = await response.json();

    return NextResponse.json(
      {
        symbol: data.symbol,
        lastPrice: Number(data.lastPrice),
        priceChangePercent: Number(data.priceChangePercent),
        highPrice: Number(data.highPrice),
        lowPrice: Number(data.lowPrice),
      },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error("Binance stats error", error);
    return NextResponse.json(
      { error: "Market data unavailable." },
      { status: 502 }
    );
  }
}

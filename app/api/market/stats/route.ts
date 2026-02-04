import { NextResponse } from "next/server";
import { buildMarketResponseHeaders, fetchMarketJson } from "@/lib/market";

export const runtime = "nodejs";

const CACHE_SECONDS = 15;
const CACHE_CONTROL = "public, s-maxage=15, stale-while-revalidate=30";
const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

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

  const { data, sourceBaseUrl } = await fetchMarketJson<BinanceStats>(
    "/api/v3/ticker/24hr",
    { symbol },
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
      symbol: data.symbol,
      lastPrice: Number(data.lastPrice),
      priceChangePercent: Number(data.priceChangePercent),
      highPrice: Number(data.highPrice),
      lowPrice: Number(data.lowPrice),
    },
    {
      headers: buildMarketResponseHeaders(CACHE_CONTROL, sourceBaseUrl),
    }
  );
}

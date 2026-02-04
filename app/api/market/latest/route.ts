import { NextResponse } from "next/server";
import {
  buildMarketResponseHeaders,
  fetchLatestPriceWithSource,
} from "@/lib/market";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=10, stale-while-revalidate=20";
const CACHE_SECONDS = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }

  const { price, sourceBaseUrl } = await fetchLatestPriceWithSource(symbol, {
    cacheSeconds: CACHE_SECONDS,
  });

  if (price === null) {
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
      symbol: symbol,
      price: price,
      delayedMinutes: 15,
    },
    {
      headers: buildMarketResponseHeaders(CACHE_CONTROL, sourceBaseUrl),
    }
  );
}

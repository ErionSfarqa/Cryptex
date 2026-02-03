import { NextResponse } from "next/server";
import { fetchLatestPrice } from "@/lib/market";

const NO_STORE = "no-store, no-cache, must-revalidate";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }

  const price = await fetchLatestPrice(symbol);

  if (price === null) {
    return NextResponse.json(
      { error: "Market data unavailable." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      symbol: symbol,
      price: price,
      delayedMinutes: 15,
    },
    {
      headers: {
        "Cache-Control": NO_STORE,
      },
    }
  );
}

import { NextResponse } from "next/server";

const BINANCE_BASE = "https://api.binance.com";
const FETCH_TIMEOUT_MS = 5000;
const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

export function toMarketSymbol(value: string): string {
  const upper = value.trim().toUpperCase();
  return upper.endsWith("USDT") ? upper : `${upper}USDT`;
}

export async function fetchLatestPrice(symbol: string): Promise<number | null> {
  const marketSymbol = toMarketSymbol(symbol);
  if (!ALLOWED_SYMBOLS.has(marketSymbol)) return null;

  try {
    const url = new URL("/api/v3/ticker/price", BINANCE_BASE);
    url.searchParams.set("symbol", marketSymbol);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) return null;
    
    const data: { price: string } = await response.json();
    const price = Number(data.price);
    
    return Number.isFinite(price) ? price : null;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

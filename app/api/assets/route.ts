import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    assets: [
      { symbol: "BTC", name: "Bitcoin", isActive: true },
      { symbol: "ETH", name: "Ethereum", isActive: true },
      { symbol: "SOL", name: "Solana", isActive: true },
    ],
  });
}


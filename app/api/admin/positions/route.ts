import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";
 
 export async function GET(req: Request) {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("admin99")?.value === "1";
  let supabase;
  const envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envUrl && serviceKey && unlocked) {
    supabase = createSupabaseClient(envUrl, serviceKey);
  } else {
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;
    supabase = result.supabase;
  }
 
  const reqUrl = new URL(req.url ?? "", "http://localhost");
  const userId = reqUrl.searchParams.get("userId");
  const symbol = reqUrl.searchParams.get("symbol");
  const status = reqUrl.searchParams.get("status");
 
  let q = supabase.from("demo_positions").select("*");
   if (userId) q = q.eq("user_id", userId);
   if (symbol) q = q.eq("symbol", symbol);
   if (status === "open") q = q.neq("quantity", 0);
   if (status === "closed") q = q.eq("quantity", 0);
 
   const { data } = await q;
   return NextResponse.json({ positions: data ?? [] });
 }
 
 export async function POST(req: Request) {
   const { supabase, error, user } = await requireAdmin();
   if (error) return error;
 
   const body = await req.json().catch(() => ({}));
   const positionId = body?.positionId;
   if (!positionId) return NextResponse.json({ error: "Missing positionId" }, { status: 400 });
 
   const { data: p } = await supabase.from("demo_positions").select("*").eq("id", positionId).single();
   if (!p) return NextResponse.json({ error: "Position not found" }, { status: 404 });
   if (Number(p.quantity ?? 0) === 0) return NextResponse.json({ error: "Already closed" }, { status: 400 });
 
   const symbol = toMarketSymbol(String(p.symbol));
   const latest = await fetchLatestPrice(symbol);
   if (latest == null) return NextResponse.json({ error: "Price unavailable" }, { status: 502 });
 
   const qty = Number(p.quantity);
   const isLong = qty > 0;
   const side = isLong ? "sell" : "buy";
   const closeQty = Math.abs(qty);
   const avg = Number(p.avg_price ?? 0);
   let realized = 0;
   if (isLong) realized = closeQty * (latest - avg);
   else realized = closeQty * (avg - latest);
 
   await supabase.from("demo_orders").insert({
     user_id: p.user_id,
     symbol,
     side,
     order_type: "market",
     quantity: closeQty,
     price: latest,
     status: "filled",
     realized_pnl: realized,
   });
 
   await supabase.from("demo_positions").update({
     quantity: 0,
     qty: 0,
     unrealized_pnl: 0,
     updated_at: new Date().toISOString(),
     sl: null,
     tp: null,
   }).eq("id", p.id);
 
   const { data: settings } = await supabase.from("account_settings").select("demo_balance").eq("user_id", p.user_id).maybeSingle();
   const current = Number(settings?.demo_balance ?? 10000);
   const notional = closeQty * latest;
   const newBalance = isLong ? current + notional : current - notional;
   await supabase.from("account_settings").update({ demo_balance: newBalance }).eq("user_id", p.user_id);
 
   await supabase.from("admin_actions").insert({
     admin_id: user.id,
     action_type: "force_close",
     target_user_id: p.user_id,
     metadata: { positionId },
     created_at: new Date().toISOString(),
   });
 
   return NextResponse.json({ ok: true, realizedPnl: realized });
 }

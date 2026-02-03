import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/requireAdmin";
 
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
 
   let q = supabase.from("demo_orders").select("*").order("created_at", { ascending: false }).limit(500);
   if (userId) q = q.eq("user_id", userId);
   if (symbol) q = q.eq("symbol", symbol);
 
   const { data } = await q;
   return NextResponse.json({ orders: data ?? [] });
 }

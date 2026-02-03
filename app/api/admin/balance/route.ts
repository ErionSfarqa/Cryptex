 import { NextResponse } from "next/server";
 import { requireAdmin } from "@/lib/auth/requireAdmin";
 
 export async function POST(req: Request) {
   const { supabase, error, user } = await requireAdmin();
   if (error) return error;
 
   const body = await req.json().catch(() => ({}));
   const targetUserId = String(body?.userId ?? "");
   const amountRaw = body?.amount;
   const reset = Boolean(body?.reset ?? false);
   if (!targetUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
 
   if (reset) {
     await supabase.from("demo_positions").delete().eq("user_id", targetUserId);
     await supabase.from("account_settings").update({
       demo_balance: 10000,
       last_reset_at: new Date().toISOString(),
     }).eq("user_id", targetUserId);
     await supabase.from("admin_actions").insert({
       admin_id: user.id,
       action_type: "reset_balance",
       target_user_id: targetUserId,
       metadata: {},
       created_at: new Date().toISOString(),
     });
     return NextResponse.json({ ok: true });
   }
 
   if (amountRaw == null || !Number.isFinite(Number(amountRaw))) {
     return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
   }
   const amount = Number(amountRaw);
 
   await supabase.from("account_settings").update({ demo_balance: amount }).eq("user_id", targetUserId);
   await supabase.from("admin_actions").insert({
     admin_id: user.id,
     action_type: "set_balance",
     target_user_id: targetUserId,
     metadata: { amount },
     created_at: new Date().toISOString(),
   });
 
   return NextResponse.json({ ok: true });
 }

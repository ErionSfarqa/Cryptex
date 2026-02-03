import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get("admin99")?.value === "1";
    if (!unlocked) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceKey = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "balance", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode, user } = admin;
    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.userId ?? "");
    const amountRaw = body?.amount;
    const reset = Boolean(body?.reset ?? false);
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (reset) {
      await supabase.from("demo_positions").delete().eq("user_id", targetUserId);
      await supabase.from("account_settings").update({
        demo_balance: 10000,
        last_reset_at: new Date().toISOString(),
      }).eq("user_id", targetUserId);
      if (mode === "session" && user) {
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action_type: "reset_balance",
          target_user_id: targetUserId,
          metadata: {},
          created_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (amountRaw == null || !Number.isFinite(Number(amountRaw))) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const amount = Number(amountRaw);

    await supabase.from("account_settings").update({ demo_balance: amount }).eq("user_id", targetUserId);
    if (mode === "session" && user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action_type: "set_balance",
        target_user_id: targetUserId,
        metadata: { amount },
        created_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update balance." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check last reset time
    const { data: settings, error: fetchError } = await supabase
      .from("account_settings")
      .select("last_reset_at")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch account settings" }, { status: 500 });
    }

    const now = new Date();
    const lastReset = settings?.last_reset_at ? new Date(settings.last_reset_at) : null;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (lastReset && now.getTime() - lastReset.getTime() < ONE_DAY_MS) {
      const nextResetTime = new Date(lastReset.getTime() + ONE_DAY_MS);
      return NextResponse.json(
        { 
          error: "Balance can only be reset once every 24 hours.", 
          nextResetAvailable: nextResetTime.toISOString() 
        },
        { status: 429 }
      );
    }

    // Reset balance to 10,000 (default)
    // Also clear positions and orders? 
    // Usually "Reset Account" implies wiping slate clean.
    // Requirement says "demo balance reset". It implies restarting.
    // Let's reset balance to 10000 and close all positions (or just delete them).
    // Safest is to delete all demo_positions and reset balance.
    // Maybe keep order history but mark them? Or just leave them.
    // Let's just reset balance and clear positions to avoid "ghost" P&L.
    
    // 1. Delete all positions for user
    const { error: delError } = await supabase
      .from("demo_positions")
      .delete()
      .eq("user_id", user.id);
      
    if (delError) throw delError;

    // 2. Update balance and last_reset_at
    const { error: updateError } = await supabase
      .from("account_settings")
      .upsert({
        user_id: user.id,
        demo_balance: 10000,
        last_reset_at: now.toISOString()
      }, { onConflict: "user_id" });

    if (updateError) throw updateError;
    
    // 3. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Account Reset",
      message: "Your demo account balance has been reset to $10,000.",
      type: "info"
    });

    return NextResponse.json({ ok: true, balance: 10000 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

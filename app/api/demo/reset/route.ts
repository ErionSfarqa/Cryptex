import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

const COOLDOWN_HOURS = 24;

export async function POST() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureProfileAndSettings(supabase, user);

  const { data: settings } = await supabase
    .from("account_settings")
    .select("last_reset_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  const lastReset = settings?.last_reset_at ? new Date(settings.last_reset_at) : null;
  if (lastReset) {
    const hours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    if (hours < COOLDOWN_HOURS) {
      return NextResponse.json(
        { error: "Balance can only be reset once per day." },
        { status: 429 }
      );
    }
  }

  const { error } = await supabase
    .from("account_settings")
    .update({
      demo_balance: 10000,
      last_reset_at: now.toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Reset failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

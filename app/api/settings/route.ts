import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

const schema = z.object({
  name: z.string().min(2).optional(),
  darkMode: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureProfileAndSettings(supabase, user);

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "email, role, created_at, walkthrough_dismissed, walkthrough_completed"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("account_settings")
      .select(
        "demo_balance, last_reset_at, first_run_complete, dark_mode, email_alerts, in_app_alerts"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const firstRunComplete = Boolean(
    profile?.walkthrough_completed || profile?.walkthrough_dismissed
  );

  return NextResponse.json({
    profile: {
      email: profile?.email ?? user.email ?? null,
      name: null,
      role: profile?.role ?? "user",
      createdAt: profile?.created_at ?? null,
    },
    settings: {
      demoBalance: Number(settings?.demo_balance ?? 10000),
      lastResetAt: settings?.last_reset_at ?? null,
      firstRunComplete,
      darkMode: Boolean(settings?.dark_mode ?? false),
      emailAlerts: Boolean(settings?.email_alerts ?? true),
      inAppAlerts: Boolean(settings?.in_app_alerts ?? true),
    },
  });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await ensureProfileAndSettings(supabase, user);

  const { error } = await supabase
    .from("account_settings")
    .update({
      dark_mode: parsed.data.darkMode,
      email_alerts: parsed.data.emailAlerts,
      in_app_alerts: parsed.data.inAppAlerts,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

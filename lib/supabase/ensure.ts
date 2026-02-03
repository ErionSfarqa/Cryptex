import type { SupabaseClient, User } from "@supabase/supabase-js";

function getAdminEmailSet() {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function ensureProfileAndSettings(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">
) {
  // Minimal DB bootstrap for the demo dashboard. Requires tables + RLS policies in Supabase.
  const email = user.email ?? null;
  const adminEmails = getAdminEmailSet();
  let isAdmin = email ? adminEmails.has(email.toLowerCase()) : false;
  if (!isAdmin) {
    const devOverride = process.env.NODE_ENV !== "production" && email === "admin1@admin.admin";
    if (devOverride) {
      isAdmin = true;
    }
    // Explicit allow for owner's email if configured in DB but not in env list
    if (email && email.toLowerCase() === "officialkonvo@gmail.com") {
      isAdmin = true;
    }
  }

  const profilePayload: {
    id: string;
    email: string | null;
    role?: string;
  } = {
    id: user.id,
    email,
  };
  if (isAdmin) {
    profilePayload.role = "admin";
  }

  await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

  // Only insert account_settings when missing so we never overwrite demo_balance
  const { data: existingSettings } = await supabase
    .from("account_settings")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from("account_settings").insert({
      user_id: user.id,
      demo_balance: 10000,
      first_run_complete: false,
      dark_mode: false,
      email_alerts: true,
      in_app_alerts: true,
      role: isAdmin ? "admin" : "user",
    });
  } else if (isAdmin && existingSettings.role !== "admin") {
    await supabase
      .from("account_settings")
      .update({ role: "admin" })
      .eq("user_id", user.id);
  }
}

import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureProfileAndSettings(supabase, user);

  let action: "dismiss" | "complete" | "reset" = "complete";
  try {
    const body = await req.json();
    if (body?.action === "dismiss" || body?.action === "complete") {
      action = body.action;
    } else if (body?.action === "reset") {
      action = "reset";
    }
  } catch {
    action = "complete";
  }

  const profileUpdate: {
    walkthrough_dismissed?: boolean;
    walkthrough_completed?: boolean;
  } = {};

  if (action === "dismiss") {
    profileUpdate.walkthrough_dismissed = true;
  } else if (action === "complete") {
    profileUpdate.walkthrough_completed = true;
  } else if (action === "reset") {
    profileUpdate.walkthrough_dismissed = false;
    profileUpdate.walkthrough_completed = false;
  }

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  if (action === "reset") {
    await supabase
      .from("account_settings")
      .update({ first_run_complete: false })
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("account_settings")
      .update({ first_run_complete: true })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}

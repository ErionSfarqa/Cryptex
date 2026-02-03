import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

type UpdateBody = {
  id?: string;
  sl?: number | string | null;
  tp?: number | string | null;
};

function parseNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProfileAndSettings(supabase, user);

    const body = (await req.json().catch(() => ({}))) as UpdateBody;
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing position id." }, { status: 400 });
    }

    const { data: position } = await supabase
      .from("demo_positions")
      .select("id, quantity, avg_price, sl, tp")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!position) {
      return NextResponse.json({ error: "Position not found." }, { status: 404 });
    }

    const qty = Number((position as { quantity?: number }).quantity ?? 0);
    if (!Number.isFinite(qty) || qty === 0) {
      return NextResponse.json({ error: "Position is closed." }, { status: 400 });
    }

    const avg = Number((position as { avg_price?: number }).avg_price ?? 0);
    const sl = parseNullableNumber(body?.sl);
    const tp = parseNullableNumber(body?.tp);

    if (sl !== null && !Number.isFinite(sl)) {
      return NextResponse.json({ error: "Invalid SL price." }, { status: 400 });
    }
    if (tp !== null && !Number.isFinite(tp)) {
      return NextResponse.json({ error: "Invalid TP price." }, { status: 400 });
    }
    if (sl !== null && sl <= 0) {
      return NextResponse.json({ error: "Stop Loss must be greater than 0." }, { status: 400 });
    }
    if (tp !== null && tp <= 0) {
      return NextResponse.json({ error: "Take Profit must be greater than 0." }, { status: 400 });
    }

    const isLong = qty > 0;
    if (Number.isFinite(avg) && avg > 0) {
      if (isLong) {
        if (sl !== null && sl >= avg) {
          return NextResponse.json({ error: "Stop Loss must be below entry price for Buy." }, { status: 400 });
        }
        if (tp !== null && tp <= avg) {
          return NextResponse.json({ error: "Take Profit must be above entry price for Buy." }, { status: 400 });
        }
      } else {
        if (sl !== null && sl <= avg) {
          return NextResponse.json({ error: "Stop Loss must be above entry price for Sell." }, { status: 400 });
        }
        if (tp !== null && tp >= avg) {
          return NextResponse.json({ error: "Take Profit must be below entry price for Sell." }, { status: 400 });
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("demo_positions")
      .update({
        sl: sl === null ? null : sl,
        tp: tp === null ? null : tp,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, sl, tp")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: updated?.id ?? id,
      sl: updated?.sl ?? (sl === null ? null : sl),
      tp: updated?.tp ?? (tp === null ? null : tp),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update stops." },
      { status: 500 }
    );
  }
}

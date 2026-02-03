import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSupabaseUrl(raw: string) {
  const value = stripWrappingQuotes(raw);
  if (!value) return null;
  const withProtocol =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function hasSupabaseAdminEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : null;
  const serviceKey = rawServiceKey ? stripWrappingQuotes(rawServiceKey) : null;
  return Boolean(url && serviceKey);
}

export function getSupabaseAdminEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : null;
  const serviceKey = rawServiceKey ? stripWrappingQuotes(rawServiceKey) : null;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role key not configured.");
  }
  return { url, serviceKey };
}

export function createSupabaseAdminClient() {
  const { url, serviceKey } = getSupabaseAdminEnv();
  const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("[admin99] env", { route: "supabaseAdmin", hasUrl, hasAnon, hasServiceKey });
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminSupabaseMode = "service" | "session";

export type AdminSupabaseResult =
  | { supabase: SupabaseClient; mode: AdminSupabaseMode; user?: User | null }
  | { error: Response };

export async function getAdminSupabaseClient(): Promise<AdminSupabaseResult> {
  if (hasSupabaseAdminEnv()) {
    return { supabase: createSupabaseAdminClient(), mode: "service" };
  }
  const result = await requireAdmin();
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  return { supabase: result.supabase, mode: "session", user: result.user };
}

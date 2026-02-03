function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
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

export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : null;
  const anonKey = rawAnonKey ? stripWrappingQuotes(rawAnonKey) : null;

  if (!url || !anonKey) {
    throw new Error(
      "Missing/invalid Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL to a full https:// URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your anon key."
    );
  }

  return { url, anonKey };
}

/** Site URL for OAuth redirect (e.g. http://localhost:3000 or https://yourdomain.com). Required for Google OAuth. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const value = raw ? stripWrappingQuotes(raw).trim() : null;
  if (!value) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Set it to your app URL (e.g. http://localhost:3000 in dev)."
    );
  }
  try {
    const u = new URL(value);
    return u.origin;
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SITE_URL. Use a full URL (e.g. http://localhost:3000).");
  }
}


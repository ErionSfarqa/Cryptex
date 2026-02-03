import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Browser Supabase client (stores PKCE verifier in cookies for OAuth). Use in UI pages/components. */
export function createClient() {
  return createSupabaseBrowserClient();
}

export function createSupabaseClient() {
  return createSupabaseBrowserClient();
}

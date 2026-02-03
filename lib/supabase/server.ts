import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Server Supabase client for Route Handlers (can read/write auth cookies). Use in API routes and auth callback. */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export async function createSupabaseRouteHandlerClient() {
  return createClient();
}

/** Server Supabase client for Server Components (read-only cookies; middleware refreshes session). */
export async function createSupabaseServerComponentClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // Server Components can't reliably set cookies; middleware handles refresh.
      setAll() {},
    },
  });
}

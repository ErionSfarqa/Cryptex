"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

type FormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    const maskedEmail = values.email.replace(/^(.).+(@.*)$/, "$1***$2");
    console.log("Login attempt", { email: maskedEmail });

    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (signInError) {
      console.warn("Login failed", { email: maskedEmail, code: signInError.status ?? null, message: signInError.message });
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await ensureProfileAndSettings(supabase, data.user);
    }

    await fetch("/api/admin/lock", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
  };

  const onGoogle = async () => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const siteUrl =
      typeof process.env.NEXT_PUBLIC_SITE_URL === "string" &&
      process.env.NEXT_PUBLIC_SITE_URL.trim()
        ? process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "")
        : window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
    if (oauthError) {
      console.error("Google OAuth error", oauthError);
      setError(oauthError.message);
    }
  };

  return (
    <div className="page-bg min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Access your portfolio and trading tools.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">
              Email
            </label>
            <Input type="email" required {...register("email")} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">
              Password
            </label>
            <Input type="password" required {...register("password")} />
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
          <Link className="hover:text-[var(--text)]" href="/forgot-password">
            Forgot password?
          </Link>
          <Link className="hover:text-[var(--text)]" href="/register">
            Create account
          </Link>
        </div>
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 justify-center transition-colors hover:bg-[var(--panel-strong)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
            onClick={onGoogle}
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.03 1.53 7.41 2.81l5.46-5.46C33.28 3.7 28.94 1.5 24 1.5 14.73 1.5 6.8 6.98 3.2 15.02l6.38 4.95C11.04 13.05 17.05 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.56-.14-3.05-.4-4.5H24v9h12.64c-.55 2.92-2.18 5.39-4.64 7.05l7.07 5.5c4.13-3.8 6.43-9.4 6.43-17.05z" />
                <path fill="#FBBC05" d="M9.58 28.97a14.5 14.5 0 0 1 0-9l-6.38-4.95a23.99 23.99 0 0 0 0 18.9l6.38-4.95z" />
                <path fill="#34A853" d="M24 46.5c4.94 0 9.28-1.63 12.37-4.95l-7.07-5.5c-1.96 1.32-4.46 2.1-7.3 2.1-6.95 0-12.96-3.55-14.42-10.47l-6.38 4.95C6.8 41.02 14.73 46.5 24 46.5z" />
              </svg>
            </span>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

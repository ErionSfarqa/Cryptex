"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FormValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    setSuccess(true);
    reset();
  };

  return (
    <div className="page-bg min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          We’ll email you a reset link if the address is registered.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">
              Email
            </label>
            <Input type="email" required {...register("email")} />
          </div>
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              If that email exists, you’ll receive a reset link shortly.
            </div>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <div className="mt-4 text-sm text-[var(--muted)]">
          <Link className="text-[var(--accent)]" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FormValues = {
  password: string;
};

function ResetPasswordInner() {
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    reset();
  };

  return (
    <div className="page-bg min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Create a new password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose a strong password for your account.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">
              New password
            </label>
            <Input type="password" required {...register("password")} />
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated. You can now sign in.
            </div>
          ) : null}
          <Button type="submit">Reset password</Button>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="page-bg min-h-screen px-6 py-16">
          <div className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
            <div className="text-sm text-[var(--muted)]">Loading...</div>
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}


"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const hasToken = useMemo(() => Boolean(token), [token]);

  return (
    <div className="page-bg min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Supabase may require email confirmation before you can sign in.
        </p>
        <div className="mt-6">
          {!hasToken ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Missing verification token.
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              If you came from an email link, finish verification in Supabase and then sign in.
            </div>
          )}
        </div>
        <div className="mt-6">
          <Link href="/login">
            <Button>Back to sign in</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
      <VerifyInner />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/history", label: "History" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export default function TopNav({
  title,
}: {
  title: string;
  userName?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const signOut = async () => {
    await fetch("/api/admin/lock", { method: "POST" }).catch(() => {});
    await fetch("/api/admin99/logout", { method: "POST" }).catch(() => {});
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="relative flex flex-col gap-4 border-b border-[var(--border)] pb-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold">
          Cryptex
        </Link>
        <button
          type="button"
          className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="flex flex-col gap-1.5">
            <span className="h-0.5 w-6 bg-current" />
            <span className="h-0.5 w-6 bg-current" />
            <span className="h-0.5 w-6 bg-current" />
          </span>
        </button>
      </div>

      {/* Mobile/overlay menu drawer (animates in/out) */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(86vw,360px)] flex-col border-l border-[var(--border)] bg-[var(--panel)] shadow-xl transition-transform duration-200 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-4">
            <div className="text-sm font-semibold">Menu</div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-[var(--panel-strong)]"
              aria-label="Close menu"
            >
              Close
            </button>
          </div>
          <nav className="flex flex-col gap-2 p-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--panel-strong)]"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-[var(--border)] p-4">
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--panel-strong)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-[var(--muted)]">
          Track positions, orders, and portfolio performance in one view.
        </p>
      </div>
    </div>
  );
}

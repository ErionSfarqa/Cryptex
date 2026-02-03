"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "danger";
};

export default function Badge({ tone = "neutral", className, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        tone === "neutral" &&
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        tone === "success" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
        tone === "danger" &&
          "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
        className
      )}
      {...props}
    />
  );
}

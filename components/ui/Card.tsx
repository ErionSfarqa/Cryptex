"use client";

import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

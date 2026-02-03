"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/utils";

export default function LiveBalance({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      if (value > prevValueRef.current) {
        setTimeout(() => setFlash("up"), 0);
      } else if (value < prevValueRef.current) {
        setTimeout(() => setFlash("down"), 0);
      }
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setFlash(null);
      }, 800); // 800ms flash duration

      return () => clearTimeout(timer);
    }
  }, [value]);

  const colorClass =
    flash === "up"
      ? "text-emerald-500 transition-colors duration-300"
      : flash === "down"
      ? "text-rose-500 transition-colors duration-300"
      : "transition-colors duration-500"; // smooth return to normal

  return (
    <span className={`${className} ${colorClass}`}>
      {formatUsd(value)}
    </span>
  );
}

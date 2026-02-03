"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Poll interval for checking SL/TP
const MONITOR_INTERVAL_MS = 10000;

export default function PositionMonitor() {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const checkPositions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await fetch("/api/positions/check-tp-sl", { method: "POST" });
      } catch (err) {
        console.error("Position monitor error:", err);
      }
    };

    const interval = setInterval(checkPositions, MONITOR_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [supabase]);

  return null;
}

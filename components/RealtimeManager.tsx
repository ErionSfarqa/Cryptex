"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function RealtimeManager() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Subscribe to changes in demo_orders (User's orders)
    const ordersChannel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demo_orders" },
        (payload) => {
          console.log("Realtime order update:", payload);
          queryClient.invalidateQueries({ queryKey: ["trades"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    // Subscribe to changes in demo_positions (Portfolio)
    const positionsChannel = supabase
      .channel("realtime-positions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demo_positions" },
        (payload) => {
          console.log("Realtime position update:", payload);
          queryClient.invalidateQueries({ queryKey: ["portfolio"] });
          queryClient.invalidateQueries({ queryKey: ["positions"] });
        }
      )
      .subscribe();

    // Subscribe to changes in account_settings (Balance)
    const accountChannel = supabase
      .channel("realtime-account")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_settings" },
        (payload) => {
          console.log("Realtime account update:", payload);
          queryClient.invalidateQueries({ queryKey: ["account"] });
          queryClient.invalidateQueries({ queryKey: ["balance"] });
        }
      )
      .subscribe();
      
    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
           console.log("Realtime notification:", payload);
           queryClient.invalidateQueries({ queryKey: ["notifications"] });
           // Could also trigger a toast here
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(positionsChannel);
      supabase.removeChannel(accountChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [queryClient, supabase, router]);

  return null;
}

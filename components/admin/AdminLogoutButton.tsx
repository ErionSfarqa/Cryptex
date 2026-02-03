"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export default function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "";
    document.body.style.width = "";
  }, []);

  const logout = async () => {
    setLoading(true);
    await fetch("/api/admin99/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/dashboard";
  };

  return (
    <Button variant="secondary" onClick={logout} disabled={loading}>
      {loading ? "Exiting..." : "Exit admin"}
    </Button>
  );
}

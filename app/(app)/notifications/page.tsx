"use client";

import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { NotificationItem } from "@/lib/types";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function NotificationsPage() {
  const { data, refetch } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ["notifications"],
    queryFn: () => fetcher("/api/notifications"),
  });

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    refetch();
  };

  const notifications = data?.notifications ?? [];

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Notifications" />
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Inbox</h3>
          <Button variant="secondary" onClick={markAll} className="w-full sm:w-auto">
            Mark all read
          </Button>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          {notifications.map((note) => (
            <div
              key={note.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">{note.type}</div>
                <div className="text-sm text-[var(--muted)]">{note.message}</div>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
              {note.read ? (
                <Badge tone="neutral">Read</Badge>
              ) : (
                <Badge tone="success">New</Badge>
              )}
            </div>
          ))}
          {notifications.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No notifications yet.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

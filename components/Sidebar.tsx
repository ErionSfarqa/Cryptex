import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/history", label: "History" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export default function Sidebar({ role, adminOnly }: { role?: string; adminOnly?: boolean }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:gap-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
        <div className="text-lg font-semibold">Cryptex</div>
        <p className="mt-1 text-sm text-[var(--muted)]">Trading workspace</p>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {!adminOnly &&
            navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-xl px-3 py-2 text-[var(--text)] hover:bg-[var(--panel-strong)]"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-xs text-[var(--muted)]">
        Market data updates on a short delay.
      </div>
    </aside>
  );
}

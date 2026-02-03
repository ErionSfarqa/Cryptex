import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/history", label: "History" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export default function MobileNav({ role, adminOnly }: { role?: string; adminOnly?: boolean }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 text-sm lg:hidden">
      {!adminOnly &&
        navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-full px-3 py-2 text-[var(--text)] hover:bg-[var(--panel-strong)]"
          >
            {item.label}
          </Link>
        ))}
    </div>
  );
}

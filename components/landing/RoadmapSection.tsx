"use client";

import { useState } from "react";

const ROADMAP = {
  mvp: {
    title: "MVP scope",
    description:
      "Everything needed for a professional demo trading experience on day one.",
    items: [
      "Auth with email verification + Google",
      "Demo trading with fixed $10,000 simulated balance",
      "Launch assets: BTC, ETH, SOL",
      "Market + limit orders with stop-loss and take-profit",
      "Fractional position sizing",
      "Live charts with 15-minute delayed Binance data",
      "Portfolio view with trade history + performance graph",
      "CSV export (PDF optional later)",
      "In-app + email notifications for critical events",
      "Admin panel: user management + balance resets (1-2 admins)",
      "Mobile-first responsive UI",
    ],
  },
  post: {
    title: "Post-MVP",
    description:
      "Enhancements planned after validation and user feedback cycles.",
    items: [
      "Advanced indicators and strategy templates",
      "Mobile apps for iOS + Android",
      "Real trading integrations (later)",
      "Expanded asset coverage beyond majors",
      "Multi-portfolio analytics and insights",
    ],
  },
};

type RoadmapKey = keyof typeof ROADMAP;

export default function RoadmapSection() {
  const [mode, setMode] = useState<RoadmapKey>("mvp");
  const content = ROADMAP[mode];

  return (
    <section id="roadmap" className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
            Roadmap
          </p>
          <h2 className="font-display text-3xl font-semibold">
            Feature comparison
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Toggle between MVP and post-MVP to see what is included now vs later.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] p-1"
          role="tablist"
          aria-label="Roadmap"
        >
          {([
            { key: "mvp", label: "MVP" },
            { key: "post", label: "Post-MVP" },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={mode === item.key}
              aria-controls="roadmap-panel"
              onClick={() => setMode(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                mode === item.key
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id="roadmap-panel"
        className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm"
        role="tabpanel"
        aria-label="Roadmap panel"
      >
        <h3 className="text-lg font-semibold">{content.title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{content.description}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

const STEPS = [
  {
    title: "Create account",
    eyebrow: "Step 1",
    description: "Verify email or sign in with Google to unlock your demo workspace.",
    bullets: [
      "Email verification",
      "Google sign-in",
      "Secure session",
    ],
    previewTitle: "Account ready",
    previewBody: "Your demo profile is created with a fixed $10,000 balance.",
    previewStats: [
      { label: "Auth", value: "Email + Google" },
      { label: "Region", value: "Instant access" },
      { label: "Balance", value: "$10,000 demo" },
      { label: "Status", value: "Verified" },
    ],
  },
  {
    title: "Explore market",
    eyebrow: "Step 2",
    description:
      "Scan delayed pricing across BTC, ETH, and SOL before you plan a trade.",
    bullets: [
      "15-minute delayed market data",
      "Binance public feed",
      "Launch assets: BTC, ETH, SOL",
    ],
    previewTitle: "Market overview",
    previewBody: "Snapshots update every few minutes for a calm, low-noise view.",
    previewStats: [
      { label: "Feed", value: "Binance" },
      { label: "Delay", value: "15 minutes" },
      { label: "Assets", value: "BTC / ETH / SOL" },
      { label: "Mode", value: "Demo only" },
    ],
  },
  {
    title: "Place demo orders",
    eyebrow: "Step 3",
    description:
      "Test market and limit orders with stop-loss + take-profit controls.",
    bullets: [
      "Market + limit orders",
      "Stop-loss + take-profit",
      "Fractional position sizing",
    ],
    previewTitle: "Order ticket",
    previewBody: "Simulate fills with risk controls before going live later.",
    previewStats: [
      { label: "Order type", value: "Market / Limit" },
      { label: "Protection", value: "SL / TP" },
      { label: "Sizing", value: "Fractional" },
      { label: "Funds", value: "Simulated" },
    ],
  },
  {
    title: "Track portfolio",
    eyebrow: "Step 4",
    description:
      "Monitor PnL, exposure, and a performance graph with trade history and alerts.",
    bullets: [
      "Realized + unrealized PnL",
      "Performance graph + trade history",
      "In-app + email alerts",
    ],
    previewTitle: "Portfolio view",
    previewBody: "Stay on top of positions with live summaries and reporting.",
    previewStats: [
      { label: "History", value: "Trades + fills" },
      { label: "Reports", value: "Performance" },
      { label: "Alerts", value: "In-app + email" },
      { label: "Export", value: "CSV" },
    ],
  },
  {
    title: "Export CSV report",
    eyebrow: "Step 5",
    description:
      "Download CSV trade history anytime, with optional PDF reporting later.",
    bullets: [
      "CSV exports",
      "Optional PDF summaries",
      "Admin-ready reporting",
    ],
    previewTitle: "Reporting",
    previewBody: "Export clean records for review or sharing with your team.",
    previewStats: [
      { label: "Format", value: "CSV" },
      { label: "PDF", value: "Optional" },
      { label: "Audit", value: "Trade history" },
      { label: "Ready", value: "Shareable" },
    ],
  },
];

export default function ProductTourSection() {
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep];

  return (
    <section id="tour" className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
            Interactive tour
          </p>
          <h2 className="font-display text-3xl font-semibold">
            Walk through the demo flow in minutes.
          </h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Tap each step to preview the experience, from signup to reporting.
          </p>
        </div>
        <div className="flex flex-col gap-3" role="tablist" aria-label="Tour">
          {STEPS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === activeStep}
              aria-controls="tour-panel"
              onClick={() => setActiveStep(index)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                index === activeStep
                  ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                  : "border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-strong)]"
              }`}
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                  {item.eyebrow}
                </div>
                <div className="mt-1 font-semibold">{item.title}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {item.description}
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--muted)]">
                {index + 1}/{STEPS.length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        id="tour-panel"
        className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
        role="tabpanel"
        aria-label="Tour preview"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            Step {activeStep + 1} of {STEPS.length}
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            DEMO MODE
          </span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold">
          {step.previewTitle}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {step.previewBody}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {step.previewStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
            >
              <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                {stat.label}
              </div>
              <div className="mt-2 font-semibold">{stat.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
          <div className="font-semibold text-[var(--text)]">In this step</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {step.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
        <Link href="/login" className="mt-6 inline-flex">
          <Button className="px-6">Launch demo dashboard</Button>
        </Link>
      </div>
    </section>
  );
}

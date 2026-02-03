import Link from "next/link";
import Button from "@/components/ui/Button";
import LiveChartsSection from "@/components/landing/LiveChartsSection";
import ProductTourSection from "@/components/landing/ProductTourSection";
import RoadmapSection from "@/components/landing/RoadmapSection";

const features = [
  {
    title: "Order precision",
    body: "Layer market and limit orders with stop-loss and take-profit guardrails.",
  },
  {
    title: "Portfolio insight",
    body: "Track unrealized PnL, exposure, and position sizing in a clean snapshot.",
  },
  {
    title: "Signal-ready workspace",
    body: "Use watchlists, alerts, and trade notes to stay intentional.",
  },
];

const faqItems = [
  {
    question: "Is this real trading?",
    answer:
      "No. Cryptex is demo-only with simulated funds and a fixed $10,000 balance.",
  },
  {
    question: "Can I withdraw money?",
    answer:
      "No. Demo balances are not real money and cannot be withdrawn.",
  },
  {
    question: "Where does market data come from?",
    answer:
      "Pricing is sourced from the Binance public API and shown with a 15-minute delay.",
  },
  {
    question: "What assets are supported at launch?",
    answer: "BTC, ETH, and SOL are supported at launch.",
  },
  {
    question: "Is data delayed?",
    answer:
      "Yes. Market data on the landing page uses a 15-minute delayed feed.",
  },
];

export default function HomePage() {
  return (
    <div className="landing-bg min-h-screen overflow-hidden">
      <main className="relative mx-auto flex max-w-6xl flex-col gap-20 px-6 pb-24 pt-10">
        <div className="flex flex-col gap-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(20,184,166,0.35)]">
              CT
            </span>
            <span className="font-display text-lg font-semibold">Cryptex</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="px-4">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button className="px-5 shadow-[0_16px_40px_rgba(20,184,166,0.25)]">
                Get started
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <span className="chip reveal-up inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]">
              Strategy studio
            </span>
            <h1 className="font-display reveal-up reveal-delay-1 text-4xl font-semibold leading-tight md:text-6xl">
              Trade crypto with calm focus.
              <span className="text-[var(--accent)]"> Clarity wins.</span>
            </h1>
            <p className="reveal-up reveal-delay-2 max-w-xl text-base text-[var(--muted)] md:text-lg">
              Plan entries, tune risk, and track performance across BTC, ETH, and
              SOL in a workspace built for deliberate execution.
            </p>
            <div className="reveal-up reveal-delay-3 flex flex-wrap gap-3">
              <Link href="/login">
                <Button className="px-6 shadow-[0_18px_45px_rgba(20,184,166,0.3)]">
                  Start trading
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="px-6">
                  Explore dashboard
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Risk controls", value: "Stops + targets" },
                { label: "Order flow", value: "Market and limit" },
                { label: "Insights", value: "PnL and exposure" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm shadow-sm"
                >
                  <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                    {item.label}
                  </div>
                  <div className="mt-2 font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="hero-card float-soft rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--muted)]">
                    Portfolio focus
                  </p>
                  <p className="font-display text-3xl font-semibold">$18,420.55</p>
                  <p className="text-xs text-emerald-600">+3.1% this week</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-xs">
                  <div className="text-[var(--muted)]">Risk profile</div>
                  <div className="text-sm font-semibold">Balanced</div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm">
                {[
                  { symbol: "BTC", price: "$42,130.20", change: "+1.8%" },
                  { symbol: "ETH", price: "$2,280.55", change: "+0.9%" },
                  { symbol: "SOL", price: "$96.10", change: "+2.4%" },
                ].map((row) => (
                  <div
                    key={row.symbol}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {row.symbol}
                      </span>
                      <span className="font-semibold">{row.price}</span>
                    </div>
                    <span className="text-xs text-emerald-600">{row.change}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-xs text-[var(--muted)]">
                Signal pulse updated 12s ago. Position sizing is balanced across
                majors.
              </div>
            </div>
            <div className="absolute -bottom-8 -left-6 hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm shadow-lg md:block">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                Active alert
              </div>
              <div className="mt-2 font-semibold">BTC breakout watch</div>
              <div className="text-xs text-[var(--muted)]">Trigger 42,500</div>
            </div>
          </div>
        </section>
        </div>

        <section id="features" className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm text-[var(--muted)]">{feature.body}</p>
            </div>
          ))}
        </section>

        <LiveChartsSection />

        <section
          id="workflow"
          className="grid gap-8 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
              Workflow
            </p>
            <h2 className="font-display text-3xl font-semibold">
              From plan to execution in minutes.
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Build a repeatable trading loop with clean charts, structured order
              tickets, and instant feedback on positions.
            </p>
            <Link href="/login" className="mt-2 w-fit">
              <Button variant="secondary">Create your workspace</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Set the thesis",
                body: "Capture your thesis, levels, and alerts before placing orders.",
              },
              {
                title: "Execute with control",
                body: "Use stops, targets, and limit entries to enforce discipline.",
              },
              {
                title: "Review the outcome",
                body: "Analyze each fill with realized PnL and trade notes.",
              },
              {
                title: "Refine the playbook",
                body: "Iterate on what works using portfolio-level insights.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
              >
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <ProductTourSection />

        <section
          id="insights"
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
            <h2 className="font-display text-3xl font-semibold">
              See the full signal stack.
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Monitor momentum, volatility, and exposure in one place to move with
              conviction.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Momentum", value: "+2.1%", tone: "text-emerald-600" },
                { label: "Volatility", value: "Moderate", tone: "text-amber-600" },
                { label: "Exposure", value: "62% long", tone: "text-emerald-600" },
                { label: "Drawdown", value: "1.4%", tone: "text-rose-600" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
                >
                  <div className="text-xs uppercase tracking-widest text-[var(--muted)]">
                    {item.label}
                  </div>
                  <div className={`mt-2 text-lg font-semibold ${item.tone}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
            <h3 className="text-lg font-semibold">Daily playbook</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Stack your top setups and keep execution tight.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              {[
                { title: "BTC trend continuation", status: "In focus" },
                { title: "ETH range rotation", status: "Monitoring" },
                { title: "SOL momentum pullback", status: "Alert set" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-xs text-[var(--muted)]">{item.status}</span>
                </div>
              ))}
            </div>
            <Link href="/login" className="mt-6 inline-flex">
              <Button>Open your playbook</Button>
            </Link>
          </div>
        </section>

        <RoadmapSection />

        <section
          id="faq"
          className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
              FAQ
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Answers before you start
            </h2>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
                Get started
              </p>
              <h2 className="font-display text-3xl font-semibold">
                Launch the demo trading desk.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
                Practice with a fixed $10,000 simulated balance, market and limit
                orders, and stop-loss/take-profit controls. Everything is
                demo-only with delayed market data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button className="px-6 shadow-[0_18px_45px_rgba(20,184,166,0.3)]">
                  Start demo trading
                </Button>
              </Link>
              <a href="#charts">
                <Button variant="secondary" className="px-6">
                  See live charts
                </Button>
              </a>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-xs text-[var(--muted)]">
            DEMO MODE - Simulated funds only. Not real trading. Market data is
            delayed by 15 minutes.
          </div>
        </section>
      </main>
    </div>
  );
}

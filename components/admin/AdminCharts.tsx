"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type SeriesPoint = { date: string; value: number };

export default function AdminCharts({
  usersPerDay,
  ordersPerDay,
  pnlPerDay,
}: {
  usersPerDay: SeriesPoint[];
  ordersPerDay: SeriesPoint[];
  pnlPerDay: SeriesPoint[];
}) {
  const usersRef = useRef<HTMLCanvasElement | null>(null);
  const ordersRef = useRef<HTMLCanvasElement | null>(null);
  const pnlRef = useRef<HTMLCanvasElement | null>(null);
  const usersChartRef = useRef<Chart | null>(null);
  const ordersChartRef = useRef<Chart | null>(null);
  const pnlChartRef = useRef<Chart | null>(null);

  const hasUsers = usersPerDay.some((d) => Number(d.value ?? 0) !== 0);
  const hasOrders = ordersPerDay.some((d) => Number(d.value ?? 0) !== 0);
  const hasPnl = pnlPerDay.some((d) => Number(d.value ?? 0) !== 0);

  useEffect(() => {
    const build = (
      ref: React.RefObject<HTMLCanvasElement | null>,
      chartRef: React.MutableRefObject<Chart | null>,
      label: string,
      data: SeriesPoint[],
      color: string,
      type: "line" | "bar"
    ) => {
      if (!ref.current) return;
      chartRef.current?.destroy();
      const points = (data ?? []).map((d) => ({
        date: String(d.date ?? ""),
        value: Number(d.value ?? 0),
      }));
      if (points.length === 0 || points.every((p) => Number(p.value) === 0)) {
        chartRef.current = null;
        return;
      }
      chartRef.current = new Chart(ref.current, {
        type,
        data: {
          labels: points.map((d) => d.date),
          datasets: [
            {
              label,
              data: points.map((d) => d.value),
              borderColor: color,
              backgroundColor: color,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          animation: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { display: false },
            y: { display: true },
          },
        },
      });
    };

    build(usersRef, usersChartRef, "Users", usersPerDay, "#64748b", "bar");
    build(ordersRef, ordersChartRef, "Orders", ordersPerDay, "#3b82f6", "bar");
    build(pnlRef, pnlChartRef, "PnL", pnlPerDay, "#22c55e", "line");

    return () => {
      usersChartRef.current?.destroy();
      ordersChartRef.current?.destroy();
      pnlChartRef.current?.destroy();
      usersChartRef.current = null;
      ordersChartRef.current = null;
      pnlChartRef.current = null;
    };
  }, [usersPerDay, ordersPerDay, pnlPerDay]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-[var(--border)] p-4">
        <div className="mb-2 text-sm text-[var(--muted)]">
          New users{hasUsers ? "" : " (No data yet)"}
        </div>
        <div className="h-[220px] sm:h-[260px] lg:h-[300px]">
          <canvas ref={usersRef} className="h-full w-full" />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] p-4">
        <div className="mb-2 text-sm text-[var(--muted)]">
          Orders{hasOrders ? "" : " (No data yet)"}
        </div>
        <div className="h-[220px] sm:h-[260px] lg:h-[300px]">
          <canvas ref={ordersRef} className="h-full w-full" />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] p-4">
        <div className="mb-2 text-sm text-[var(--muted)]">
          Realized PnL{hasPnl ? "" : " (No data yet)"}
        </div>
        <div className="h-[220px] sm:h-[260px] lg:h-[300px]">
          <canvas ref={pnlRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

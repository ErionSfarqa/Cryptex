"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type LineData,
  type Time,
} from "lightweight-charts";
import Button from "@/components/ui/Button";
import OrderForm from "@/components/trade/OrderForm";
// minimal TradingView types to satisfy lint/typecheck
type TradingViewWidgetOptions = {
  autosize: boolean;
  symbol: string;
  interval?: string;
  timezone?: string;
  theme?: "light" | "dark";
  style?: string;
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  hide_top_toolbar?: boolean;
  hidelegend?: boolean;
  container_id: string;
  // accept unknown extras for SDK options not strictly typed here
  [key: string]: unknown;
};
type TradingViewWidget = { remove: () => void };
declare global {
  interface Window {
    TradingView?: {
      widget: new (opts: TradingViewWidgetOptions) => TradingViewWidget;
    };
  }
}

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TradeSignal = {
  time: string;
  price: number;
  side: "buy" | "sell";
};

function toChartCandle(c: Candle): CandlestickData {
  const t = new Date(c.timestamp).getTime();
  return {
    time: Math.floor(t / 1000) as Time,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  };
}

// Indicator calculations
function calculateSMA(candles: Candle[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = 0; i < candles.length; i++) {
    const t = Math.floor(new Date(candles[i].timestamp).getTime() / 1000) as Time;
    if (i < period - 1) {
      // Not enough data
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Number(candles[i - j].close);
    }
    result.push({ time: t, value: sum / period });
  }
  return result;
}

function calculateRSI(candles: Candle[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (candles.length < period + 1) return [];

  let gains = 0;
  let losses = 0;

  // First average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = Number(candles[i].close) - Number(candles[i - 1].close);
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  
  const t = Math.floor(new Date(candles[period].timestamp).getTime() / 1000) as Time;
  result.push({ time: t, value: rsi });

  // Subsequent RSI
  for (let i = period + 1; i < candles.length; i++) {
    const change = Number(candles[i].close) - Number(candles[i - 1].close);
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);

    const t = Math.floor(new Date(candles[i].timestamp).getTime() / 1000) as Time;
    result.push({ time: t, value: rsi });
  }
  return result;
}

const CHART_HEIGHT = 450; // Increased for RSI pane
const BUY_COLOR = "#22c55e";
const SELL_COLOR = "#ef4444";
const FULLSCREEN_Z = 2147483647; // Max 32-bit z-index to stay above third-party embeds (iframes).

export default function PriceChart({
  candles,
  error,
  loading,
  latestCandle,
  signals = [],
  sl,
  tp,
  symbol,
  onStopPreview,
  onStopCommit,
}: {
  candles: Candle[];
  error?: string | null;
  loading?: boolean;
  latestCandle?: Candle | null;
  signals?: TradeSignal[];
  sl?: number | null;
  tp?: number | null;
  symbol: string;
  onStopPreview?: (type: "sl" | "tp", price: number) => void;
  onStopCommit?: (type: "sl" | "tp", price: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayTarget, setOverlayTarget] = useState<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [containerHeight, setContainerHeight] = useState(CHART_HEIGHT);
  
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  type MarkerPoint = {
    time: Time;
    position: "belowBar" | "aboveBar";
    shape: "arrowUp" | "arrowDown";
    color: string;
    text: string;
  };
  type MarkerApi = { setMarkers: (markers: MarkerPoint[]) => void };
  const markersRef = useRef<MarkerApi | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tvContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<TradingViewWidget | null>(null);
  const dragRef = useRef<{ type: "sl" | "tp"; price: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{ type: "sl" | "tp"; price: number; y: number } | null>(null);

  const chartData = useMemo(() => candles.map(toChartCandle), [candles]);
  const smaData = useMemo(() => calculateSMA(candles, 20), [candles]);
  const rsiData = useMemo(() => calculateRSI(candles, 14), [candles]);
  
  const hasCandles = chartData.length > 0;
  const latestPrice = useMemo(() => {
    const last = candles[candles.length - 1];
    return last ? Number(last.close) : 0;
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current || !hasCandles || error || isFullscreen) return;

    const container = containerRef.current;
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.2)";
    const textColor = isDark ? "#93a4b8" : "#5b6b7c";

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: textColor,
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: "transparent",
        scaleMargins: { top: 0.1, bottom: 0.3 }, // Leave space for RSI
        autoScale: true,
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "transparent",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(148,163,184,0.5)",
          width: 1,
          labelBackgroundColor: "var(--panel-strong)",
        },
        horzLine: {
          color: "rgba(148,163,184,0.5)",
          width: 1,
          labelBackgroundColor: "var(--panel-strong)",
        },
      },
      handleScroll: { vertTouchDrag: false },
    });

    // 1. Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });
    candlestickSeries.setData(chartData);

    // 2. SMA 20 Series
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6", // Blue
      lineWidth: 2,
      priceScaleId: "right", // Overlay on main chart
    });
    smaSeries.setData(smaData);

    // 3. RSI 14 Series (Separate Pane)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6", // Purple
      lineWidth: 2,
      priceScaleId: "rsi",
    });

    // Configure the "rsi" price scale after creating the series
    chart.priceScale("rsi").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }, // Bottom 20%
      autoScale: true,
      entireTextOnly: true,
    });
    
    rsiSeries.setData(rsiData);
    
    // Add RSI levels (70/30) - Lines on RSI series
    rsiSeries.createPriceLine({ price: 70, color: "rgba(148,163,184,0.5)", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });
    rsiSeries.createPriceLine({ price: 30, color: "rgba(148,163,184,0.5)", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });

    chart.timeScale().fitContent();

    const markersApi = createSeriesMarkers(candlestickSeries, []);
    markersRef.current = markersApi;

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    smaSeriesRef.current = smaSeries;
    rsiSeriesRef.current = rsiSeries;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setContainerHeight(h || CHART_HEIGHT);
        chartRef.current.applyOptions({ width: w, height: h });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      markersRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      smaSeriesRef.current = null;
      rsiSeriesRef.current = null;
      slLineRef.current = null;
      tpLineRef.current = null;
    };
  }, [hasCandles, error, isFullscreen]); // Skip lightweight chart when fullscreen TradingView is active

  // Update data logic
  useEffect(() => {
    if (seriesRef.current && chartData.length > 0) {
      const range = chartRef.current?.timeScale().getVisibleRange();
      seriesRef.current.setData(chartData);
      smaSeriesRef.current?.setData(smaData);
      rsiSeriesRef.current?.setData(rsiData);
      if (range) {
        chartRef.current?.timeScale().setVisibleRange(range);
      }
    }
  }, [chartData, smaData, rsiData]);

  // Update latest candle logic
  const lastCandleRef = useRef<number | null>(null);
  useEffect(() => {
    if (!latestCandle || !seriesRef.current) return;
    const c = toChartCandle(latestCandle);
    try {
      seriesRef.current.update(c);
      // We should also update SMA/RSI incrementally if we want real-time accuracy,
      // but re-calculating whole array for one tick is heavy.
      // For demo, we skip incremental SMA/RSI update or just let it update on next full refresh.
      // Or we can try to append one point.
      // Ideally we re-calc the last point.
    } catch (e) {
      // ignore
    }
  }, [latestCandle]);

  // Markers
  const chartMarkers = useMemo(() => {
    if (!signals.length) return [];
    return signals.map((s) => ({
      time: Math.floor(new Date(s.time).getTime() / 1000) as Time,
      position: (s.side === "buy" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
      shape: (s.side === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
      color: s.side === "buy" ? BUY_COLOR : SELL_COLOR,
      text: s.side === "buy" ? "BUY" : "SELL",
    }));
  }, [signals]);

  useEffect(() => {
    if (markersRef.current) markersRef.current.setMarkers(chartMarkers);
  }, [chartMarkers]);

  // SL/TP Lines
  useEffect(() => {
    if (!seriesRef.current || isFullscreen) return;

    if (slLineRef.current) {
      seriesRef.current.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      seriesRef.current.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }

    if (sl) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: sl,
        color: SELL_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (tp) {
      tpLineRef.current = seriesRef.current.createPriceLine({
        price: tp,
        color: BUY_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });
    }
  }, [sl, tp]);

  // Drag SL/TP lines
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !seriesRef.current || isFullscreen) return;

    const getPriceFromY = (y: number) => {
      const price = seriesRef.current?.coordinateToPrice(y);
      if (price == null || !Number.isFinite(price)) return null;
      return Number(price);
    };

    const updateLine = (type: "sl" | "tp", price: number) => {
      if (type === "sl" && slLineRef.current) {
        slLineRef.current.applyOptions({ price });
      }
      if (type === "tp" && tpLineRef.current) {
        tpLineRef.current.applyOptions({ price });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!seriesRef.current) return;
      if (sl == null && tp == null) return;
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const slY = sl != null ? seriesRef.current.priceToCoordinate(sl) : null;
      const tpY = tp != null ? seriesRef.current.priceToCoordinate(tp) : null;
      const threshold = 8;
      let target: "sl" | "tp" | null = null;
      if (slY != null && Math.abs(y - slY) <= threshold) target = "sl";
      if (tpY != null && Math.abs(y - tpY) <= threshold) {
        if (!target) target = "tp";
        else if (slY != null && Math.abs(y - tpY) < Math.abs(y - slY)) target = "tp";
      }
      if (!target) return;
      const price = getPriceFromY(y);
      if (price == null) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      dragRef.current = { type: target, price, y };
      setDragState({ type: target, price, y });
      updateLine(target, price);
      onStopPreview?.(target, price);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const price = getPriceFromY(y);
      if (price == null) return;
      dragRef.current = { ...dragRef.current, price, y };
      setDragState({ ...dragRef.current });
      updateLine(dragRef.current.type, price);
      onStopPreview?.(dragRef.current.type, price);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const current = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      onStopCommit?.(current.type, current.price);
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [sl, tp, isFullscreen, onStopPreview, onStopCommit]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    // Manage body scroll in pseudo-fullscreen mode
    if (isFullscreen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      // Create overlay root if missing
      if (!overlayTarget) {
        const root = document.createElement("div");
        root.id = "tv-fullscreen-overlay-root";
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.width = "100vw";
        root.style.height = "100vh";
        root.style.zIndex = String(FULLSCREEN_Z);
        root.style.pointerEvents = "auto";
        root.style.isolation = "isolate";
        // Helps ensure the overlay (and its UI) stays in a top composited layer on mobile browsers.
        root.style.transform = "translateZ(0)";
        // Avoid any chance of "click-through" in certain browsers with fully transparent overlays.
        root.style.background = "rgba(0,0,0,0.001)";
        document.body.appendChild(root);
        setTimeout(() => setOverlayTarget(root), 0);
      }
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      // Cleanup TradingView widget
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.remove();
        } catch {}
        tvWidgetRef.current = null;
      }
      if (tvContainerRef.current) {
        tvContainerRef.current.innerHTML = "";
      }
      if (overlayTarget) {
        try {
          document.body.removeChild(overlayTarget);
        } catch {}
        setTimeout(() => setOverlayTarget(null), 0);
      }
    }
  }, [isFullscreen, overlayTarget]);

  function loadTvJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.TradingView) {
        resolve();
        return;
      }
      const scriptId = "tradingview-tvjs";
      if (document.getElementById(scriptId)) {
        // already loading
        const check = () => {
          if (window.TradingView) resolve();
          else setTimeout(check, 100);
        };
        check();
        return;
      }
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load TradingView tv.js"));
      document.body.appendChild(s);
    });
  }

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!isFullscreen) return;
      if (typeof window === "undefined") return;
      await loadTvJs();
      const waitForContainer = () =>
        new Promise<void>((resolve) => {
          const tryInit = () => {
            const el = tvContainerRef.current;
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
              resolve();
            } else {
              requestAnimationFrame(tryInit);
            }
          };
          tryInit();
        });
      await waitForContainer();
      if (cancelled) return;
      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.remove();
        } catch {}
        tvWidgetRef.current = null;
      }
      tvWidgetRef.current = new window.TradingView!.widget({
        autosize: true,
        symbol: `BINANCE:${symbol}`,
        interval: "15",
        timezone: "Etc/UTC",
        theme: isDark ? "dark" : "light",
        style: "1",
        locale: "en",
        toolbar_bg: isDark ? "rgba(23,23,23,1)" : "rgba(255,255,255,1)",
        enable_publishing: false,
        hide_top_toolbar: false,
        hidelegend: false,
        hide_side_toolbar: false,
        container_id: "tv-advanced-chart",
      });

      // Some third-party widgets inject their own fixed layers into <body>. Re-append our overlay
      // root to keep it last in DOM order so our UI stays on top when z-index ties happen.
      if (overlayTarget && overlayTarget.parentNode === document.body) {
        document.body.appendChild(overlayTarget);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isFullscreen, symbol, overlayTarget]);

  if (error) {
    return (
      <div className="flex h-[280px] sm:h-[360px] lg:h-[450px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] text-sm text-[var(--muted)]">
        {error}
      </div>
    );
  }

  if (loading || !hasCandles) {
    return (
      <div className="flex h-[280px] sm:h-[360px] lg:h-[450px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] text-sm text-[var(--muted)]">
        {loading ? "Loading candles..." : "No candle data"}
      </div>
    );
  }

  const dragClampHeight = containerHeight || CHART_HEIGHT;
  const baseChart = (
    <div
      ref={containerRef}
      className="relative w-full h-[280px] sm:h-[360px] lg:h-[450px] rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]"
    >
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={toggleFullscreen}
        >
          Fullscreen
        </Button>
      </div>
      {dragState ? (
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: Math.max(6, Math.min(dragClampHeight - 24, dragState.y - 10)),
            zIndex: 10,
          }}
        >
          <Button type="button" variant="secondary" className="px-2 py-1 text-xs" disabled>
            {dragState.type.toUpperCase()} {dragState.price.toFixed(2)}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const fullscreenOverlay =
    isFullscreen && overlayTarget
      ? createPortal(
          <div
            className="flex flex-col"
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              zIndex: FULLSCREEN_Z,
              background: "transparent",
            }}
          >
            {/* TradingView chart */}
            <div className="relative flex-1 min-h-0">
              <div
                id="tv-advanced-chart"
                ref={(el) => {
                  tvContainerRef.current = el;
                }}
                className="absolute inset-0"
                style={{ height: "100%", width: "100%" }}
              />

              {/* Desktop/tablet: float close button + ticket over the chart. */}
              <div className="hidden sm:block absolute right-2 top-2 z-20">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={toggleFullscreen}
                  aria-label="Close fullscreen"
                  title="Close"
                >
                  <span className="inline-flex items-center">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </span>
                </Button>
              </div>
              <div
                className="hidden sm:block absolute bottom-3 left-3 z-20 w-[min(80vw,280px)] sm:max-w-[300px] lg:max-w-[320px] max-h-[60vh] overflow-y-auto"
                aria-label="Order form panel"
              >
                <OrderForm symbol={symbol} latestPrice={latestPrice} compact />
              </div>
            </div>

            {/* Mobile: keep controls OUTSIDE the TradingView iframe area so taps always register. */}
            <div className="sm:hidden max-h-[55vh] overflow-y-auto p-2">
              <div className="mb-2 flex items-center justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={toggleFullscreen}
                  aria-label="Close fullscreen"
                  title="Close"
                >
                  <span className="inline-flex items-center">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </span>
                </Button>
              </div>
              <OrderForm symbol={symbol} latestPrice={latestPrice} />
            </div>
          </div>,
          overlayTarget
        )
      : null;

  return (
    <>
      {baseChart}
      {fullscreenOverlay}
    </>
  );
}

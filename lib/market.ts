const DEFAULT_PRIMARY_BASE_URL = "https://api.binance.com";
const DEFAULT_FALLBACK_BASE_URL = "https://api.binance.us";
const DEFAULT_TIMEOUT_MS = 7000;
const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

export function toMarketSymbol(value: string): string {
  const upper = value.trim().toUpperCase();
  return upper.endsWith("USDT") ? upper : `${upper}USDT`;
}

type MarketFetchOptions = {
  cacheSeconds?: number;
  timeoutMs?: number;
};

type MarketFetchResult<T> = {
  data: T | null;
  sourceBaseUrl: string | null;
};

function normalizeBaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
}

function resolveMarketBaseUrls(): string[] {
  const primaryEnv = normalizeBaseUrl(process.env.MARKET_DATA_BASE_URL);
  const fallbackEnv = normalizeBaseUrl(process.env.MARKET_DATA_FALLBACK_BASE_URL);
  const primary = primaryEnv ?? DEFAULT_PRIMARY_BASE_URL;
  const fallback = fallbackEnv ?? DEFAULT_FALLBACK_BASE_URL;
  const urls = [primary, fallback].filter(Boolean);
  return Array.from(new Set(urls));
}

function resolveTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.max(1000, Math.floor(override));
  }
  const raw = process.env.MARKET_DATA_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) {
    return Math.max(1000, Math.floor(parsed));
  }
  return DEFAULT_TIMEOUT_MS;
}

function buildFetchInit(
  signal: AbortSignal,
  cacheSeconds?: number
): RequestInit & { next?: { revalidate: number } } {
  const init: RequestInit & { next?: { revalidate: number } } = {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "Cryptex/1.0",
    },
  };
  if (typeof cacheSeconds === "number" && Number.isFinite(cacheSeconds)) {
    init.next = { revalidate: Math.max(1, Math.floor(cacheSeconds)) };
    init.cache = "force-cache";
  } else {
    init.cache = "no-store";
  }
  return init;
}

export function buildMarketResponseHeaders(
  cacheControl: string,
  sourceBaseUrl: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": cacheControl,
  };
  if (sourceBaseUrl) {
    try {
      headers["x-market-data-source"] = new URL(sourceBaseUrl).host;
    } catch {
      // Ignore invalid source URL
    }
  }
  return headers;
}

export async function fetchMarketJson<T>(
  path: string,
  params: Record<string, string>,
  options: MarketFetchOptions = {}
): Promise<MarketFetchResult<T>> {
  const baseUrls = resolveMarketBaseUrls();
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  let lastBaseUrl: string | null = null;

  for (const baseUrl of baseUrls) {
    lastBaseUrl = baseUrl;
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        url.toString(),
        buildFetchInit(controller.signal, options.cacheSeconds)
      );

      if (!response.ok) {
        console.warn("Market data fetch failed", {
          baseUrl,
          status: response.status,
          statusText: response.statusText,
        });
        continue;
      }

      const data = (await response.json()) as T;
      return { data, sourceBaseUrl: baseUrl };
    } catch (error) {
      console.warn("Market data fetch error", {
        baseUrl,
        error: (error as Error).message ?? String(error),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { data: null, sourceBaseUrl: lastBaseUrl };
}

export async function fetchLatestPriceWithSource(
  symbol: string,
  options: MarketFetchOptions = {}
): Promise<{ price: number | null; sourceBaseUrl: string | null }> {
  const marketSymbol = toMarketSymbol(symbol);
  if (!ALLOWED_SYMBOLS.has(marketSymbol)) {
    return { price: null, sourceBaseUrl: null };
  }

  const result = await fetchMarketJson<{ price: string }>(
    "/api/v3/ticker/price",
    { symbol: marketSymbol },
    options
  );

  if (!result.data) {
    return { price: null, sourceBaseUrl: result.sourceBaseUrl };
  }

  const price = Number(result.data.price);
  return {
    price: Number.isFinite(price) ? price : null,
    sourceBaseUrl: result.sourceBaseUrl,
  };
}

export async function fetchLatestPrice(symbol: string): Promise<number | null> {
  const result = await fetchLatestPriceWithSource(symbol);
  return result.price;
}

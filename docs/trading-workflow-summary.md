# Cryptex Trading Workflow — Implementation Summary

## 1. Files changed (exact paths)

- `lib/supabase/ensure.ts` — Do not overwrite `demo_balance` when account_settings row already exists
- `app/api/portfolio/route.ts` — Filter to open positions only (qty !== 0); document balance default
- `app/api/trade/order/route.ts` — Call ensureProfileAndSettings; default balance 10000 when reading; fix limitPrice type
- `app/api/trade/close/route.ts` — Call ensureProfileAndSettings; position select fallback for qty/quantity; upsert fallback for quantity column; default balance 10000
- `app/api/trades/route.ts` — Optional `?symbol=` query param for chart signals
- `components/PriceChart.tsx` — Add `signals` prop and buy/sell markers via createSeriesMarkers; ColorType.Solid for layout
- `app/(app)/trade/page.tsx` — Fetch trades by symbol; pass chartSignals to PriceChart; fix invalidateQueries shape; fix setInterval for match polling
- `app/(app)/portfolio/page.tsx` — Fix invalidateQueries shape for React Query

## 2. Tables used as source of truth (with columns)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **account_settings** | Balance (single source of truth) | `user_id` (PK), `demo_balance`, `first_run_complete`, `dark_mode`, `email_alerts`, `in_app_alerts`, `last_reset_at` |
| **demo_positions** | Open positions (one row per user_id + symbol) | `user_id`, `symbol`, `qty` (or `quantity`), `avg_price`, `unrealized_pnl`, `updated_at` |
| **demo_orders** | Order/trade history | `user_id`, `symbol`, `side`, `order_type`/`type`, `quantity`/`qty`, `price`, `status`, `realized_pnl`, `created_at` |
| **profiles** | User profile + role | `id`, `email`, `role` |

- **Balance** = `account_settings.demo_balance` (default 10,000 if row missing).
- **Open positions** = rows in `demo_positions` with non-zero `qty` (or `quantity`).
- **Equity** = balance + sum(market value of open positions); market value = qty × latest price; unrealized PnL = qty × (latest price − avg_price).

## 3. Trade lifecycle (step-by-step)

1. **Place order** — Client POST `/api/trade/order` with symbol, side, quantity, type, optional limitPrice.
2. **Ensure settings** — `ensureProfileAndSettings` runs; if no `account_settings` row, insert with `demo_balance: 10000`.
3. **Resolve fill price** — Market: fetch latest from Binance; Limit: use limitPrice.
4. **Load existing position** — Select from `demo_positions` by user_id + symbol (qty or quantity per schema).
5. **Compute realized PnL** — If closing part of opposite side (e.g. long + sell), realized = closingQty × (fillPrice − avg) or (avg − fillPrice) for short.
6. **Insert order** — Insert into `demo_orders` (canonical or fallback column names).
7. **Update position** — newQty = prevQty + signedQty; newAvgPrice from cost basis if existing position; upsert `demo_positions` (qty or quantity).
8. **Update balance** — Read `demo_balance` (default 10000); balanceChange = buy ? −notional : +notional; upsert `account_settings.demo_balance`.
9. **Response** — Return ok, orderId, symbol, side, qty, price, status.
10. **Client** — Invalidates `portfolio` and `trades` queries so UI updates.

**Close position (portfolio “Close” or explicit close):**

1. POST `/api/trade/close` with symbol, quantity.
2. Ensure settings; load position (qty/quantity fallback); compute closeQty, side, realized.
3. Insert close order into `demo_orders`.
4. Upsert position with newQty (may be 0); balance update (proceeds/cost).
5. Client invalidates portfolio and trades.

## 4. Balance & equity

- **Starting demo balance** = 10,000 USD (set when `account_settings` row is first created; never overwritten on later ensure).
- **Balance** = cash = `account_settings.demo_balance`.  
  - BUY: balance −= quantity × price.  
  - SELL: balance += quantity × price.  
  Same for close: sell adds proceeds; buy closes subtract cost.
- **Equity** = balance + Σ (position qty × latest price) over open positions.  
  Computed in `GET /api/portfolio`: balance from DB; positions filtered to qty ≠ 0; each position has latest price from market API; equity = balance + sum(marketValue).  
  Dashboard, portfolio, and trade page all use `/api/portfolio` (or settings) so balance/equity stay consistent.

## 5. How portfolio derives open positions

- **Source** = `demo_positions` for the user, then filter to **open only**: `qty !== 0` (or `quantity !== 0`).
- One row per (user_id, symbol); columns: id, symbol, qty (or quantity), avg_price, unrealized_pnl, updated_at.
- Enrichment: for each open row, fetch latest price from `/api/market/latest?symbol=...`; compute marketValue = qty × latestPrice; unrealizedPnl = qty × (latestPrice − avg_price).
- Closed positions (qty = 0 after sell/close) are excluded so they never show as open.

## 6. Buy/sell signals on the chart

- **Data** — Trade page fetches `GET /api/trades?symbol={marketSymbol}` and maps each trade to `TradeSignal`: `{ time: filledAt/createdAt, price: fillPrice, side: 'buy'|'sell' }`.
- **Component** — `PriceChart` accepts optional `signals?: TradeSignal[]`.  
  Converts to lightweight-charts markers: time (Unix s), position (buy → belowBar, sell → aboveBar), shape (arrowUp / arrowDown), color (green #22c55e / red #ef4444), text "BUY" / "SELL".
- **Rendering** — `createSeriesMarkers(candlestickSeries, [])` attached to the candlestick series; `setMarkers(chartMarkers)` called when `signals` change so markers persist on refresh and use the same palette as the chart.

## 7. Manual test checklist

- [ ] **Buy trade** — Place market buy on Trade page; confirm order succeeds.
- [ ] **Position appears** — Open Portfolio; confirm the symbol appears in Open positions with correct qty and avg entry.
- [ ] **Balance/equity** — Dashboard and Portfolio show same balance; equity = balance + position value; after buy, balance decreased by cost.
- [ ] **Price moves → equity changes** — Refresh or wait for price update; equity and unrealized PnL update (same logic on portfolio API).
- [ ] **Sell trade** — Place market sell (partial or full); position qty decreases; balance increases by proceeds.
- [ ] **Position closes** — Sell entire position (or use Close on Portfolio); position disappears from Open positions; row in demo_positions can remain with qty 0 (filtered out).
- [ ] **Balance updates everywhere** — After sell/close, Dashboard and Portfolio show updated balance and equity.
- [ ] **Chart signals** — After a buy/sell, Trade page chart shows BUY/SELL marker at execution price; switch symbol and back or refresh; markers still show for that symbol’s trades.

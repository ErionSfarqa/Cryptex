# Cryptex Trading Accuracy — Implementation Summary

## 1. Files changed (exact paths)

- `app/api/trade/order/route.ts` — Use only `quantity` and `order_type`; position select/upsert with `quantity`; single order insert (no qty/type fallback); avg_price formula; balance update
- `app/api/trade/close/route.ts` — Use only `quantity` for position select/upsert; order_type in close order
- `app/api/portfolio/route.ts` — Use only `quantity`; filter open positions (quantity !== 0); unrealized PnL and equity formulas documented in code
- `app/api/trades/route.ts` — Read only `order_type` and `quantity` from demo_orders
- `app/(app)/dashboard/page.tsx` — refetchInterval 8000ms for portfolio and trades (paused when tab hidden)
- `app/(app)/portfolio/page.tsx` — refetchInterval 8000ms for portfolio; visibility-based pause
- `app/(app)/trade/page.tsx` — refetchInterval 8000ms for trades-by-symbol (paused when tab hidden)

## 2. Where price polling / refresh is implemented

- **Dashboard:** `useQuery` for `["portfolio"]`, `["trades", "open"]`, `["trades", "closed"]` with `refetchInterval: tabHidden ? false : 8000`. No full page reload; only data refetch. Chart not on this page.
- **Portfolio:** `useQuery` for `["portfolio"]` with `refetchInterval: tabHidden ? false : 8000`. Positions and balance/equity refresh every 8s when tab is visible.
- **Trade:** `useQuery` for `["trades", marketSymbol]` with `refetchInterval: tabHidden ? false : 8000`; existing `["latest", marketSymbol]` already has refetchInterval 4000. Price and trades refresh without full page reload; chart zoom/scroll preserved (React Query refetch does not remount the chart).

All use `refetchIntervalInBackground: false` so polling pauses when the tab is hidden, avoiding unnecessary requests and keeping schema cache stable.

## 3. Exact PnL formulas used

- **BUY**
  - Entry price = execution (fill) price at time of order.
  - Position quantity: `new_quantity = prev_quantity + quantity` (long) or `prev_quantity - quantity` when closing short.
  - Average entry: `avg_price = (old_qty * old_avg + new_qty * buy_price) / total_qty` when adding to position; when closing part of opposite side, remaining position keeps same avg until full close.
  - Balance: `new_balance = current_balance - (buy_price * quantity)`.

- **SELL**
  - Quantity: position quantity decreases by `sold_quantity`.
  - Realized PnL (long): `realized_pnl = (sell_price - avg_entry_price) * sold_quantity`.
  - Realized PnL (short close): `realized_pnl = (avg_entry_price - buy_price) * closed_quantity`.
  - Balance: `new_balance = current_balance + (sell_price * quantity)`.
  - If quantity reaches 0 after update, position is closed (row may remain with quantity 0; portfolio filters to quantity !== 0).

- **Unrealized PnL (per open position)**  
  `unrealized_pnl = (current_market_price - avg_entry_price) * quantity`  
  Computed in `GET /api/portfolio` from latest price and stored `quantity`/`avg_price`.

- **Equity**  
  `equity = balance + sum(market_value of all open positions)`  
  where `market_value = quantity * current_market_price` per position.  
  Same formula used for portfolio response; Dashboard and Portfolio both read from `/api/portfolio`, so equity is identical everywhere.

## 4. How balance & equity stay in sync across pages

- **Single source of truth**
  - Balance: `account_settings.demo_balance` (read/updated in order and close routes; default 10000 when row missing).
  - Open positions: `demo_positions` with `quantity !== 0`; portfolio API filters and enriches with latest price.
  - Equity: Computed in `GET /api/portfolio` as `balance + sum(positions[].marketValue)`.

- **Sync mechanism**
  - All balance/equity/positions data is loaded via the same `["portfolio"]` query (Dashboard and Portfolio) or after invalidating that query (Trade page after order/close).
  - Polling: Dashboard and Portfolio refetch `["portfolio"]` every 8s when tab visible; Trade invalidates `["portfolio"]` and `["trades"]` on place order / close. No duplicate formulas; no client-side balance/equity math.

## 5. Confirmation

- **Multiple orders:** Orders are appended to `demo_orders` (insert only). Positions are upserted per (user_id, symbol) with `quantity` and `avg_price` recalculated from previous position + new fill. Multiple buys increase quantity and blend avg; partial sells decrease quantity and keep avg until close.
- **Portfolio updates live:** Portfolio and Dashboard refetch `["portfolio"]` every 8s; after place order or close, all pages invalidate `["portfolio"]` so the next read is fresh. Positions list shows only open (quantity !== 0) with correct quantity, avg entry, current price, unrealized PnL.
- **Profit/loss accuracy:** Realized PnL uses `(sell_price - avg_entry_price) * sold_quantity` (long) or `(avg_entry - buy_price) * closed_quantity` (short). Unrealized uses `(current_price - avg_entry) * quantity`. Balance updates by exact notional (buy: -price*quantity, sell: +price*quantity). All logic is server-side in order/close and portfolio APIs.

## 6. Manual test checklist

- [ ] **Buy** — Place market buy on Trade; confirm order fills; balance decreases by (price × quantity); position appears on Portfolio with correct quantity and avg entry.
- [ ] **Price moves** — Wait or refresh; confirm current price and unrealized PnL update on Portfolio/Dashboard (within 8s or on next refetch).
- [ ] **PnL updates** — Confirm unrealized PnL = (current price − avg entry) × quantity; equity = balance + sum(market value of positions) on Dashboard and Portfolio.
- [ ] **Sell partial** — Sell part of position; quantity decreases; balance increases by (sell price × sold quantity); realized PnL stored on order; position still open with same avg entry.
- [ ] **Sell full** — Sell entire position (or use Close on Portfolio); position disappears from open list; balance increased by proceeds; no duplicate open position.
- [ ] **Balance & equity correct everywhere** — After any trade, check Dashboard and Portfolio; balance and equity match and update within 8s or immediately after navigation/invalidation.

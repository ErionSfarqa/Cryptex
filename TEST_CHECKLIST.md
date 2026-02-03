# Manual Test Checklist

Use this checklist to verify the functionality of the Cryptex Demo Trading Platform enhancements.

## 1. Auto-Refresh & Realtime Data
- [ ] Open the application in two separate browser windows/tabs.
- [ ] Place a trade in Window A.
- [ ] Verify that the Portfolio (Positions) and Orders list update in Window B without a page reload (within ~10-30s or immediately if Realtime is active).
- [ ] Verify that the Price Chart updates automatically as new candles arrive (every 10s-15m depending on interval).

## 2. Stop Loss (SL) & Take Profit (TP)
- [ ] **Place Order with SL/TP:**
    - [ ] Select a symbol (e.g., BTCUSDT).
    - [ ] Enter a quantity (e.g., 0.1).
    - [ ] Set SL below current price (for Buy) or above (for Sell).
    - [ ] Set TP above current price (for Buy) or below (for Sell).
    - [ ] Submit order.
    - [ ] Verify order is filled.
    - [ ] Verify Position in table shows the SL/TP values (if column exists or in details).
    - [ ] Verify Chart shows dashed horizontal lines at SL and TP levels.
- [ ] **Chart Overlay Update:**
    - [ ] Switch to a different symbol (e.g., ETHUSDT). Verify SL/TP lines disappear.
    - [ ] Switch back to BTCUSDT. Verify SL/TP lines reappear.
- [ ] **Trigger Execution:**
    - [ ] (Requires market movement or simulated price) Wait for price to cross SL or TP.
    - [ ] Verify position is closed automatically (within ~10-20s).
    - [ ] Verify "Position Closed" notification appears.

## 3. Position Logic & Trading Engine
- [ ] **Multiple Buys:**
    - [ ] Buy 0.1 BTC at Price A.
    - [ ] Buy 0.1 BTC at Price B.
    - [ ] Verify Position size is 0.2 BTC.
    - [ ] Verify Avg Entry Price is weighted average.
- [ ] **Partial Sell:**
    - [ ] Sell 0.1 BTC (from above 0.2 position).
    - [ ] Verify Position size is 0.1 BTC.
    - [ ] Verify Realized P&L is updated in `demo_orders` (visible in history or database).
    - [ ] Verify Demo Balance updates correctly (Balance + Profit/Loss).
- [ ] **Equity Calculation:**
    - [ ] Verify "Equity" displayed matches `Balance + Unrealized P&L` (approx).
    - [ ] Verify Unrealized P&L matches `(Current Price - Avg Entry) * Qty`.

## 4. Chart History & Indicators
- [ ] **History:**
    - [ ] Scroll back on the chart.
    - [ ] Verify at least 1 year of data is accessible (for daily/4h intervals).
    - [ ] Verify no "unsupported interval" errors for 15m, 1h, 4h, 1d.
- [ ] **Indicators:**
    - [ ] Verify SMA 20 (Blue line) appears on the price chart.
    - [ ] Verify RSI 14 (Purple line) appears in a separate pane below the price.
    - [ ] Verify RSI has 70/30 dotted level lines.

## 5. Admin & Role Management
- [ ] **Access Control:**
    - [ ] Try to access `/admin` as a regular user. Verify redirect or 404/403.
    - [ ] (Database) Set your user role to `admin` in `account_settings`.
    - [ ] Access `/admin`. Verify dashboard loads.
- [ ] **Admin Actions:**
    - [ ] View list of users.
    - [ ] View system stats.
    - [ ] Reset a user's balance (if implemented in UI) or verify the `reset-balance` endpoint works.

## 6. Daily Balance Reset
- [ ] **Reset Request:**
    - [ ] Go to User Settings or Help (if button exists) or trigger `/api/user/reset-balance`.
    - [ ] If eligible (>24h since last reset), verify balance resets to $10,000.
    - [ ] If ineligible, verify error message "Wait X hours".

## 7. Notifications
- [ ] **Receive Notification:**
    - [ ] Trigger a trade fill.
    - [ ] Check the Bell icon in Top Nav.
    - [ ] Verify unread count increases.
    - [ ] Open menu, see "Order filled" notification.
- [ ] **Mark Read:**
    - [ ] Click "Mark all as read".
    - [ ] Verify unread count clears.

## 8. General & Help
- [ ] **Delayed Label:**
    - [ ] Verify "15m delayed" label appears on the Trading page (Top bar).
- [ ] **Help Page:**
    - [ ] Navigate to `/help`.
    - [ ] Verify content explains Demo Trading, SL/TP, and P&L calculations.

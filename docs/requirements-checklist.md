# Requirements checklist

Legend: [x] Implemented, [~] Partial, [ ] Missing

## Auth & onboarding
- [x] Email/password signup + login (Supabase Auth)
- [~] Email verification flow (requires Supabase email settings + redirect URL configured)
- [~] Google OAuth login (UI + callback implemented; provider config required)
- [x] Forgot/reset password flow
- [x] Walkthrough modal with skip/finish persistence

## Trading features
- [~] Trading UI (order ticket, market/limit controls) present
- [ ] Order execution backend (`/api/trade/order` returns 410)
- [ ] Stop-loss / take-profit enforcement backend
- [ ] Fractional trading backend validation

## Market data
- [~] Asset list (BTC/ETH/SOL) static
- [~] Delayed pricing label in UI
- [ ] Live price endpoints used by UI (`/api/prices/*` return 410)
- [~] Binance proxy endpoints exist (`/api/market/*`) but not wired to UI

## Demo account settings
- [~] Demo balance storage (`account_settings` + `/api/portfolio`)
- [~] Reset once/day logic (`/api/demo/reset`) — requires DB tables + RLS

## Portfolio/reporting
- [~] Portfolio UI (positions table) present, positions data empty
- [~] Trade history UI + CSV export (API returns empty trades)
- [ ] Real P&L calculations/backfill

## Admin panel
- [~] Admin UI layout present
- [ ] Admin APIs (`/api/admin/*`) return 410 / not implemented
- [ ] Admin user management + balance reset actions backend

## Notifications
- [~] Notifications UI present
- [ ] Notification storage + delivery (API returns empty)
- [ ] Email alerts (no backend wiring)

## Design / theming
- [~] Light theme implemented
- [~] Dark mode toggle exists (global load from saved setting is partial)

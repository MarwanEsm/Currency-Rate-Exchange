# Currency Exchange Rate App

This project is a Next.js web application for:

- Viewing real-time currency exchange rates.
- Converting amounts between currencies.
- Managing user authentication with Firebase.

## Features

- Currency conversion using live exchange rate data.
- Pair-based rate display for selected currencies.
- Email/password authentication and password reset flows.
- Responsive UI with CSS modules.

---

## Currency conversion (feature overview)

The conversion experience lives on the **currencies** screen (`/currencies`). It uses:

- **Coinbase public HTTP APIs** (no API key in the app; browser HTTPS only):
  - **`/v2/currencies`** — populates the **from** / **to** dropdowns (`CurrencySelect`).
  - **`/v2/exchange-rates`** — numeric rate map for the selected **base** (“from”) currency (`exchangeRateProvider` default `baseUrl`).
- **`src/services/exchangeRateProvider.js`** — default timeout **10s**, optional retries via `createExchangeRateClient`; normalizes responses; maps failures to typed codes (`network_error`, `http_error`, `parse_error`, `invalid_payload_error`); success includes provider **`fetchedAt`** (ISO 8601).
- **`src/utils/useExchangeRates.js`** — loads rates for the base currency; exposes `numericRate`, loading, `fetchedAt`, **`ageMs` / `isStale`** (UI staleness, default **60s** after `fetchedAt`, independent of cache TTL), and `retryRates`. While mounted, it schedules a **background refetch when the in-memory cache TTL elapses** so data can refresh without leaving the screen.
- **`src/utils/exchangeRatesCache.js`** — in-memory cache keyed by base. Successful fetches are reused for **`EXCHANGE_RATES_CACHE_TTL_MS` (5 minutes)** until expiry, **base change**, or **Retry / Refresh rate** invalidation for that base.
- **`src/utils/convertCurrencyAmount.js`** — sanitizes input (non-digits stripped, **max 15 digits**), parses whole-number strings, converts with **half-up rounding to two decimals** for the result.

The main UI is **`src/screens/currenciesList/CurrenciesList.jsx`**: accessible `CurrencySelect` controls, rate panel (loading / empty / error / pair line), **Convert** plus a **Refresh rate** control (timestamp, optional **Stale rate** badge) in the same button row, and provider **Retry** when the fetch fails.

---

## Setup and environment requirements

- **Node.js** and **npm** (versions aligned with Next.js 16 / React 18 in this repo).
- **Install:** from the repository root, run `npm install`.
- **Environment variables:** copy **`.env.example`** to **`.env.local`** and set all **`NEXT_PUBLIC_FIREBASE_*`** values for Firebase Authentication and related client SDK usage.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics (if used) |

**Exchange rates:** no extra env vars are required; the app calls Coinbase’s public endpoint over HTTPS.

**Run locally:** `npm run dev`, then open `http://localhost:3000` (currencies: `http://localhost:3000/currencies`).

---

## User flow (conversion screen)

1. Open **`/currencies`**.
2. Choose a **from** (base) currency and a **to** currency (lists come from **`/v2/currencies`**). The same currency cannot be both sides; the UI resets or warns as needed.
3. The app fetches or **reuses a cached** rate map for the **from** currency (**`/v2/exchange-rates`**) and shows **1 {FROM} = {rate} {TO}** when a numeric rate exists. The panel shows **loading**, **empty**, **unavailable**, or **error** states with clear copy and affordances (**Try again** when there is no rate but no hard provider error).
4. Next to **Convert**, **Refresh rate** shows **“Rates updated …”** when timestamps are available, may show a **Stale rate** badge after the configured age, and triggers the same cache-bypass refetch as retry. **Enter** in the amount field runs **Convert** when it is enabled.
5. Enter a **whole-number amount** (digits only; decimals/minus are ignored with user-visible notice). **Convert** applies the rate (two-decimal result) or validation when the amount or rate is unusable.
6. On provider failure, an alert explains the issue and **Retry** invalidates the cached base and refetches.

---

## Known limitations

- **Amount input:** only **non-negative whole numbers** (digits). Decimals and minus signs are not accepted as typed; they are stripped with feedback. **`MAX_AMOUNT_DIGITS` (15)** caps length for safe `Number` use.
- **Converted output:** **two decimal places** (half-up). Non-finite products are not shown as a numeric result.
- **Rates:** depend on **Coinbase**, network, and browser CORS/public API behavior. Values are **indicative**, not for trading or settlement.
- **Caching vs UI “stale”:** cache **TTL is 5 minutes** (`EXCHANGE_RATES_CACHE_TTL_MS`) — entries are not read after expiry, and the hook can **auto-refetch** when that window ends while you stay on the page. **`isStale` / badge** use a shorter default (**~60s** after `fetchedAt`) so the UI can warn that quotes may be aging even while a cached payload is still valid for network reuse.
- **Scope:** one rate map per **base**; changing **to** only picks a different key from the same map (no extra network call until TTL, refresh, or base change).
- **Auth:** Firebase env must be set for auth elsewhere; rate fetches do not use Firebase keys.

## Tests (conversion & rates)

- **`npm test`** — includes `useExchangeRates`, `exchangeRatesCache`, `exchangeRateProvider` / client, **`rateFetchAndConversion.test.js`** (hook + conversion wiring), and **`CurrenciesList` / `CurrencySelect`** UI tests. Prefer mocks and deterministic timers for rate/cache cases to avoid flaky CI.

---

## Tech Stack

- Next.js and React.
- Firebase Authentication.
- Coinbase exchange-rate API.
- SCSS modules and Reactstrap.
- ESLint for code quality checks.

## Getting Started

1. Clone the repository and enter the project directory (remote URL may differ from your fork).
2. Install dependencies: `npm install`
3. Create env file:
   - Copy `.env.example` to `.env.local`
   - Fill in Firebase values (see table above)
4. Start development server: `npm run dev`
5. Open `http://localhost:3000` (conversion UI: `/currencies`)

## Development Standards

- Use `@/` path alias for imports from `src`.
- Keep component files in PascalCase and named exports/constants in UPPER_SNAKE_CASE where appropriate.
- Prefer `async/await` over mixed `.then/.catch` flow for readability.
- Use explicit, descriptive error codes for UI state mapping.
- Keep user-facing failure handling deterministic (not log-only).

## Validation Commands

- Lint: `npm run lint`
- Tests: `npm test`
- Fiat-to-crypto domain E2E-style tests: `npm run test:e2e` (FCX-18 compliance graph + **FCX-47** full fulfillment path on in-memory persistence)
- Build: `npm run build`

## Project Structure

- `pages/`: route entry points.
- `src/screens/`: page-level screen containers.
- `src/components/`: reusable UI building blocks.
- `src/firebase/`: Firebase config and auth context.
- `src/utils/`: shared hooks, conversion helpers, exchange-rate cache, and responsive helpers.
- `src/services/exchangeRateProvider.js`: reusable provider client for exchange-rate requests, normalization, and typed error handling.
- `src/domain/`: fiat-to-crypto order lifecycle, compliance gates, secure transfer validation (FCX-21), user progress/notifications (FCX-20), FCX-18 E2E-style tests, and FCX-47 fulfillment E2E (`fiatToCryptoFulfillment.e2e.test.js`).
- `src/domain/fiatToCryptoOrder.js`: canonical **statuses** (`submitted` → `paid` → `purchasing` → `transferring` → `completed` / `failed`), **transition + owner** matrix, **`FiatToCryptoOrder` data shape** (user, fiat, asset, wallet, fees, audit, transfer, execution, deposit fields), and **`validateFiatToCryptoOrderDraft`** — code-backed source of truth for ops (FCX-38).
- `pages/orders/progress.jsx` + `GET /api/fiat-to-crypto/orders/[id]`: **purchase status** — timeline, notification event log, failure guidance, delivery summary; live mode with `?id=` + `x-user-id` (FCX-46).
- `pages/orders/new.jsx` + `POST /api/fiat-to-crypto/orders`: fiat-to-crypto **intake** (fiat amount, asset, network, destination) with client + server validation, confirmation with request reference (FCX-25, FCX-40).
- `pages/admin/orders.jsx` + `GET /api/fiat-to-crypto/admin/queue` (incl. `status=transferring`) + `GET …/decisions/log` + `POST …/decision` + `POST …/transfer`: admin queue with approve/reject, audit trail, and custody payout actions (FCX-43, FCX-26, FCX-45).
- `src/domain/fiatToCryptoPricing.js` + `POST /api/fiat-to-crypto/admin/orders/[id]/pricing`: commission & net-crypto calculation engine (FCX-42) with configurable fixed/percentage/hybrid commission, per-asset precision, persist gross/fee/net on approve, and ops pricing preview (FCX-22).
- `src/domain/fiatToCryptoExecution.js` + `POST /api/fiat-to-crypto/admin/orders/[id]/execute-purchase` + `GET /api/fiat-to-crypto/admin/execution/log` + `GET /api/fiat-to-crypto/admin/execution/providers`: liquidity-provider purchase with retry, execution audit API, provider list, and `purchasing → transferring | failed` order patch (FCX-24, FCX-44).
- `pages/admin/deposits.jsx` + `src/domain/fiatToCryptoDeposit.js` + `POST /api/fiat-to-crypto/admin/deposits/reconcile` + `GET /api/fiat-to-crypto/admin/deposits/log` + `GET /api/fiat-to-crypto/admin/queue?status=submitted`: ops **deposit verification & reconciliation** — match bank deposits to `submitted` orders, verify amount/currency (tolerance bps), record timestamped events, surface under/over/mismatch workflows; only `matched` moves `submitted → paid` and records compliance screening for settlement (FCX-23, FCX-41).
- `docs/fiat-to-crypto-ops-runbook.md`: operations runbook and go-live checklist (FCX-18, incl. FCX-26 admin queue, FCX-22 pricing, FCX-24 execution, FCX-23 deposit reconciliation).
- `functions/`: Firebase Cloud Functions workspace.

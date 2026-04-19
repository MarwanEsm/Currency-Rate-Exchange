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

- **Coinbase public HTTP API** (`https://api.coinbase.com/v2/exchange-rates`) as the single source of live rates. No exchange-rate API key is stored in the app; requests are made from the client like any other HTTPS call.
- **`src/services/exchangeRateProvider.js`** — fetches and normalizes responses, maps failures to typed error codes (`network_error`, `http_error`, `parse_error`, `invalid_payload_error`), and surfaces a server-side **`fetchedAt`** timestamp (ISO 8601) on success.
- **`src/utils/useExchangeRates.js`** — loads rates for the selected **base** (“from”) currency, exposes loading state, last-fetch time, and errors; coordinates with the cache below.
- **`src/utils/exchangeRatesCache.js`** — in-memory cache keyed by base currency. Successful fetches are reused for **`EXCHANGE_RATES_CACHE_TTL_MS` (5 minutes)** unless the entry expires, the user changes base, or **Retry** invalidates that base’s cache entry.
- **`src/utils/convertCurrencyAmount.js`** — sanitizes the amount input, parses whole-number digit strings, and converts with **half-up rounding to two decimal places** for the displayed result.

The main UI is implemented in **`src/screens/currenciesList/CurrenciesList.jsx`** with accessible currency selectors (`CurrencySelect`).

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
2. Choose a **from** (base) currency and a **to** currency from the lists (the same currency cannot be selected on both sides; the UI prevents invalid pairs and shows guidance when needed).
3. The app fetches (or reuses a cached) rate map for the **from** currency and shows **1 {FROM} = {rate} {TO}** when a numeric rate exists, with **“Rates updated …”** / last fetch context when available.
4. Enter a **whole-number amount** (digits only). **Convert** applies the current rate and shows the converted value, or messaging when the amount or rate is not usable.
5. If the provider fails, an error message is shown with **Retry**, which clears the in-memory cache for the current base and triggers a fresh fetch.

---

## Known limitations

- **Amount input:** only **non-negative whole numbers** (digits). No decimals in the amount field. Input is capped at **`MAX_AMOUNT_DIGITS` (15)** to avoid unsafe `Number` precision on very long strings.
- **Converted output:** rounded to **two decimal places** (half-up). Extremely large products that are not finite numbers are not shown as a numeric result.
- **Rates:** data depends on **Coinbase** availability, response shape, and the user’s network. Rates are **indicative** for the app’s UI, not a trading or settlement guarantee.
- **Caching:** successful responses are **reused for up to five minutes** per base currency; stale data beyond TTL is not served from cache. Changing **from** or using **Retry** can force a new request sooner.
- **Scope:** rates are fetched **per base currency**; changing **to** reuses the same rate map until the base or cache policy changes.
- **Auth:** Firebase env vars must be valid for authentication flows elsewhere in the app; the conversion screen’s rate calls do not use Firebase, but misconfigured Firebase can still break overall local setup.

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
- Fiat-to-crypto domain E2E-style tests: `npm run test:e2e`
- Build: `npm run build`

## Project Structure

- `pages/`: route entry points.
- `src/screens/`: page-level screen containers.
- `src/components/`: reusable UI building blocks.
- `src/firebase/`: Firebase config and auth context.
- `src/utils/`: shared hooks, conversion helpers, exchange-rate cache, and responsive helpers.
- `src/services/exchangeRateProvider.js`: reusable provider client for exchange-rate requests, normalization, and typed error handling.
- `src/domain/`: fiat-to-crypto order lifecycle, compliance gates, and FCX-18 E2E-style tests.
- `docs/fiat-to-crypto-ops-runbook.md`: operations runbook and go-live checklist (FCX-18).
- `functions/`: Firebase Cloud Functions workspace.

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

## Tech Stack

- Next.js and React.
- Firebase Authentication.
- Coinbase exchange-rate API.
- SCSS modules and Reactstrap.
- ESLint for code quality checks.

## Getting Started

1. Clone the repository:
   - `git clone https://github.com/MarwanEsm/currency-exchange-rate-app.git`
   - `cd currency-exchange-rate-app`
2. Install dependencies: `npm install`
3. Create env file:
   - Copy `.env.example` to `.env.local`
   - Fill in Firebase values
4. Start development server: `npm run dev`
5. Open `http://localhost:3000`

## Development Standards

- Use `@/` path alias for imports from `src`.
- Keep component files in PascalCase and named exports/constants in UPPER_SNAKE_CASE where appropriate.
- Prefer `async/await` over mixed `.then/.catch` flow for readability.
- Use explicit, descriptive error codes for UI state mapping.
- Keep user-facing failure handling deterministic (not log-only).

## Validation Commands

- Lint: `npm run lint`
- Build: `npm run build`

## Project Structure

- `pages/`: route entry points.
- `src/screens/`: page-level screen containers.
- `src/components/`: reusable UI building blocks.
- `src/firebase/`: Firebase config and auth context.
- `src/utils/`: shared hooks and responsive helpers.
- `src/services/exchangeRateProvider.js`: reusable provider client for exchange-rate requests, normalization, and typed error handling.
- `functions/`: Firebase Cloud Functions workspace.

/**
 * In-memory exchange rates cache (FCX-13, FCX-35).
 *
 * Contract:
 * - Entries are keyed by **base currency code** (the `from` ISO code passed to `getExchangeRates`).
 * - Each entry stores the **normalized** provider payload:
 *   `{ base: string, fetchedAt: string (ISO 8601), rates: Record<string, string> }`
 *   plus a local `storedAtMs` used only for TTL (not shown to users).
 *
 * Refresh interval (FCX-35):
 * - `EXCHANGE_RATES_CACHE_TTL_MS` is the **canonical reuse window**: a successful response may be served
 *   from memory without a new network call until this interval elapses (measured from `storedAtMs`).
 * - `useExchangeRates` schedules a **background refetch** when this interval expires while the hook is
 *   mounted, so data stays responsive without spamming the API on every render.
 *
 * Invalidation / safe reuse:
 * - **TTL expiry:** `readExchangeRatesCache` returns `null` and deletes the entry; the hook’s timer calls
 *   `retryRates` so the next read refetches.
 * - **Manual:** `invalidateExchangeRatesCache(base)` removes one base (user **Retry** / **Refresh rate**).
 * - **Global clear:** `clearExchangeRatesCache()` removes all entries (tests or rare app events).
 * - Writes happen **only** after a successful network fetch (`writeExchangeRatesCache`), never on errors.
 */

const store = new Map();

/** How long (ms) a successful fetch may be reused without a new network request (FCX-35 refresh interval). */
export const EXCHANGE_RATES_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @param {string} baseCurrencyCode
 * @param {number} [ttlMs]
 * @returns {{ base: string, fetchedAt: string, rates: Record<string, string> } | null}
 */
export const readExchangeRatesCache = (baseCurrencyCode, ttlMs = EXCHANGE_RATES_CACHE_TTL_MS) => {
    if (!baseCurrencyCode) return null;
    const row = store.get(baseCurrencyCode);
    if (!row) return null;
    if (Date.now() - row.storedAtMs > ttlMs) {
        store.delete(baseCurrencyCode);
        return null;
    }
    return row.payload;
};

/**
 * Milliseconds until the cache entry for `baseCurrencyCode` hits TTL expiry.
 * Used by `useExchangeRates` to schedule a single background refetch (FCX-35).
 *
 * @param {string} baseCurrencyCode
 * @param {number} [ttlMs]
 * @returns {number | null} Positive ms until expiry, or `null` if missing / already expired (entry removed).
 */
export const getMsUntilExchangeRatesCacheExpiry = (
    baseCurrencyCode,
    ttlMs = EXCHANGE_RATES_CACHE_TTL_MS,
) => {
    if (!baseCurrencyCode) return null;
    const row = store.get(baseCurrencyCode);
    if (!row) return null;
    const expiresAtMs = row.storedAtMs + ttlMs;
    const remaining = expiresAtMs - Date.now();
    if (remaining <= 0) {
        store.delete(baseCurrencyCode);
        return null;
    }
    return remaining;
};

/**
 * @param {string} baseCurrencyCode
 * @param {{ base: string, fetchedAt: string, rates: Record<string, string> }} payload
 */
export const writeExchangeRatesCache = (baseCurrencyCode, payload) => {
    if (!baseCurrencyCode || !payload?.rates || typeof payload.rates !== "object") return;
    store.set(baseCurrencyCode, {
        payload: {
            base: payload.base,
            fetchedAt: payload.fetchedAt,
            rates: payload.rates,
        },
        storedAtMs: Date.now(),
    });
};

/**
 * @param {string} [baseCurrencyCode]  If omitted, clears the entire cache.
 */
export const invalidateExchangeRatesCache = (baseCurrencyCode) => {
    if (!baseCurrencyCode) {
        store.clear();
        return;
    }
    store.delete(baseCurrencyCode);
};

/** Clears all cached entries (intended for tests). */
export const clearExchangeRatesCache = () => {
    store.clear();
};

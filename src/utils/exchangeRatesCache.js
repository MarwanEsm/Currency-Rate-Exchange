/**
 * In-memory exchange rates cache (FCX-13).
 *
 * Contract:
 * - Entries are keyed by **base currency code** (the `from` ISO code passed to `getExchangeRates`).
 * - Each entry stores the **normalized** provider payload:
 *   `{ base: string, fetchedAt: string (ISO 8601), rates: Record<string, string> }`
 *   plus a local `storedAtMs` used only for TTL (not shown to users).
 *
 * Refresh interval (TTL):
 * - `EXCHANGE_RATES_CACHE_TTL_MS` — entries older than this are discarded on read and must be refetched.
 *
 * Invalidation / safe reuse:
 * - **TTL expiry:** `readExchangeRatesCache` returns `null` and deletes the entry.
 * - **Manual:** `invalidateExchangeRatesCache(base)` removes one base (e.g. user **Retry**).
 * - **Global clear:** `clearExchangeRatesCache()` removes all entries (tests or rare app events).
 * - Writes happen **only** after a successful network fetch (`writeExchangeRatesCache`), never on errors.
 */

const store = new Map();

/** How long (ms) a successful fetch may be reused without a new network request. */
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

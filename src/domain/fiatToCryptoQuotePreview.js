/**
 * Public indicative fiat → crypto quotes (no account). Uses the same commission engine as orders
 * once a provider spot rate (crypto per 1 fiat) is supplied.
 */

import { computeFiatToCryptoQuote, DEFAULT_COMMISSION_CONFIG } from "./fiatToCryptoPricing";
import { ASSET_ALLOWED_TRANSFER_NETWORKS } from "./fiatToCryptoTransfer";

/** Fiat currencies supported for quote preview (aligned with intake UI). */
export const FIAT_TO_CRYPTO_QUOTE_PREVIEW_FIATS = Object.freeze(["USD", "EUR"]);

/**
 * @param {unknown} fiatCurrency
 * @param {unknown} fiatAmount
 * @param {unknown} targetAssetCode
 * @returns {string[]}
 */
export const validateFiatToCryptoQuotePreviewInput = (fiatCurrency, fiatAmount, targetAssetCode) => {
    /** @type {string[]} */
    const errors = [];

    const fc =
        typeof fiatCurrency === "string" ? fiatCurrency.trim().toUpperCase() : String(fiatCurrency ?? "").trim();
    if (!fc) {
        errors.push("`fiatCurrency` is required.");
    } else if (!FIAT_TO_CRYPTO_QUOTE_PREVIEW_FIATS.includes(fc)) {
        errors.push(`fiatCurrency must be one of: ${FIAT_TO_CRYPTO_QUOTE_PREVIEW_FIATS.join(", ")}.`);
    }

    const fa = typeof fiatAmount === "string" ? fiatAmount.trim() : String(fiatAmount ?? "").trim();
    if (!fa) {
        errors.push("`fiatAmount` is required.");
    } else if (!/^\d+(\.\d+)?$/.test(fa) || Number(fa) <= 0) {
        errors.push("`fiatAmount` must be a positive decimal string.");
    }

    const tac =
        typeof targetAssetCode === "string"
            ? targetAssetCode.trim().toUpperCase()
            : String(targetAssetCode ?? "").trim();
    if (!tac) {
        errors.push("`targetAssetCode` is required.");
    } else if (!Object.prototype.hasOwnProperty.call(ASSET_ALLOWED_TRANSFER_NETWORKS, tac)) {
        errors.push("targetAssetCode must be a supported fiat→crypto payout asset.");
    }

    return errors;
};

/**
 * @param {Record<string, string | number>} rates
 * @param {string} targetAssetCodeUpper
 * @returns {string | null}
 */
export const pickProviderRateForAsset = (rates, targetAssetCodeUpper) => {
    if (!rates || typeof rates !== "object") return null;
    const u = String(targetAssetCodeUpper).toUpperCase();
    const direct = rates[u] ?? rates[targetAssetCodeUpper];
    if (direct !== undefined && direct !== null) return String(direct);
    const key = Object.keys(rates).find((k) => k.toUpperCase() === u);
    if (key === undefined) return null;
    return String(rates[key]);
};

/**
 * @param {{
 *   fiatCurrency: string,
 *   fiatAmount: string,
 *   targetAssetCode: string,
 *   providerRateString: string,
 *   computedAt?: string,
 * }} input
 */
export const buildIndicativeFiatToCryptoQuote = (input) => {
    const quote = computeFiatToCryptoQuote({
        fiatAmount: input.fiatAmount,
        fiatCurrency: input.fiatCurrency,
        targetAssetCode: input.targetAssetCode,
        exchangeRate: input.providerRateString,
        commissionConfig: DEFAULT_COMMISSION_CONFIG,
        computedAt: input.computedAt,
    });
    return quote;
};

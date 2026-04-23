/**
 * Fiat-to-crypto intake validation and submitted-order construction (FCX-25).
 *
 * Used by the POST API and can be reused on the client for immediate feedback.
 * KYC is taken from the payload until a real profile service backs the API.
 */

import { evaluateKycGateForOrderCreation } from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import { validateFiatToCryptoOrderDraft } from "./fiatToCryptoOrder";
import {
    buildOrderPricingPatch,
    computeFiatToCryptoQuote,
    DEFAULT_COMMISSION_CONFIG,
    validateCommissionConfig,
} from "./fiatToCryptoPricing";
import { validateCryptoTransferDestination } from "./fiatToCryptoTransfer";

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
export const normalizeFiatToCryptoIntakeBody = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const o = /** @type {Record<string, unknown>} */ (raw);
    return {
        userId: typeof o.userId === "string" ? o.userId.trim() : "",
        fiatCurrency: typeof o.fiatCurrency === "string" ? o.fiatCurrency.trim().toUpperCase() : "",
        fiatAmount: typeof o.fiatAmount === "number" ? String(o.fiatAmount) : String(o.fiatAmount ?? "").trim(),
        targetAssetCode: typeof o.targetAssetCode === "string" ? o.targetAssetCode.trim().toUpperCase() : "",
        walletAddress: typeof o.walletAddress === "string" ? o.walletAddress.trim() : "",
        network: o.network === undefined || o.network === null || o.network === "" ? undefined : String(o.network).trim(),
        kycVerificationStatus:
            typeof o.kycVerificationStatus === "string" ? o.kycVerificationStatus.trim().toLowerCase() : "",
        exchangeRate:
            o.exchangeRate === undefined || o.exchangeRate === null || o.exchangeRate === ""
                ? undefined
                : typeof o.exchangeRate === "number"
                    ? String(o.exchangeRate)
                    : String(o.exchangeRate).trim(),
        commissionConfig:
            o.commissionConfig && typeof o.commissionConfig === "object" ? o.commissionConfig : undefined,
    };
};

/**
 * @typedef {{
 *   userId: string,
 *   fiatCurrency: string,
 *   fiatAmount: string,
 *   targetAssetCode: string,
 *   walletAddress: string,
 *   kycVerificationStatus: string,
 *   network?: string,
 *   exchangeRate?: string,
 *   commissionConfig?: import("./fiatToCryptoPricing.js").CommissionConfig,
 * }} NormalizedFiatToCryptoIntake
 */

/**
 * @param {unknown} rawBody
 * @returns {{ ok: true, normalized: NormalizedFiatToCryptoIntake } | { ok: false, errors: string[] }}
 */
export const validateFiatToCryptoIntakePayload = (rawBody) => {
    const normalized = normalizeFiatToCryptoIntakeBody(rawBody);
    if (!normalized) {
        return { ok: false, errors: ["Request body must be a JSON object."] };
    }

    /** @type {string[]} */
    const errors = [];

    const draftErrors = validateFiatToCryptoOrderDraft({
        userId: normalized.userId,
        fiatCurrency: normalized.fiatCurrency,
        fiatAmount: normalized.fiatAmount,
        targetAssetCode: normalized.targetAssetCode,
        walletAddress: normalized.walletAddress,
        network: normalized.network,
    });
    errors.push(...draftErrors);

    if (errors.length > 0) {
        return { ok: false, errors };
    }

    const payout = validateCryptoTransferDestination({
        targetAssetCode: normalized.targetAssetCode,
        network: normalized.network,
        walletAddress: normalized.walletAddress,
    });

    if (!payout.ok) {
        for (const row of payout.errors) {
            errors.push(row.message);
        }
        return { ok: false, errors };
    }

    const kyc = evaluateKycGateForOrderCreation({
        kycVerificationStatus: normalized.kycVerificationStatus,
    });

    if (!kyc.allowed) {
        errors.push(
            ...kyc.reasonCodes.map((code) => `Compliance: ${code.replace(/_/g, " ")}.`),
        );
        return { ok: false, errors };
    }

    if (normalized.commissionConfig !== undefined) {
        const configErrors = validateCommissionConfig(normalized.commissionConfig);
        if (configErrors.length > 0) {
            return { ok: false, errors: configErrors };
        }
    }

    if (normalized.exchangeRate !== undefined) {
        if (!/^\d+(\.\d+)?$/.test(normalized.exchangeRate) || Number(normalized.exchangeRate) <= 0) {
            return {
                ok: false,
                errors: ["`exchangeRate`, when provided, must be a positive decimal string."],
            };
        }
    }

    /** @type {NormalizedFiatToCryptoIntake} */
    const out = {
        userId: normalized.userId,
        fiatCurrency: normalized.fiatCurrency,
        fiatAmount: normalized.fiatAmount,
        targetAssetCode: normalized.targetAssetCode,
        walletAddress: normalized.walletAddress,
        kycVerificationStatus: normalized.kycVerificationStatus,
        network: payout.canonicalNetwork,
        ...(normalized.exchangeRate ? { exchangeRate: normalized.exchangeRate } : {}),
        ...(normalized.commissionConfig ? { commissionConfig: normalized.commissionConfig } : {}),
    };

    return { ok: true, normalized: out };
};

/**
 * Builds a submitted order and, when an `exchangeRate` is supplied, attaches the full pricing
 * snapshot (gross/fee/net fiat + net crypto, commission config, warnings).
 *
 * @param {NormalizedFiatToCryptoIntake} normalized
 * @param {string} id
 * @param {{ computedAt?: string }} [options]
 * @returns {import("./fiatToCryptoOrder.js").FiatToCryptoOrder}
 */
export const buildSubmittedFiatToCryptoOrder = (normalized, id, options = {}) => {
    const now = options.computedAt ?? new Date().toISOString();
    const base = {
        id,
        userId: normalized.userId,
        fiatCurrency: normalized.fiatCurrency,
        fiatAmount: normalized.fiatAmount,
        targetAssetCode: normalized.targetAssetCode,
        walletAddress: normalized.walletAddress,
        network: normalized.network,
        status: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
    };

    if (!normalized.exchangeRate) {
        return base;
    }

    const quote = computeFiatToCryptoQuote({
        fiatAmount: normalized.fiatAmount,
        fiatCurrency: normalized.fiatCurrency,
        targetAssetCode: normalized.targetAssetCode,
        exchangeRate: normalized.exchangeRate,
        commissionConfig: normalized.commissionConfig ?? DEFAULT_COMMISSION_CONFIG,
        computedAt: now,
    });

    return { ...base, ...buildOrderPricingPatch(quote) };
};

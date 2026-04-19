/**
 * Fiat-to-crypto intake validation and submitted-order construction (FCX-25).
 *
 * Used by the POST API and can be reused on the client for immediate feedback.
 * KYC is taken from the payload until a real profile service backs the API.
 */

import { evaluateKycGateForOrderCreation } from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import { validateFiatToCryptoOrderDraft } from "./fiatToCryptoOrder";
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
    };
};

/**
 * @param {unknown} rawBody
 * @returns {{ ok: true, normalized: Record<string, string> & { network?: string } } | { ok: false, errors: string[] }}
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

    /** @type {Record<string, string> & { network?: string }} */
    const out = {
        userId: normalized.userId,
        fiatCurrency: normalized.fiatCurrency,
        fiatAmount: normalized.fiatAmount,
        targetAssetCode: normalized.targetAssetCode,
        walletAddress: normalized.walletAddress,
        kycVerificationStatus: normalized.kycVerificationStatus,
        network: payout.canonicalNetwork,
    };

    return { ok: true, normalized: out };
};

/**
 * @param {Record<string, string> & { network?: string }} normalized
 * @param {string} id
 * @returns {import("./fiatToCryptoOrder.js").FiatToCryptoOrder}
 */
export const buildSubmittedFiatToCryptoOrder = (normalized, id) => {
    const now = new Date().toISOString();
    return {
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
};

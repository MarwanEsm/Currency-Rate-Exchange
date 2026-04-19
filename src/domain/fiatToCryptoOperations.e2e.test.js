/**
 * FCX-18 — End-to-end style tests for fiat-to-crypto **domain** flows (order + compliance).
 * Browser/network E2E is not in scope here; the runbook describes live operational checks.
 */

import {
    COMPLIANCE_BLOCK_REASON_CODES,
    COMPLIANCE_CHECK_STATUS,
    evaluateFiatToCryptoOrderTransitionWithCompliance,
    evaluateKycGateForOrderCreation,
    getComplianceAuditLogSnapshot,
    KYC_VERIFICATION_STATUS,
    resetComplianceAuditLogForTests,
} from "./fiatToCryptoCompliance";
import {
    FIAT_TO_CRYPTO_ORDER_STATUS,
    isFiatToCryptoOrderTransitionAllowed,
    validateFiatToCryptoOrderDraft,
} from "./fiatToCryptoOrder";

const validOrderDraft = () => ({
    userId: "user-e2e-1",
    fiatCurrency: "USD",
    fiatAmount: "250.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
});

const clearedCompliance = () => ({
    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
    amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
});

describe("fiatToCrypto operations E2E (FCX-18)", () => {
    beforeEach(() => {
        resetComplianceAuditLogForTests();
    });

    describe("happy path", () => {
        it("validates draft, passes KYC at creation, and allows paid → purchasing with AML/sanctions cleared", () => {
            const draft = validOrderDraft();
            expect(validateFiatToCryptoOrderDraft(draft)).toEqual([]);

            const kyc = evaluateKycGateForOrderCreation(
                { kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED },
                { orderId: "ord-happy", userId: draft.userId, correlationId: "corr-happy" },
            );
            expect(kyc.allowed).toBe(true);

            expect(isFiatToCryptoOrderTransitionAllowed(FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED, FIAT_TO_CRYPTO_ORDER_STATUS.PAID)).toBe(
                true,
            );

            const purchasingGate = evaluateFiatToCryptoOrderTransitionWithCompliance(
                FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
                FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
                clearedCompliance(),
                { orderId: "ord-happy", userId: draft.userId },
            );
            expect(purchasingGate.allowed).toBe(true);
            expect(purchasingGate.audit?.decision).toBe("allowed");

            expect(isFiatToCryptoOrderTransitionAllowed(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING, FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING)).toBe(
                true,
            );
            expect(isFiatToCryptoOrderTransitionAllowed(FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING, FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED)).toBe(
                true,
            );

            const audits = getComplianceAuditLogSnapshot();
            expect(audits.some((a) => a.gate === "enter_purchasing" && a.decision === "allowed")).toBe(true);
        });
    });

    describe("failure paths", () => {
        it("blocks order creation when KYC is not verified", () => {
            const draft = validOrderDraft();
            expect(validateFiatToCryptoOrderDraft(draft)).toEqual([]);

            const kyc = evaluateKycGateForOrderCreation({
                kycVerificationStatus: KYC_VERIFICATION_STATUS.PENDING,
            });
            expect(kyc.allowed).toBe(false);
            expect(kyc.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED);
        });

        it("blocks paid → purchasing when AML is blocked", () => {
            const r = evaluateFiatToCryptoOrderTransitionWithCompliance(
                FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
                FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
                {
                    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
                    amlCheckStatus: COMPLIANCE_CHECK_STATUS.BLOCKED,
                    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
                },
                { orderId: "ord-aml-fail" },
            );
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.AML_BLOCKED);
            expect(r.audit?.decision).toBe("blocked");
        });
    });

    describe("critical edge cases", () => {
        it("invalid wallet: draft validation rejects short or malformed payout address", () => {
            const draft = { ...validOrderDraft(), walletAddress: "short" };
            const errors = validateFiatToCryptoOrderDraft(draft);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e) => /walletAddress/i.test(e))).toBe(true);
        });

        it("unmatched deposit: lifecycle allows submitted → failed so ops can close a stuck quote without treasury match", () => {
            // Treasury must NOT move to paid until deposit matches; that match is operational.
            // When reconciliation fails, ops uses the graph to fail the order — see runbook.
            expect(isFiatToCryptoOrderTransitionAllowed(FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED, FIAT_TO_CRYPTO_ORDER_STATUS.FAILED)).toBe(
                true,
            );
        });

        it("failed transfer: custody can move transferring → failed for manual reconciliation", () => {
            expect(isFiatToCryptoOrderTransitionAllowed(FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING, FIAT_TO_CRYPTO_ORDER_STATUS.FAILED)).toBe(
                true,
            );
        });
    });
});

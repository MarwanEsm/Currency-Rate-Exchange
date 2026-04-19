import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import {
    COMPLIANCE_BLOCK_REASON_CODES,
    COMPLIANCE_CHECK_STATUS,
    evaluateAmlSanctionsGateForPurchasing,
    evaluateFiatToCryptoOrderTransitionWithCompliance,
    evaluateKycGateForOrderCreation,
    getComplianceAuditLogSnapshot,
    KYC_VERIFICATION_STATUS,
    resetComplianceAuditLogForTests,
} from "./fiatToCryptoCompliance";

describe("fiatToCryptoCompliance (FCX-19)", () => {
    beforeEach(() => {
        resetComplianceAuditLogForTests();
    });

    describe("evaluateKycGateForOrderCreation", () => {
        it("allows only verified KYC", () => {
            const r = evaluateKycGateForOrderCreation({
                kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
            });
            expect(r.allowed).toBe(true);
            expect(r.reasonCodes).toEqual([]);
            expect(r.audit.gate).toBe("order_creation");
            expect(r.audit.decision).toBe("allowed");
        });

        it("blocks pending and unverified states with kyc_not_verified", () => {
            const r = evaluateKycGateForOrderCreation({
                kycVerificationStatus: KYC_VERIFICATION_STATUS.PENDING,
            });
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED);
        });

        it("blocks rejected and expired with specific codes", () => {
            expect(
                evaluateKycGateForOrderCreation({
                    kycVerificationStatus: KYC_VERIFICATION_STATUS.REJECTED,
                }).reasonCodes,
            ).toContain(COMPLIANCE_BLOCK_REASON_CODES.KYC_REJECTED);

            expect(
                evaluateKycGateForOrderCreation({
                    kycVerificationStatus: KYC_VERIFICATION_STATUS.EXPIRED,
                }).reasonCodes,
            ).toContain(COMPLIANCE_BLOCK_REASON_CODES.KYC_EXPIRED);
        });

        it("logs each evaluation to the audit buffer", () => {
            evaluateKycGateForOrderCreation({ kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED });
            evaluateKycGateForOrderCreation({ kycVerificationStatus: KYC_VERIFICATION_STATUS.REJECTED });
            const snap = getComplianceAuditLogSnapshot();
            expect(snap).toHaveLength(2);
            expect(snap[0].decision).toBe("allowed");
            expect(snap[1].decision).toBe("blocked");
        });
    });

    describe("evaluateAmlSanctionsGateForPurchasing", () => {
        const base = () => ({
            kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
            amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
            sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
        });

        it("allows when KYC verified and both checks cleared", () => {
            const r = evaluateAmlSanctionsGateForPurchasing(base());
            expect(r.allowed).toBe(true);
            expect(r.audit.gate).toBe("enter_purchasing");
        });

        it("blocks when AML is not cleared", () => {
            const r = evaluateAmlSanctionsGateForPurchasing({
                ...base(),
                amlCheckStatus: COMPLIANCE_CHECK_STATUS.BLOCKED,
            });
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.AML_BLOCKED);
        });

        it("blocks when sanctions indicates a match", () => {
            const r = evaluateAmlSanctionsGateForPurchasing({
                ...base(),
                sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.BLOCKED,
            });
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_MATCH);
        });

        it("blocks purchasing when KYC is no longer verified", () => {
            const r = evaluateAmlSanctionsGateForPurchasing({
                ...base(),
                kycVerificationStatus: KYC_VERIFICATION_STATUS.PENDING,
            });
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED);
        });

        it("accumulates multiple reason codes when several checks fail", () => {
            const r = evaluateAmlSanctionsGateForPurchasing({
                kycVerificationStatus: KYC_VERIFICATION_STATUS.PENDING,
                amlCheckStatus: COMPLIANCE_CHECK_STATUS.PENDING_REVIEW,
                sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.ERROR,
            });
            expect(r.allowed).toBe(false);
            expect(r.reasonCodes.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe("evaluateFiatToCryptoOrderTransitionWithCompliance", () => {
        it("does not add compliance constraints to unrelated transitions", () => {
            const r = evaluateFiatToCryptoOrderTransitionWithCompliance(
                FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
                FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
                {
                    kycVerificationStatus: KYC_VERIFICATION_STATUS.PENDING,
                },
            );
            expect(r.allowed).toBe(true);
            expect(r.audit).toBeNull();
        });

        it("delegates paid → purchasing to AML/sanctions gate", () => {
            const blocked = evaluateFiatToCryptoOrderTransitionWithCompliance(
                FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
                FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
                {
                    kycVerificationStatus: KYC_VERIFICATION_STATUS.VERIFIED,
                    amlCheckStatus: COMPLIANCE_CHECK_STATUS.CLEARED,
                    sanctionsCheckStatus: COMPLIANCE_CHECK_STATUS.BLOCKED,
                },
                { orderId: "ord-1", userId: "u1" },
            );
            expect(blocked.allowed).toBe(false);
            expect(blocked.reasonCodes).toContain(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_MATCH);
            expect(blocked.audit?.orderId).toBe("ord-1");
        });
    });
});

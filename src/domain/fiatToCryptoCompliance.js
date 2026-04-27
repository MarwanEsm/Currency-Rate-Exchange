/**
 * KYC / AML / sanctions gates for fiat-to-crypto orders (FCX-19, FCX-39).
 *
 * Policy (enforced by exported evaluators — call these from order services / workers):
 *
 * 1. **Order creation / submission** — customer must be **KYC verified** before an order
 *    is accepted into `submitted` (or equivalent create path).
 * 2. **Enter purchasing** — when moving `paid` → `purchasing`, **AML** and **sanctions**
 *    screening must both be in a **cleared** state; KYC must still be **verified**.
 *    Persist snapshot fields on the order (`kycVerificationStatus`, `amlCheckStatus`,
 *    `sanctionsCheckStatus`) and resolve them with `resolveComplianceContextForEnterPurchasing`
 *    so the admin API cannot “approve” without a recorded screening result (FCX-39).
 *
 * Failed checks return stable **reason codes** for UI, APIs, and ops tooling. Each
 * evaluation returns an **audit payload** suitable for append-only compliance logs.
 */

import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

/** Customer identity verification lifecycle (vendor-agnostic). */
export const KYC_VERIFICATION_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    VERIFIED: "verified",
    REJECTED: "rejected",
    EXPIRED: "expired",
};

/** Result of an AML or sanctions screening job. */
export const COMPLIANCE_CHECK_STATUS = {
    CLEARED: "cleared",
    PENDING_REVIEW: "pending_review",
    BLOCKED: "blocked",
    ERROR: "error",
};

/**
 * Machine-readable block reasons (stable contract for clients and audit).
 * Use `failureCode` / structured logs — not end-user copy verbatim.
 */
export const COMPLIANCE_BLOCK_REASON_CODES = {
    KYC_NOT_VERIFIED: "kyc_not_verified",
    KYC_REJECTED: "kyc_rejected",
    KYC_EXPIRED: "kyc_expired",
    AML_PENDING_REVIEW: "aml_pending_review",
    AML_BLOCKED: "aml_blocked",
    AML_SCREENING_ERROR: "aml_screening_error",
    SANCTIONS_PENDING_REVIEW: "sanctions_pending_review",
    SANCTIONS_MATCH: "sanctions_match",
    SANCTIONS_SCREENING_ERROR: "sanctions_screening_error",
};

/** @typedef {typeof COMPLIANCE_BLOCK_REASON_CODES[keyof typeof COMPLIANCE_BLOCK_REASON_CODES]} ComplianceBlockReasonCode */

/**
 * @typedef {'order_creation' | 'enter_purchasing'} ComplianceGate
 *
 * @typedef {{
 *   schemaVersion: 1,
 *   occurredAt: string,
 *   gate: ComplianceGate,
 *   decision: 'allowed' | 'blocked',
 *   reasonCodes: ComplianceBlockReasonCode[],
 *   orderId?: string,
 *   userId?: string,
 *   correlationId?: string,
 *   actor?: string,
 * }} ComplianceAuditEntry
 */

/**
 * In-memory audit trail for development/tests. Production services should **persist**
 * the same payloads to durable storage; this buffer is bounded and optional.
 *
 * @type {ComplianceAuditEntry[]}
 */
const complianceAuditBuffer = [];
const COMPLIANCE_AUDIT_BUFFER_MAX = 500;

/**
 * @returns {ReadonlyArray<ComplianceAuditEntry>}
 */
export const getComplianceAuditLogSnapshot = () => [...complianceAuditBuffer];

/** Clears the in-memory audit buffer (intended for tests). */
export const resetComplianceAuditLogForTests = () => {
    complianceAuditBuffer.length = 0;
};

/**
 * Records a compliance decision for audit (append-only shape). Call whenever a gate runs.
 *
 * @param {ComplianceAuditEntry} entry
 */
export const logComplianceDecisionForAudit = (entry) => {
    complianceAuditBuffer.push(entry);
    if (complianceAuditBuffer.length > COMPLIANCE_AUDIT_BUFFER_MAX) {
        complianceAuditBuffer.splice(0, complianceAuditBuffer.length - COMPLIANCE_AUDIT_BUFFER_MAX);
    }
};

/**
 * @param {ComplianceGate} gate
 * @param {'allowed' | 'blocked'} decision
 * @param {ComplianceBlockReasonCode[]} reasonCodes
 * @param {{ orderId?: string, userId?: string, correlationId?: string, actor?: string, occurredAt?: string }} [ctx]
 * @returns {ComplianceAuditEntry}
 */
export const buildComplianceAuditEntry = (gate, decision, reasonCodes, ctx = {}) => {
    const occurredAt = ctx.occurredAt ?? new Date().toISOString();
    return Object.freeze({
        schemaVersion: /** @type {const} */ (1),
        occurredAt,
        gate,
        decision,
        reasonCodes,
        ...(ctx.orderId !== undefined ? { orderId: ctx.orderId } : {}),
        ...(ctx.userId !== undefined ? { userId: ctx.userId } : {}),
        ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
        ...(ctx.actor !== undefined ? { actor: ctx.actor } : {}),
    });
};

/**
 * @param {{ kycVerificationStatus: string }} context
 * @param {{ orderId?: string, userId?: string, correlationId?: string, actor?: string, occurredAt?: string }} [auditCtx]
 * @returns {{ allowed: boolean, reasonCodes: ComplianceBlockReasonCode[], audit: ComplianceAuditEntry }}
 */
export const evaluateKycGateForOrderCreation = (context, auditCtx = {}) => {
    const { kycVerificationStatus } = context;
    /** @type {ComplianceBlockReasonCode[]} */
    const reasonCodes = [];

    if (kycVerificationStatus === KYC_VERIFICATION_STATUS.VERIFIED) {
        const audit = buildComplianceAuditEntry("order_creation", "allowed", [], auditCtx);
        logComplianceDecisionForAudit(audit);
        return { allowed: true, reasonCodes: [], audit };
    }

    if (kycVerificationStatus === KYC_VERIFICATION_STATUS.REJECTED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_REJECTED);
    } else if (kycVerificationStatus === KYC_VERIFICATION_STATUS.EXPIRED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_EXPIRED);
    } else {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED);
    }

    const audit = buildComplianceAuditEntry("order_creation", "blocked", reasonCodes, auditCtx);
    logComplianceDecisionForAudit(audit);
    return { allowed: false, reasonCodes, audit };
};

/**
 * @param {{
 *   kycVerificationStatus: string,
 *   amlCheckStatus: string,
 *   sanctionsCheckStatus: string,
 * }} context
 * @param {{ orderId?: string, userId?: string, correlationId?: string, actor?: string, occurredAt?: string }} [auditCtx]
 * @returns {{ allowed: boolean, reasonCodes: ComplianceBlockReasonCode[], audit: ComplianceAuditEntry }}
 */
/**
 * Pure assessment (no audit logging). Use for idempotent preflight checks (e.g. execution) — FCX-39.
 *
 * @param {{
 *   kycVerificationStatus: string,
 *   amlCheckStatus?: string,
 *   sanctionsCheckStatus?: string,
 * }} context
 * @returns {{ allowed: boolean, reasonCodes: ComplianceBlockReasonCode[] }}
 */
export const assessAmlSanctionsSnapshotForPurchasing = (context) => {
    /** @type {ComplianceBlockReasonCode[]} */
    const reasonCodes = [];

    const { kycVerificationStatus, amlCheckStatus, sanctionsCheckStatus } = context;

    if (kycVerificationStatus !== KYC_VERIFICATION_STATUS.VERIFIED) {
        if (kycVerificationStatus === KYC_VERIFICATION_STATUS.REJECTED) {
            reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_REJECTED);
        } else if (kycVerificationStatus === KYC_VERIFICATION_STATUS.EXPIRED) {
            reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_EXPIRED);
        } else {
            reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.KYC_NOT_VERIFIED);
        }
    }

    if (amlCheckStatus === COMPLIANCE_CHECK_STATUS.PENDING_REVIEW) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.AML_PENDING_REVIEW);
    } else if (amlCheckStatus === COMPLIANCE_CHECK_STATUS.BLOCKED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.AML_BLOCKED);
    } else if (amlCheckStatus === COMPLIANCE_CHECK_STATUS.ERROR) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.AML_SCREENING_ERROR);
    } else if (amlCheckStatus !== COMPLIANCE_CHECK_STATUS.CLEARED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.AML_SCREENING_ERROR);
    }

    if (sanctionsCheckStatus === COMPLIANCE_CHECK_STATUS.PENDING_REVIEW) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_PENDING_REVIEW);
    } else if (sanctionsCheckStatus === COMPLIANCE_CHECK_STATUS.BLOCKED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_MATCH);
    } else if (sanctionsCheckStatus === COMPLIANCE_CHECK_STATUS.ERROR) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_SCREENING_ERROR);
    } else if (sanctionsCheckStatus !== COMPLIANCE_CHECK_STATUS.CLEARED) {
        reasonCodes.push(COMPLIANCE_BLOCK_REASON_CODES.SANCTIONS_SCREENING_ERROR);
    }

    return { allowed: reasonCodes.length === 0, reasonCodes };
};

/**
 * Merges persisted order fields with optional request-time values. **Order** fields take
 * precedence when set so callers cannot override a stored blocked state via the admin API (FCX-39).
 *
 * @param {{ kycVerificationStatus?: string, amlCheckStatus?: string, sanctionsCheckStatus?: string }} order
 * @param {{ kycVerificationStatus?: string, amlCheckStatus?: string, sanctionsCheckStatus?: string }} [requestOverride]
 * @returns {{ kycVerificationStatus: string, amlCheckStatus: string, sanctionsCheckStatus: string }}
 */
export const resolveComplianceContextForEnterPurchasing = (order, requestOverride = {}) => {
    const o = order && typeof order === "object" ? order : {};
    const r = requestOverride && typeof requestOverride === "object" ? requestOverride : {};
    return {
        kycVerificationStatus: o.kycVerificationStatus ?? r.kycVerificationStatus ?? KYC_VERIFICATION_STATUS.PENDING,
        amlCheckStatus: o.amlCheckStatus ?? r.amlCheckStatus,
        sanctionsCheckStatus: o.sanctionsCheckStatus ?? r.sanctionsCheckStatus,
    };
};

export const evaluateAmlSanctionsGateForPurchasing = (context, auditCtx = {}) => {
    const { allowed, reasonCodes } = assessAmlSanctionsSnapshotForPurchasing(context);

    if (allowed) {
        const audit = buildComplianceAuditEntry("enter_purchasing", "allowed", [], auditCtx);
        logComplianceDecisionForAudit(audit);
        return { allowed: true, reasonCodes: [], audit };
    }

    const audit = buildComplianceAuditEntry("enter_purchasing", "blocked", reasonCodes, auditCtx);
    logComplianceDecisionForAudit(audit);
    return { allowed: false, reasonCodes, audit };
};

/**
 * Whether a lifecycle transition is allowed **including** FCX-19 compliance (in addition to
 * the raw graph in `fiatToCryptoOrder`).
 *
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrderStatus} fromStatus
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrderStatus} toStatus
 * @param {{
 *   kycVerificationStatus: string,
 *   amlCheckStatus?: string,
 *   sanctionsCheckStatus?: string,
 * }} complianceContext
 * @param {{ orderId?: string, userId?: string, correlationId?: string, actor?: string }} [auditCtx]
 * @returns {{ allowed: boolean, reasonCodes: ComplianceBlockReasonCode[], audit: ComplianceAuditEntry | null }}
 */
export const evaluateFiatToCryptoOrderTransitionWithCompliance = (
    fromStatus,
    toStatus,
    complianceContext,
    auditCtx = {},
) => {
    if (fromStatus === FIAT_TO_CRYPTO_ORDER_STATUS.PAID && toStatus === FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING) {
        const aml = complianceContext.amlCheckStatus ?? COMPLIANCE_CHECK_STATUS.ERROR;
        const sanctions = complianceContext.sanctionsCheckStatus ?? COMPLIANCE_CHECK_STATUS.ERROR;
        const gate = evaluateAmlSanctionsGateForPurchasing(
            {
                kycVerificationStatus: complianceContext.kycVerificationStatus,
                amlCheckStatus: aml,
                sanctionsCheckStatus: sanctions,
            },
            auditCtx,
        );
        return {
            allowed: gate.allowed,
            reasonCodes: gate.reasonCodes,
            audit: gate.audit,
        };
    }

    return { allowed: true, reasonCodes: [], audit: null };
};

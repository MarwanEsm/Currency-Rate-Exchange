/**
 * Admin review & approval queue for fiat-to-crypto orders (FCX-26, FCX-43).
 *
 * Pure helpers: an admin "decides" a `paid` order (approve → move toward `purchasing` once
 * compliance passes, or reject → `failed`). Permissions gate the decision call; every action
 * is captured as an append-only audit entry (buffered here for dev/tests — production should
 * persist the same payload in a durable admin audit log).
 */

import { ADMIN_PERMISSION, hasAdminPermission } from "./adminPermissions";
import {
    evaluateFiatToCryptoOrderTransitionWithCompliance,
    resolveComplianceContextForEnterPurchasing,
} from "./fiatToCryptoCompliance";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

export const ADMIN_DECISION = {
    APPROVE: "approve",
    REJECT: "reject",
};

export const ADMIN_DECISION_ERROR_CODES = {
    ORDER_NOT_FOUND: "order_not_found",
    ORDER_NOT_PENDING_APPROVAL: "order_not_pending_approval",
    PERMISSION_DENIED: "permission_denied",
    REASON_REQUIRED: "reason_required",
    INVALID_DECISION: "invalid_decision",
    COMPLIANCE_BLOCKED: "compliance_blocked",
};

const REASON_MIN_LEN = 3;
const REASON_MAX_LEN = 500;

/**
 * @typedef {{
 *   schemaVersion: 1,
 *   occurredAt: string,
 *   orderId: string,
 *   decision: 'approve' | 'reject',
 *   previousStatus: string,
 *   newStatus: string,
 *   reason: string,
 *   adminUserId: string,
 *   adminRoles: ReadonlyArray<string>,
 *   complianceReasonCodes?: ReadonlyArray<string>,
 *   outcome: 'applied' | 'rejected' | 'blocked',
 * }} AdminDecisionAuditEntry
 */

/** @type {AdminDecisionAuditEntry[]} */
const adminDecisionAuditBuffer = [];
const ADMIN_DECISION_AUDIT_BUFFER_MAX = 500;

/**
 * @returns {ReadonlyArray<AdminDecisionAuditEntry>}
 */
export const getAdminDecisionAuditLogSnapshot = () => [...adminDecisionAuditBuffer];

/** Intended for tests. */
export const resetAdminDecisionAuditLogForTests = () => {
    adminDecisionAuditBuffer.length = 0;
};

const appendAudit = (entry) => {
    adminDecisionAuditBuffer.push(entry);
    if (adminDecisionAuditBuffer.length > ADMIN_DECISION_AUDIT_BUFFER_MAX) {
        adminDecisionAuditBuffer.splice(0, adminDecisionAuditBuffer.length - ADMIN_DECISION_AUDIT_BUFFER_MAX);
    }
};

/**
 * Filters an array of orders down to those awaiting admin review (currently `paid`).
 *
 * @param {ReadonlyArray<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>} orders
 * @returns {Array<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>}
 */
export const selectPendingExecutableOrders = (orders) => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => o && o.status === FIAT_TO_CRYPTO_ORDER_STATUS.PAID);
};

const sanitizeReason = (reason) => String(reason ?? "").trim();

/**
 * Validates and applies an admin decision to a `paid` order. Pure: returns a patch + audit entry;
 * the caller persists. `complianceContext` only fills missing fields on the order; persisted order
 * values win (FCX-39).
 *
 * @param {{
 *   order: import("./fiatToCryptoOrder.js").FiatToCryptoOrder | null | undefined,
 *   decision: 'approve' | 'reject',
 *   reason: string,
 *   adminUserId: string,
 *   adminRoles: ReadonlyArray<string>,
 *   complianceContext?: {
 *     kycVerificationStatus: string,
 *     amlCheckStatus?: string,
 *     sanctionsCheckStatus?: string,
 *   },
 *   occurredAt?: string,
 * }} input
 * @returns {{
 *   ok: true,
 *   orderPatch: { status: string, failureCode?: string, failureMessage?: string, updatedAt: string, paidAt?: string, purchasingAt?: string, failedAt?: string, lastUpdatedBy?: string },
 *   audit: AdminDecisionAuditEntry,
 * } | {
 *   ok: false,
 *   errorCode: string,
 *   errorMessage: string,
 *   complianceReasonCodes?: ReadonlyArray<string>,
 *   audit?: AdminDecisionAuditEntry,
 * }}
 */
export const applyAdminDecisionToPaidOrder = (input) => {
    const now = input.occurredAt ?? new Date().toISOString();
    const adminUserId = typeof input.adminUserId === "string" ? input.adminUserId.trim() : "";
    const adminRoles = Array.isArray(input.adminRoles) ? input.adminRoles : [];
    const decision = input.decision;
    const reason = sanitizeReason(input.reason);

    if (!hasAdminPermission(adminRoles, ADMIN_PERMISSION.DECIDE_ORDER_APPROVAL) || adminUserId === "") {
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.PERMISSION_DENIED,
            errorMessage: "You do not have permission to decide this order.",
        };
    }

    if (decision !== ADMIN_DECISION.APPROVE && decision !== ADMIN_DECISION.REJECT) {
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.INVALID_DECISION,
            errorMessage: "Decision must be \"approve\" or \"reject\".",
        };
    }

    if (reason.length < REASON_MIN_LEN || reason.length > REASON_MAX_LEN) {
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.REASON_REQUIRED,
            errorMessage: `Reason must be between ${REASON_MIN_LEN} and ${REASON_MAX_LEN} characters.`,
        };
    }

    const order = input.order;
    if (!order || typeof order !== "object") {
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.ORDER_NOT_FOUND,
            errorMessage: "Order not found.",
        };
    }

    if (order.status !== FIAT_TO_CRYPTO_ORDER_STATUS.PAID) {
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.ORDER_NOT_PENDING_APPROVAL,
            errorMessage: `Order is not pending approval (current status: ${order.status}).`,
        };
    }

    if (decision === ADMIN_DECISION.REJECT) {
        const audit = {
            schemaVersion: /** @type {const} */ (1),
            occurredAt: now,
            orderId: order.id,
            decision: ADMIN_DECISION.REJECT,
            previousStatus: order.status,
            newStatus: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
            reason,
            adminUserId,
            adminRoles,
            outcome: /** @type {const} */ ("applied"),
        };
        appendAudit(audit);
        return {
            ok: true,
            orderPatch: {
                status: FIAT_TO_CRYPTO_ORDER_STATUS.FAILED,
                failureCode: "admin_rejected",
                failureMessage: reason,
                failedAt: now,
                updatedAt: now,
                lastUpdatedBy: adminUserId,
            },
            audit,
        };
    }

    const compliance = resolveComplianceContextForEnterPurchasing(order, input.complianceContext);
    const gate = evaluateFiatToCryptoOrderTransitionWithCompliance(
        FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
        FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
        compliance,
        { orderId: order.id, userId: order.userId, actor: adminUserId },
    );

    if (!gate.allowed) {
        const audit = {
            schemaVersion: /** @type {const} */ (1),
            occurredAt: now,
            orderId: order.id,
            decision: ADMIN_DECISION.APPROVE,
            previousStatus: order.status,
            newStatus: order.status,
            reason,
            adminUserId,
            adminRoles,
            complianceReasonCodes: gate.reasonCodes,
            outcome: /** @type {const} */ ("blocked"),
        };
        appendAudit(audit);
        return {
            ok: false,
            errorCode: ADMIN_DECISION_ERROR_CODES.COMPLIANCE_BLOCKED,
            errorMessage: "Compliance prevented approval; see reason codes.",
            complianceReasonCodes: gate.reasonCodes,
            audit,
        };
    }

    const audit = {
        schemaVersion: /** @type {const} */ (1),
        occurredAt: now,
        orderId: order.id,
        decision: ADMIN_DECISION.APPROVE,
        previousStatus: order.status,
        newStatus: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
        reason,
        adminUserId,
        adminRoles,
        outcome: /** @type {const} */ ("applied"),
    };
    appendAudit(audit);

    return {
        ok: true,
        orderPatch: {
            status: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
            purchasingAt: now,
            updatedAt: now,
            lastUpdatedBy: adminUserId,
        },
        audit,
    };
};

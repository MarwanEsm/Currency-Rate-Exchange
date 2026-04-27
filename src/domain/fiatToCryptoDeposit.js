/**
 * Fiat deposit verification & reconciliation (FCX-23).
 *
 * Purpose: let operations match an incoming bank / PSP deposit to a `submitted` order, verify the
 * paid amount and currency, and record a reconciliation event. The engine is deliberately
 * transport-agnostic — callers (API routes, webhook handlers, ops scripts) pass plain deposit
 * objects and lists of candidate orders.
 *
 * Outcomes
 * --------
 * - `matched`            Deposit amount + currency verified; order moves `submitted` → `paid`.
 * - `amount_under`       Deposit short of quoted fiat by more than tolerance; order stays `submitted`.
 *                        Ops options: wait for top-up, issue partial refund, or fail the order.
 * - `amount_over`        Deposit exceeds quoted fiat by more than tolerance; held for review.
 *                        Ops options: credit surplus, refund surplus, or fail the order.
 * - `currency_mismatch`  Deposit currency ≠ order `fiatCurrency`. Never auto-matches; always holds.
 * - `no_matching_order`  No candidate order resolved from the deposit reference.
 * - `order_not_eligible` Candidate order is not in `submitted` (already paid, failed, etc.).
 * - `duplicate_deposit`  A prior event already reconciled this deposit id.
 *
 * Only `matched` returns an order patch that transitions `submitted` → `paid`. The other outcomes
 * return a "hold" patch that records the deposit reference, variance, and reviewer notes without
 * changing status — so the queue screen can surface the anomaly for manual resolution.
 *
 * For `matched`, pass `complianceScreening` with the AML and sanctions result at funding time
 * (FCX-39) so the order can later move `paid` → `purchasing` only when checks are `cleared`.
 */

/**
 * @typedef {{
 *   id: string,
 *   amount: string,
 *   currency: string,
 *   reference: string,
 *   senderReference?: string,
 *   receivedAt: string,
 *   processor?: string,
 *   bankMetadata?: Record<string, unknown>,
 * }} DepositRecord
 */

export const DEPOSIT_RECONCILIATION_OUTCOME = Object.freeze({
    MATCHED: "matched",
    AMOUNT_UNDER: "amount_under",
    AMOUNT_OVER: "amount_over",
    CURRENCY_MISMATCH: "currency_mismatch",
    NO_MATCHING_ORDER: "no_matching_order",
    ORDER_NOT_ELIGIBLE: "order_not_eligible",
    DUPLICATE_DEPOSIT: "duplicate_deposit",
});

/** @typedef {typeof DEPOSIT_RECONCILIATION_OUTCOME[keyof typeof DEPOSIT_RECONCILIATION_OUTCOME]} DepositReconciliationOutcome */

/**
 * Default tolerance: exact match required (0 bps). Processors that don't strip fees on the receiving
 * side commonly cause ±1–2 bps variance — callers may raise this, but the default is strict so small
 * errors still trigger human review.
 */
export const DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS = 0;

const AUDIT_SCHEMA_VERSION = 1;

/**
 * @typedef {{
 *   schemaVersion: number,
 *   eventId: string,
 *   reconciledAt: string,
 *   actor?: string,
 *   depositId: string,
 *   orderId?: string,
 *   outcome: DepositReconciliationOutcome,
 *   depositAmount: string,
 *   depositCurrency: string,
 *   expectedAmount?: string,
 *   expectedCurrency?: string,
 *   varianceMinor?: string,
 *   notes?: string,
 * }} DepositReconciliationEvent
 */

/** @type {DepositReconciliationEvent[]} */
const auditBuffer = [];

/** @returns {ReadonlyArray<DepositReconciliationEvent>} */
export const getDepositReconciliationAuditLogSnapshot = () => [...auditBuffer];

/** For tests only. */
export const __clearDepositReconciliationAuditForTests = () => {
    auditBuffer.length = 0;
};

const DECIMAL_STRING_RX = /^\d+(\.\d+)?$/;

/**
 * Convert a decimal string to integer minor units (cents) using 2 decimal places. Throws on
 * malformed input — validation is the caller's responsibility before reconciling.
 *
 * @param {string} value
 */
const toMinorUnits = (value) => {
    if (typeof value !== "string" || !DECIMAL_STRING_RX.test(value.trim())) {
        throw new Error(`Invalid decimal string: ${value}`);
    }
    const trimmed = value.trim();
    const [whole, frac = ""] = trimmed.split(".");
    const fracPadded = (frac + "00").slice(0, 2);
    return BigInt(whole) * 100n + BigInt(fracPadded);
};

/**
 * @param {bigint} minor
 */
const fromMinorUnitsSigned = (minor) => {
    const negative = minor < 0n;
    const abs = negative ? -minor : minor;
    const whole = abs / 100n;
    const frac = abs % 100n;
    const fracStr = frac.toString().padStart(2, "0");
    return `${negative ? "-" : ""}${whole.toString()}.${fracStr}`;
};

/**
 * Normalize a currency code for comparison. Always uppercase.
 *
 * @param {string} code
 */
const canonCurrency = (code) => (typeof code === "string" ? code.trim().toUpperCase() : "");

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export const validateDepositRecord = (value) => {
    /** @type {string[]} */
    const errors = [];
    if (!value || typeof value !== "object") {
        errors.push("Deposit record must be an object.");
        return errors;
    }
    const d = /** @type {Record<string, unknown>} */ (value);
    if (typeof d.id !== "string" || d.id.trim() === "") errors.push("`id` is required.");
    if (typeof d.amount !== "string" || !DECIMAL_STRING_RX.test(d.amount.trim())) {
        errors.push("`amount` must be a non-negative decimal string.");
    } else if (Number(d.amount) <= 0) {
        errors.push("`amount` must be greater than zero.");
    }
    if (typeof d.currency !== "string" || d.currency.trim() === "") errors.push("`currency` is required.");
    if (typeof d.reference !== "string" || d.reference.trim() === "") errors.push("`reference` is required.");
    if (typeof d.receivedAt !== "string" || !d.receivedAt.trim()) errors.push("`receivedAt` is required (ISO string).");
    return errors;
};

/**
 * Find the order whose `id`, `idempotencyKey`, or explicit `depositReference` matches the deposit
 * reference. Returns the first match, or undefined.
 *
 * @param {DepositRecord} deposit
 * @param {ReadonlyArray<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>} orders
 */
export const findOrderForDeposit = (deposit, orders) => {
    if (!deposit || !orders) return undefined;
    const ref = String(deposit.reference ?? "").trim();
    if (!ref) return undefined;
    for (const o of orders) {
        if (!o) continue;
        if (o.id === ref) return o;
        if (o.idempotencyKey && o.idempotencyKey === ref) return o;
        if (o.depositReference && o.depositReference === ref) return o;
    }
    return undefined;
};

/**
 * Evaluate amount match taking a tolerance (basis points of expected amount) into account. Returns
 * the absolute signed variance in minor units (positive = deposit exceeds expected).
 *
 * @param {string} expectedAmount
 * @param {string} depositAmount
 * @param {number} toleranceBps
 */
const compareAmountsWithTolerance = (expectedAmount, depositAmount, toleranceBps) => {
    const expected = toMinorUnits(expectedAmount);
    const actual = toMinorUnits(depositAmount);
    const diff = actual - expected;
    const toleranceMinor = (expected * BigInt(Math.max(0, Math.floor(toleranceBps)))) / 10000n;
    const absDiff = diff < 0n ? -diff : diff;
    return {
        varianceMinor: diff,
        withinTolerance: absDiff <= toleranceMinor,
    };
};

/**
 * Reconcile a single deposit against a provided candidate order (or no order, if none matched).
 *
 * Emits one audit event, returns the outcome, the event, and an optional order patch. The caller is
 * responsible for persisting the patch (this module is side-effect free aside from the audit buffer).
 *
 * @param {{
 *   deposit: DepositRecord,
 *   order?: import("./fiatToCryptoOrder.js").FiatToCryptoOrder,
 *   priorReconciledDepositIds?: ReadonlyArray<string>,
 *   actor?: string,
 *   notes?: string,
 *   toleranceBps?: number,
 *   uuidFactory?: () => string,
 *   nowIso?: () => string,
 *   complianceScreening?: { amlCheckStatus: string, sanctionsCheckStatus: string },
 * }} input
 * @returns {{
 *   outcome: DepositReconciliationOutcome,
 *   event: DepositReconciliationEvent,
 *   orderPatch?: Partial<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>,
 * }}
 */
export const reconcileDeposit = (input) => {
    if (!input || typeof input !== "object") throw new Error("reconcileDeposit requires an input object.");
    const {
        deposit,
        order,
        priorReconciledDepositIds = [],
        actor,
        notes,
        toleranceBps = DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS,
        uuidFactory,
        nowIso,
        complianceScreening,
    } = input;

    const validationErrors = validateDepositRecord(deposit);
    if (validationErrors.length > 0) {
        throw new Error(`Invalid deposit: ${validationErrors.join("; ")}`);
    }

    const reconciledAt = typeof nowIso === "function" ? nowIso() : new Date().toISOString();
    const eventId =
        typeof uuidFactory === "function" ? uuidFactory() : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const depositCurrency = canonCurrency(deposit.currency);

    /**
     * @param {{outcome: DepositReconciliationOutcome, extra?: Partial<DepositReconciliationEvent>}} args
     */
    const emit = ({ outcome, extra = {} }) => {
        /** @type {DepositReconciliationEvent} */
        const event = {
            schemaVersion: AUDIT_SCHEMA_VERSION,
            eventId,
            reconciledAt,
            actor,
            depositId: deposit.id,
            orderId: order?.id,
            outcome,
            depositAmount: deposit.amount,
            depositCurrency,
            expectedAmount: order?.fiatAmount,
            expectedCurrency: order ? canonCurrency(order.fiatCurrency) : undefined,
            notes,
            ...extra,
        };
        auditBuffer.push(event);
        return event;
    };

    if (priorReconciledDepositIds.includes(deposit.id)) {
        return {
            outcome: DEPOSIT_RECONCILIATION_OUTCOME.DUPLICATE_DEPOSIT,
            event: emit({ outcome: DEPOSIT_RECONCILIATION_OUTCOME.DUPLICATE_DEPOSIT }),
        };
    }

    if (!order) {
        return {
            outcome: DEPOSIT_RECONCILIATION_OUTCOME.NO_MATCHING_ORDER,
            event: emit({ outcome: DEPOSIT_RECONCILIATION_OUTCOME.NO_MATCHING_ORDER }),
        };
    }

    if (order.status !== "submitted") {
        return {
            outcome: DEPOSIT_RECONCILIATION_OUTCOME.ORDER_NOT_ELIGIBLE,
            event: emit({ outcome: DEPOSIT_RECONCILIATION_OUTCOME.ORDER_NOT_ELIGIBLE }),
        };
    }

    if (depositCurrency !== canonCurrency(order.fiatCurrency)) {
        return {
            outcome: DEPOSIT_RECONCILIATION_OUTCOME.CURRENCY_MISMATCH,
            event: emit({ outcome: DEPOSIT_RECONCILIATION_OUTCOME.CURRENCY_MISMATCH }),
            orderPatch: buildHoldPatch(order, deposit, reconciledAt, actor, /* varianceMinor */ undefined, notes),
        };
    }

    const { varianceMinor, withinTolerance } = compareAmountsWithTolerance(
        order.fiatAmount,
        deposit.amount,
        toleranceBps,
    );

    if (withinTolerance) {
        return {
            outcome: DEPOSIT_RECONCILIATION_OUTCOME.MATCHED,
            event: emit({
                outcome: DEPOSIT_RECONCILIATION_OUTCOME.MATCHED,
                extra: { varianceMinor: fromMinorUnitsSigned(varianceMinor) },
            }),
            orderPatch: buildMatchPatch(order, deposit, reconciledAt, actor, varianceMinor, notes, complianceScreening),
        };
    }

    const overOrUnder =
        varianceMinor > 0n
            ? DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_OVER
            : DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_UNDER;

    return {
        outcome: overOrUnder,
        event: emit({ outcome: overOrUnder, extra: { varianceMinor: fromMinorUnitsSigned(varianceMinor) } }),
        orderPatch: buildHoldPatch(order, deposit, reconciledAt, actor, varianceMinor, notes),
    };
};

/**
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {DepositRecord} deposit
 * @param {string} reconciledAt
 * @param {string | undefined} actor
 * @param {bigint} varianceMinor
 * @param {string | undefined} notes
 * @param {{ amlCheckStatus: string, sanctionsCheckStatus: string } | undefined} complianceScreening
 * @returns {Partial<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>}
 */
const buildMatchPatch = (order, deposit, reconciledAt, actor, varianceMinor, notes, complianceScreening) => ({
    status: "paid",
    paidAt: reconciledAt,
    updatedAt: reconciledAt,
    lastUpdatedBy: actor,
    depositId: deposit.id,
    depositAmount: deposit.amount,
    depositCurrency: canonCurrency(deposit.currency),
    depositReference: deposit.reference,
    depositReceivedAt: deposit.receivedAt,
    reconciledAt,
    reconciliationOutcome: DEPOSIT_RECONCILIATION_OUTCOME.MATCHED,
    reconciliationVariance: fromMinorUnitsSigned(varianceMinor),
    reconciliationNotes: notes,
    ...(complianceScreening
        ? {
              amlCheckStatus: complianceScreening.amlCheckStatus,
              sanctionsCheckStatus: complianceScreening.sanctionsCheckStatus,
          }
        : {}),
});

/**
 * @param {import("./fiatToCryptoOrder.js").FiatToCryptoOrder} order
 * @param {DepositRecord} deposit
 * @param {string} reconciledAt
 * @param {string | undefined} actor
 * @param {bigint | undefined} varianceMinor
 * @param {string | undefined} notes
 * @returns {Partial<import("./fiatToCryptoOrder.js").FiatToCryptoOrder>}
 */
const buildHoldPatch = (order, deposit, reconciledAt, actor, varianceMinor, notes) => ({
    updatedAt: reconciledAt,
    lastUpdatedBy: actor,
    depositId: deposit.id,
    depositAmount: deposit.amount,
    depositCurrency: canonCurrency(deposit.currency),
    depositReference: deposit.reference,
    depositReceivedAt: deposit.receivedAt,
    reconciledAt,
    reconciliationOutcome:
        canonCurrency(deposit.currency) !== canonCurrency(order.fiatCurrency)
            ? DEPOSIT_RECONCILIATION_OUTCOME.CURRENCY_MISMATCH
            : varianceMinor !== undefined && varianceMinor > 0n
            ? DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_OVER
            : DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_UNDER,
    reconciliationVariance: varianceMinor !== undefined ? fromMinorUnitsSigned(varianceMinor) : undefined,
    reconciliationNotes: notes,
});

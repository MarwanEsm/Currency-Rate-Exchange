import {
    DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS,
    DEPOSIT_RECONCILIATION_OUTCOME,
    __clearDepositReconciliationAuditForTests,
    findOrderForDeposit,
    getDepositReconciliationAuditLogSnapshot,
    reconcileDeposit,
    validateDepositRecord,
} from "./fiatToCryptoDeposit";

const baseOrder = {
    id: "ord_1",
    userId: "u1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1q0000000000000000000000000000000000000",
    status: "submitted",
    createdAt: "2026-04-23T10:00:00.000Z",
    updatedAt: "2026-04-23T10:00:00.000Z",
};

const baseDeposit = {
    id: "dep_1",
    amount: "100.00",
    currency: "USD",
    reference: "ord_1",
    receivedAt: "2026-04-23T10:30:00.000Z",
    processor: "ACME_BANK",
};

const fixedTime = () => "2026-04-23T10:35:00.000Z";
const fixedId = () => "evt_static";

describe("validateDepositRecord", () => {
    test("returns no errors on valid payload", () => {
        expect(validateDepositRecord(baseDeposit)).toEqual([]);
    });

    test("flags missing id, zero amount, missing currency/reference/receivedAt", () => {
        const errors = validateDepositRecord({ amount: "0", currency: "", reference: "", receivedAt: "" });
        expect(errors.some((e) => /`id`/.test(e))).toBe(true);
        expect(errors.some((e) => /greater than zero/.test(e))).toBe(true);
        expect(errors.some((e) => /`currency`/.test(e))).toBe(true);
        expect(errors.some((e) => /`reference`/.test(e))).toBe(true);
        expect(errors.some((e) => /`receivedAt`/.test(e))).toBe(true);
    });

    test("rejects non-object input", () => {
        expect(validateDepositRecord(null)).toEqual(["Deposit record must be an object."]);
    });
});

describe("findOrderForDeposit", () => {
    test("matches by order id", () => {
        const match = findOrderForDeposit({ ...baseDeposit, reference: "ord_1" }, [baseOrder]);
        expect(match?.id).toBe("ord_1");
    });

    test("matches by idempotencyKey", () => {
        const order = { ...baseOrder, id: "ord_X", idempotencyKey: "CLIENT_KEY_123" };
        const match = findOrderForDeposit({ ...baseDeposit, reference: "CLIENT_KEY_123" }, [order]);
        expect(match?.id).toBe("ord_X");
    });

    test("matches by explicit depositReference on the order", () => {
        const order = { ...baseOrder, id: "ord_Y", depositReference: "BANK-REF-999" };
        const match = findOrderForDeposit({ ...baseDeposit, reference: "BANK-REF-999" }, [order]);
        expect(match?.id).toBe("ord_Y");
    });

    test("returns undefined when no order matches", () => {
        const match = findOrderForDeposit({ ...baseDeposit, reference: "UNKNOWN" }, [baseOrder]);
        expect(match).toBeUndefined();
    });
});

describe("reconcileDeposit", () => {
    beforeEach(() => {
        __clearDepositReconciliationAuditForTests();
    });

    test("matched: returns order patch moving submitted → paid with zero variance", () => {
        const result = reconcileDeposit({
            deposit: baseDeposit,
            order: baseOrder,
            actor: "ops:alice",
            notes: "routine match",
            uuidFactory: fixedId,
            nowIso: fixedTime,
        });

        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.MATCHED);
        expect(result.event).toMatchObject({
            eventId: "evt_static",
            reconciledAt: "2026-04-23T10:35:00.000Z",
            orderId: "ord_1",
            depositId: "dep_1",
            outcome: "matched",
            depositAmount: "100.00",
            depositCurrency: "USD",
            expectedAmount: "100.00",
            expectedCurrency: "USD",
            varianceMinor: "0.00",
            actor: "ops:alice",
            notes: "routine match",
            schemaVersion: 1,
        });
        expect(result.orderPatch).toMatchObject({
            status: "paid",
            paidAt: "2026-04-23T10:35:00.000Z",
            updatedAt: "2026-04-23T10:35:00.000Z",
            lastUpdatedBy: "ops:alice",
            depositId: "dep_1",
            depositAmount: "100.00",
            depositCurrency: "USD",
            depositReference: "ord_1",
            reconciledAt: "2026-04-23T10:35:00.000Z",
            reconciliationOutcome: "matched",
            reconciliationVariance: "0.00",
            reconciliationNotes: "routine match",
        });

        const audit = getDepositReconciliationAuditLogSnapshot();
        expect(audit).toHaveLength(1);
        expect(audit[0].outcome).toBe("matched");
    });

    test("amount_under: holds order in submitted with signed negative variance", () => {
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, amount: "99.00" },
            order: baseOrder,
            uuidFactory: fixedId,
            nowIso: fixedTime,
        });

        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_UNDER);
        expect(result.event.varianceMinor).toBe("-1.00");
        expect(result.orderPatch?.status).toBeUndefined();
        expect(result.orderPatch).toMatchObject({
            reconciliationOutcome: "amount_under",
            reconciliationVariance: "-1.00",
            depositId: "dep_1",
        });
    });

    test("amount_over: holds order in submitted with signed positive variance", () => {
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, amount: "105.50" },
            order: baseOrder,
            uuidFactory: fixedId,
            nowIso: fixedTime,
        });

        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_OVER);
        expect(result.event.varianceMinor).toBe("5.50");
        expect(result.orderPatch?.status).toBeUndefined();
        expect(result.orderPatch?.reconciliationOutcome).toBe("amount_over");
    });

    test("tolerance of 5 bps accepts a $0.05 shortfall on $100 as matched", () => {
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, amount: "99.95" },
            order: baseOrder,
            toleranceBps: 5,
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.MATCHED);
        expect(result.orderPatch?.status).toBe("paid");
    });

    test("default tolerance (0 bps) requires exact match", () => {
        expect(DEFAULT_DEPOSIT_AMOUNT_TOLERANCE_BPS).toBe(0);
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, amount: "99.99" },
            order: baseOrder,
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.AMOUNT_UNDER);
    });

    test("currency_mismatch: never auto-matches even when amount aligns", () => {
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, currency: "EUR" },
            order: baseOrder,
            uuidFactory: fixedId,
            nowIso: fixedTime,
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.CURRENCY_MISMATCH);
        expect(result.orderPatch?.status).toBeUndefined();
        expect(result.orderPatch?.reconciliationOutcome).toBe("currency_mismatch");
    });

    test("no_matching_order when order is not supplied", () => {
        const result = reconcileDeposit({
            deposit: baseDeposit,
            order: undefined,
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.NO_MATCHING_ORDER);
        expect(result.orderPatch).toBeUndefined();
    });

    test("order_not_eligible when order is already paid", () => {
        const result = reconcileDeposit({
            deposit: baseDeposit,
            order: { ...baseOrder, status: "paid" },
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.ORDER_NOT_ELIGIBLE);
        expect(result.orderPatch).toBeUndefined();
    });

    test("duplicate_deposit: skips order lookup entirely and returns no patch", () => {
        const result = reconcileDeposit({
            deposit: baseDeposit,
            order: baseOrder,
            priorReconciledDepositIds: ["dep_1"],
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.DUPLICATE_DEPOSIT);
        expect(result.orderPatch).toBeUndefined();
    });

    test("throws on invalid deposit input", () => {
        expect(() => reconcileDeposit({ deposit: { ...baseDeposit, amount: "not-a-number" } })).toThrow(
            /Invalid deposit/,
        );
    });

    test("case-insensitive currency comparison", () => {
        const result = reconcileDeposit({
            deposit: { ...baseDeposit, currency: "usd" },
            order: { ...baseOrder, fiatCurrency: "USD" },
        });
        expect(result.outcome).toBe(DEPOSIT_RECONCILIATION_OUTCOME.MATCHED);
    });

    test("every call appends exactly one audit event", () => {
        reconcileDeposit({ deposit: baseDeposit, order: baseOrder });
        reconcileDeposit({ deposit: { ...baseDeposit, id: "dep_2", amount: "50.00" }, order: baseOrder });
        reconcileDeposit({ deposit: { ...baseDeposit, id: "dep_3" }, order: undefined });
        const log = getDepositReconciliationAuditLogSnapshot();
        expect(log.map((e) => e.outcome)).toEqual(["matched", "amount_under", "no_matching_order"]);
    });
});

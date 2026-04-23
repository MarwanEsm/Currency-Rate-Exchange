import {
    DEFAULT_MAX_PURCHASE_ATTEMPTS,
    LIQUIDITY_PROVIDER_ID,
    PURCHASE_EXECUTION_ERROR_CODES,
    buildExecutionOrderPatch,
    executePurchaseWithRetry,
    getPurchaseExecutionAuditLogSnapshot,
    registerLiquidityProvider,
    resetLiquidityProvidersForTests,
    resetPurchaseExecutionAuditLogForTests,
} from "./fiatToCryptoExecution";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";

const purchasingOrder = (overrides = {}) => ({
    id: "order-1",
    userId: "user-1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    network: "bitcoin_mainnet",
    status: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
    grossFiatAmount: "100.00",
    feeFiatAmount: "2.00",
    netFiatAmount: "98.00",
    exchangeRateApplied: "0.00002",
    netCryptoAmount: "0.00196000",
    netCryptoAssetCode: "BTC",
    createdAt: "2026-04-23T10:00:00.000Z",
    updatedAt: "2026-04-23T11:00:00.000Z",
    purchasingAt: "2026-04-23T11:00:00.000Z",
    ...overrides,
});

const makeFixedClock = (ts = "2026-04-23T12:00:00.000Z") => () => ts;
const makeUuidFactory = () => {
    let i = 0;
    return () => `uuid-${++i}`;
};

describe("fiatToCryptoExecution — engine (FCX-24)", () => {
    beforeEach(() => {
        resetLiquidityProvidersForTests();
        resetPurchaseExecutionAuditLogForTests();
    });

    it("executes against the internal simulator and returns fill price/quantity metadata", async () => {
        const result = await executePurchaseWithRetry(purchasingOrder(), {
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
            actor: "ops-1",
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.providerId).toBe(LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR);
        expect(result.providerOrderId).toBe("sim-uuid-1");
        expect(result.fillPrice).toBe("0.00002");
        expect(result.fillQuantity).toBe("0.00196000");
        expect(result.filledAssetCode).toBe("BTC");
        expect(result.attempts).toBe(1);
        expect(result.audit).toHaveLength(1);
        expect(result.audit[0].outcome).toBe("success");
        expect(result.audit[0].actor).toBe("ops-1");
        expect(getPurchaseExecutionAuditLogSnapshot()).toHaveLength(1);
    });

    it("rejects orders that are not in purchasing", async () => {
        const result = await executePurchaseWithRetry(
            purchasingOrder({ status: FIAT_TO_CRYPTO_ORDER_STATUS.PAID }),
            { clock: makeFixedClock(), uuidFactory: makeUuidFactory() },
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.ORDER_NOT_ELIGIBLE);
        expect(result.attempts).toBe(0);
    });

    it("refuses to execute when the order has no locked pricing", async () => {
        const result = await executePurchaseWithRetry(
            purchasingOrder({ netCryptoAmount: undefined, exchangeRateApplied: undefined }),
            { clock: makeFixedClock(), uuidFactory: makeUuidFactory() },
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.MISSING_PRICING);
    });

    it("errors if the requested provider isn't registered", async () => {
        const result = await executePurchaseWithRetry(purchasingOrder(), {
            providerId: "missing_provider",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.NO_PROVIDER_CONFIGURED);
    });

    it("retries retryable provider errors and succeeds when a later attempt fills", async () => {
        let attempt = 0;
        registerLiquidityProvider("flaky", (request) => {
            attempt += 1;
            if (attempt < 3) {
                return {
                    ok: false,
                    providerId: "flaky",
                    errorCode: PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_TIMEOUT,
                    errorMessage: "temporary",
                    isRetryable: true,
                };
            }
            return {
                ok: true,
                providerId: "flaky",
                providerOrderId: `flaky-${request.uuid}`,
                fillPrice: "0.00002",
                fillQuantity: "0.00196000",
                filledAssetCode: "BTC",
                executedAt: request.now,
            };
        });

        const result = await executePurchaseWithRetry(purchasingOrder(), {
            providerId: "flaky",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.attempts).toBe(3);
        expect(result.audit.map((e) => e.outcome)).toEqual(["retry", "retry", "success"]);
    });

    it("returns MAX_RETRIES_EXCEEDED when every retryable attempt fails", async () => {
        registerLiquidityProvider("always_timeout", () => ({
            ok: false,
            providerId: "always_timeout",
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.PROVIDER_TIMEOUT,
            errorMessage: "timeout",
            isRetryable: true,
        }));

        const result = await executePurchaseWithRetry(purchasingOrder(), {
            providerId: "always_timeout",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.MAX_RETRIES_EXCEEDED);
        expect(result.attempts).toBe(DEFAULT_MAX_PURCHASE_ATTEMPTS);
        const outcomes = result.audit.map((e) => e.outcome);
        expect(outcomes.slice(0, -1)).toEqual(["retry", "retry"]);
        expect(outcomes.at(-1)).toBe("failed_permanent");
    });

    it("does NOT retry non-retryable errors (e.g. rate rejected)", async () => {
        registerLiquidityProvider("rate_reject", () => ({
            ok: false,
            providerId: "rate_reject",
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED,
            errorMessage: "venue rejected",
            isRetryable: false,
        }));

        const result = await executePurchaseWithRetry(purchasingOrder(), {
            providerId: "rate_reject",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.attempts).toBe(1);
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED);
    });

    it("recovers when a provider function throws by labelling it internal_error and stopping", async () => {
        registerLiquidityProvider("exploding", () => {
            throw new Error("boom");
        });

        const result = await executePurchaseWithRetry(purchasingOrder(), {
            providerId: "exploding",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.INTERNAL_ERROR);
        expect(result.attempts).toBe(1);
    });

    it("honors the simulatedOutcome hint for the internal simulator", async () => {
        const result = await executePurchaseWithRetry(purchasingOrder(), {
            simulatedOutcome: "rate_rejected",
            clock: makeFixedClock(),
            uuidFactory: makeUuidFactory(),
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED);
    });
});

describe("buildExecutionOrderPatch", () => {
    beforeEach(() => {
        resetLiquidityProvidersForTests();
        resetPurchaseExecutionAuditLogForTests();
    });

    it("moves a successful order to transferring with fill metadata", async () => {
        const order = purchasingOrder();
        const result = await executePurchaseWithRetry(order, {
            clock: makeFixedClock("2026-04-23T12:00:00.000Z"),
            uuidFactory: makeUuidFactory(),
        });
        expect(result.ok).toBe(true);
        const patch = buildExecutionOrderPatch(order, result, {
            now: "2026-04-23T12:00:05.000Z",
            actor: "ops-1",
        });
        expect(patch.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING);
        expect(patch.transferringAt).toBe("2026-04-23T12:00:05.000Z");
        expect(patch.executionFillPrice).toBe("0.00002");
        expect(patch.executionFillQuantity).toBe("0.00196000");
        expect(patch.executionFilledAssetCode).toBe("BTC");
        expect(patch.executionProviderId).toBe(LIQUIDITY_PROVIDER_ID.INTERNAL_SIMULATOR);
        expect(patch.executionAttempts).toBe(1);
        expect(patch.lastUpdatedBy).toBe("ops-1");
    });

    it("moves a permanently failed order to failed with supportable failure fields", async () => {
        registerLiquidityProvider("reject", () => ({
            ok: false,
            providerId: "reject",
            errorCode: PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED,
            errorMessage: "venue rejected",
            isRetryable: false,
        }));
        const order = purchasingOrder();
        const result = await executePurchaseWithRetry(order, {
            providerId: "reject",
            clock: makeFixedClock("2026-04-23T12:00:00.000Z"),
            uuidFactory: makeUuidFactory(),
        });
        expect(result.ok).toBe(false);
        const patch = buildExecutionOrderPatch(order, result, {
            now: "2026-04-23T12:00:05.000Z",
            actor: "ops-1",
        });
        expect(patch.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.FAILED);
        expect(patch.failureCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED);
        expect(patch.failureMessage).toBe("venue rejected");
        expect(patch.failedAt).toBe("2026-04-23T12:00:05.000Z");
        expect(patch.executionLastErrorCode).toBe(PURCHASE_EXECUTION_ERROR_CODES.RATE_REJECTED);
        expect(patch.executionAttempts).toBe(1);
    });
});

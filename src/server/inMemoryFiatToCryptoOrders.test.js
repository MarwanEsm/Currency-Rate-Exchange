import {
    __clearInMemoryFiatToCryptoOrdersForTests,
    getFiatToCryptoOrderById,
    listFiatToCryptoOrdersByStatus,
    saveSubmittedFiatToCryptoOrder,
    updateFiatToCryptoOrder,
} from "./inMemoryFiatToCryptoOrders";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "../domain/fiatToCryptoOrder";

const makeOrder = (id, status, updatedAt) => ({
    id,
    userId: "u",
    fiatCurrency: "USD",
    fiatAmount: "10.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    network: "bitcoin_mainnet",
    status,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt,
});

describe("inMemoryFiatToCryptoOrders", () => {
    beforeEach(() => {
        __clearInMemoryFiatToCryptoOrdersForTests();
    });

    it("lists orders by status, sorted by updatedAt", () => {
        saveSubmittedFiatToCryptoOrder(makeOrder("a", FIAT_TO_CRYPTO_ORDER_STATUS.PAID, "2026-04-20T10:10:00.000Z"));
        saveSubmittedFiatToCryptoOrder(makeOrder("b", FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED, "2026-04-20T10:05:00.000Z"));
        saveSubmittedFiatToCryptoOrder(makeOrder("c", FIAT_TO_CRYPTO_ORDER_STATUS.PAID, "2026-04-20T10:02:00.000Z"));

        const paid = listFiatToCryptoOrdersByStatus(FIAT_TO_CRYPTO_ORDER_STATUS.PAID);
        expect(paid.map((o) => o.id)).toEqual(["c", "a"]);
    });

    it("updates an existing order with a patch and preserves other fields", () => {
        saveSubmittedFiatToCryptoOrder(makeOrder("a", FIAT_TO_CRYPTO_ORDER_STATUS.PAID, "2026-04-20T10:10:00.000Z"));
        const updated = updateFiatToCryptoOrder("a", {
            status: FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING,
            purchasingAt: "2026-04-20T11:00:00.000Z",
            updatedAt: "2026-04-20T11:00:00.000Z",
        });
        expect(updated).toBeDefined();
        expect(updated?.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
        expect(updated?.purchasingAt).toBe("2026-04-20T11:00:00.000Z");
        expect(getFiatToCryptoOrderById("a")?.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.PURCHASING);
    });

    it("returns undefined when updating a non-existent order", () => {
        expect(updateFiatToCryptoOrder("missing", { status: "failed" })).toBeUndefined();
    });
});

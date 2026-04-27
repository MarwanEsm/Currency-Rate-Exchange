/**
 * FCX-46 — user-facing order status + notification log.
 */
import { appendOrderProgressNotificationEvents, resetOrderProgressNotificationLogForTests } from "@/domain/fiatToCryptoOrderProgress";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    __clearInMemoryFiatToCryptoOrdersForTests,
    saveSubmittedFiatToCryptoOrder,
} from "@/server/inMemoryFiatToCryptoOrders";
import { handleGetFiatToCryptoOrderForUser } from "@/server/fiatToCryptoUserOrderGet";

const makeRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.payload = payload;
        return res;
    });
    res.setHeader = jest.fn();
    return res;
};

describe("handleGetFiatToCryptoOrderForUser (FCX-46)", () => {
    beforeEach(() => {
        __clearInMemoryFiatToCryptoOrdersForTests();
        resetOrderProgressNotificationLogForTests();
    });

    it("returns 403 when x-user-id does not match order owner", () => {
        saveSubmittedFiatToCryptoOrder({
            id: "ord-46",
            userId: "owner-1",
            fiatCurrency: "USD",
            fiatAmount: "10.00",
            targetAssetCode: "BTC",
            walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            status: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
            createdAt: "2026-04-20T10:00:00.000Z",
            updatedAt: "2026-04-20T10:00:00.000Z",
        });
        const req = {
            method: "GET",
            query: { id: "ord-46" },
            headers: { "x-user-id": "other" },
        };
        const res = makeRes();
        handleGetFiatToCryptoOrderForUser(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns order and notifications for the owner", () => {
        saveSubmittedFiatToCryptoOrder({
            id: "ord-46b",
            userId: "owner-1",
            fiatCurrency: "USD",
            fiatAmount: "10.00",
            targetAssetCode: "BTC",
            walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            status: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
            createdAt: "2026-04-20T10:00:00.000Z",
            updatedAt: "2026-04-20T10:00:00.000Z",
        });
        appendOrderProgressNotificationEvents({
            orderId: "ord-46b",
            userId: "owner-1",
            fromStatus: FIAT_TO_CRYPTO_ORDER_STATUS.SUBMITTED,
            toStatus: FIAT_TO_CRYPTO_ORDER_STATUS.PAID,
            occurredAt: "2026-04-20T11:00:00.000Z",
        });

        const req = {
            method: "GET",
            query: { id: "ord-46b" },
            headers: { "x-user-id": "owner-1" },
        };
        const res = makeRes();
        handleGetFiatToCryptoOrderForUser(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.payload.order.id).toBe("ord-46b");
        expect(Array.isArray(res.payload.notifications)).toBe(true);
        expect(res.payload.notifications.length).toBeGreaterThanOrEqual(1);
        expect(res.payload.notifications.some((n) => n.trigger === "order_payment_confirmed")).toBe(true);
    });
});

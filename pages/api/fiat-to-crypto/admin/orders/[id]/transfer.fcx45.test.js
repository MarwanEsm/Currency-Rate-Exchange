/**
 * FCX-45 — POST transfer (record broadcast, complete, fail).
 */
import { ADMIN_ROLE } from "@/domain/adminPermissions";
import { CRYPTO_TRANSFER_NETWORK_ID } from "@/domain/fiatToCryptoTransfer";
import { FIAT_TO_CRYPTO_ORDER_STATUS } from "@/domain/fiatToCryptoOrder";
import {
    __clearInMemoryFiatToCryptoOrdersForTests,
    getFiatToCryptoOrderById,
    saveSubmittedFiatToCryptoOrder,
} from "@/server/inMemoryFiatToCryptoOrders";
import handler from "./transfer";

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

const transferringOrder = () => ({
    id: "ord-fcx45",
    userId: "user-1",
    fiatCurrency: "USD",
    fiatAmount: "100.00",
    targetAssetCode: "BTC",
    walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    network: CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET,
    status: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
    netCryptoAmount: "0.0015",
    netCryptoAssetCode: "BTC",
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T12:00:00.000Z",
});

describe("POST /api/fiat-to-crypto/admin/orders/[id]/transfer (FCX-45)", () => {
    beforeEach(() => {
        __clearInMemoryFiatToCryptoOrdersForTests();
        saveSubmittedFiatToCryptoOrder(transferringOrder());
    });

    it("returns 403 without record_crypto_transfer permission", async () => {
        const req = {
            method: "POST",
            query: { id: "ord-fcx45" },
            headers: { "x-admin-user-id": "a1", "x-admin-roles": ADMIN_ROLE.READ_ONLY_AUDITOR },
            body: { action: "record_broadcast", txHash: "c".repeat(64) },
        };
        const res = makeRes();
        handler(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("records broadcast then completes order", async () => {
        const headers = {
            "x-admin-user-id": "custody-1",
            "x-admin-roles": ADMIN_ROLE.ORDER_REVIEWER,
        };
        const txHash = "d".repeat(64);

        const res1 = makeRes();
        handler(
            {
                method: "POST",
                query: { id: "ord-fcx45" },
                headers,
                body: { action: "record_broadcast", txHash },
            },
            res1,
        );
        expect(res1.status).toHaveBeenCalledWith(200);
        expect(getFiatToCryptoOrderById("ord-fcx45")?.transferTxHash).toBe(txHash.toLowerCase());

        const res2 = makeRes();
        handler(
            {
                method: "POST",
                query: { id: "ord-fcx45" },
                headers,
                body: { action: "mark_completed", deliveredAssetAmount: "0.0015" },
            },
            res2,
        );
        expect(res2.status).toHaveBeenCalledWith(200);
        expect(getFiatToCryptoOrderById("ord-fcx45")?.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED);
    });
});

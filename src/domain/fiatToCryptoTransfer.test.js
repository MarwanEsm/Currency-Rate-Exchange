import { FIAT_TO_CRYPTO_ORDER_STATUS } from "./fiatToCryptoOrder";
import {
    ASSET_ALLOWED_TRANSFER_NETWORKS,
    buildOrderTransferBroadcastPatch,
    buildTransferBroadcastOrderPatch,
    buildTransferCompletedOrderPatch,
    buildTransferFailedOrderPatch,
    CRYPTO_TRANSFER_ADMIN_ERROR_CODES,
    CRYPTO_TRANSFER_ERROR_CODES,
    CRYPTO_TRANSFER_NETWORK_ID,
    resolveTransferNetwork,
    TRANSFER_FAILURE_EXCEPTION_PATH,
    validateCryptoTransferDestination,
    validateTransferTxHash,
} from "./fiatToCryptoTransfer";

describe("fiatToCryptoTransfer (FCX-21)", () => {
    describe("resolveTransferNetwork", () => {
        it("defaults BTC to bitcoin mainnet when network omitted", () => {
            const r = resolveTransferNetwork("btc", undefined);
            expect(r).toEqual({ ok: true, canonicalNetwork: CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET });
        });

        it("defaults ETH to the single configured network when network omitted", () => {
            const r = resolveTransferNetwork("ETH", "");
            expect(r.ok).toBe(true);
            expect(r.canonicalNetwork).toBe(CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET);
        });

        it("accepts hyphenated network aliases normalized to canonical ids", () => {
            const r = resolveTransferNetwork("BTC", "bitcoin-mainnet");
            expect(r.ok).toBe(true);
            expect(r.canonicalNetwork).toBe(CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET);
        });

        it("rejects unsupported asset", () => {
            const r = resolveTransferNetwork("ZZZFAKE", "bitcoin_mainnet");
            expect(r.ok).toBe(false);
            expect(r.code).toBe(CRYPTO_TRANSFER_ERROR_CODES.UNSUPPORTED_TARGET_ASSET);
        });

        it("rejects wrong network for asset", () => {
            const r = resolveTransferNetwork("BTC", "ethereum_mainnet");
            expect(r.ok).toBe(false);
            expect(r.code).toBe(CRYPTO_TRANSFER_ERROR_CODES.UNSUPPORTED_OR_MISSING_NETWORK);
        });
    });

    describe("validateCryptoTransferDestination", () => {
        it("accepts native segwit BTC on mainnet", () => {
            const r = validateCryptoTransferDestination({
                targetAssetCode: "BTC",
                network: CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET,
                walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            });
            expect(r.ok).toBe(true);
            if (r.ok) expect(r.canonicalNetwork).toBe(CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET);
        });

        it("rejects ETH address for BTC network", () => {
            const r = validateCryptoTransferDestination({
                targetAssetCode: "BTC",
                network: CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET,
                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            });
            expect(r.ok).toBe(false);
            if (!r.ok) {
                expect(r.errors[0].code).toBe(CRYPTO_TRANSFER_ERROR_CODES.INVALID_ADDRESS_FOR_NETWORK);
            }
        });

        it("accepts checksummed Ethereum address", () => {
            const r = validateCryptoTransferDestination({
                targetAssetCode: "ETH",
                network: CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET,
                walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            });
            expect(r.ok).toBe(true);
        });

        it("rejects BTC address for Ethereum mainnet", () => {
            const r = validateCryptoTransferDestination({
                targetAssetCode: "ETH",
                network: CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET,
                walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            });
            expect(r.ok).toBe(false);
        });
    });

    describe("buildOrderTransferBroadcastPatch", () => {
        it("stores hash, canonical network, and broadcast time for order details", () => {
            const patch = buildOrderTransferBroadcastPatch({
                txHash: "0xabc",
                network: CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET,
                broadcastAtIso: "2026-04-19T12:00:00.000Z",
            });
            expect(patch).toEqual({
                transferTxHash: "0xabc",
                transferCanonicalNetwork: CRYPTO_TRANSFER_NETWORK_ID.ETHEREUM_MAINNET,
                transferTxBroadcastAt: "2026-04-19T12:00:00.000Z",
            });
        });
    });

    describe("TRANSFER_FAILURE_EXCEPTION_PATH", () => {
        it("defines rollback/exception guidance for custody", () => {
            expect(TRANSFER_FAILURE_EXCEPTION_PATH.orderStatusPath).toMatch(/transferring/i);
            expect(TRANSFER_FAILURE_EXCEPTION_PATH.custodyActions.length).toBeGreaterThan(0);
            expect(ASSET_ALLOWED_TRANSFER_NETWORKS.BTC).toContain(CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET);
        });
    });

    describe("FCX-45 — custody transfer patches", () => {
        const transferringBtcOrder = () => ({
            id: "ord-tr",
            userId: "u1",
            fiatCurrency: "USD",
            fiatAmount: "100.00",
            targetAssetCode: "BTC",
            walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            network: CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET,
            status: FIAT_TO_CRYPTO_ORDER_STATUS.TRANSFERRING,
            netCryptoAmount: "0.0015",
            netCryptoAssetCode: "BTC",
        });

        it("validateTransferTxHash accepts hex with optional 0x", () => {
            const a = validateTransferTxHash("0xAbCdEf0123456789");
            expect(a.ok).toBe(true);
            if (a.ok) expect(a.normalized).toMatch(/^0x[0-9a-f]+$/);
            const b = validateTransferTxHash("a".repeat(64));
            expect(b.ok).toBe(true);
        });

        it("buildTransferBroadcastOrderPatch records tx + canonical network", () => {
            const r = buildTransferBroadcastOrderPatch(transferringBtcOrder(), {
                txHash: "a".repeat(64),
                actor: "custody-1",
            });
            expect(r.ok).toBe(true);
            if (r.ok) {
                expect(r.patch.transferTxHash).toHaveLength(64);
                expect(r.patch.transferCanonicalNetwork).toBe(CRYPTO_TRANSFER_NETWORK_ID.BITCOIN_MAINNET);
                expect(r.patch.lastUpdatedBy).toBe("custody-1");
            }
        });

        it("buildTransferCompletedOrderPatch requires prior broadcast", () => {
            const noTx = buildTransferCompletedOrderPatch(transferringBtcOrder(), {
                deliveredAssetAmount: "0.0015",
            });
            expect(noTx.ok).toBe(false);

            const withTx = buildTransferCompletedOrderPatch(
                { ...transferringBtcOrder(), transferTxHash: "b".repeat(64) },
                { deliveredAssetAmount: "0.0015" },
            );
            expect(withTx.ok).toBe(true);
            if (withTx.ok) {
                expect(withTx.patch.status).toBe(FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED);
                expect(withTx.patch.deliveredAssetAmount).toBe("0.0015");
            }
        });

        it("buildTransferFailedOrderPatch requires a substantive reason", () => {
            const r = buildTransferFailedOrderPatch(transferringBtcOrder(), { failureMessage: "no" });
            expect(r.ok).toBe(false);
            if (!r.ok) {
                expect(r.errors[0].code).toBe(CRYPTO_TRANSFER_ADMIN_ERROR_CODES.REASON_REQUIRED);
            }
        });
    });
});

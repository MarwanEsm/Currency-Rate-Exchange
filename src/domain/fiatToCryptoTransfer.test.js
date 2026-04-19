import {
    ASSET_ALLOWED_TRANSFER_NETWORKS,
    buildOrderTransferBroadcastPatch,
    CRYPTO_TRANSFER_ERROR_CODES,
    CRYPTO_TRANSFER_NETWORK_ID,
    resolveTransferNetwork,
    TRANSFER_FAILURE_EXCEPTION_PATH,
    validateCryptoTransferDestination,
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
            const r = resolveTransferNetwork("DOGE", "bitcoin_mainnet");
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
});

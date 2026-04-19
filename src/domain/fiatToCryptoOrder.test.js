import {
    FIAT_TO_CRYPTO_ORDER_STATUS,
    FIAT_TO_CRYPTO_ORDER_TRANSITIONS,
    getAllowedFiatToCryptoOrderNextStatuses,
    getFiatToCryptoOrderTransitionOwner,
    isFiatToCryptoOrderStatus,
    isFiatToCryptoOrderTransitionAllowed,
    validateFiatToCryptoOrderDraft,
} from "./fiatToCryptoOrder";

describe("fiatToCryptoOrder (FCX-17)", () => {
    describe("statuses", () => {
        it("defines six canonical statuses", () => {
            expect(Object.keys(FIAT_TO_CRYPTO_ORDER_STATUS)).toHaveLength(6);
        });

        it("isFiatToCryptoOrderStatus accepts only known values", () => {
            expect(isFiatToCryptoOrderStatus("submitted")).toBe(true);
            expect(isFiatToCryptoOrderStatus("paid")).toBe(true);
            expect(isFiatToCryptoOrderStatus("unknown")).toBe(false);
        });
    });

    describe("lifecycle transitions", () => {
        it("has no outgoing transitions from terminal states", () => {
            expect(getAllowedFiatToCryptoOrderNextStatuses(FIAT_TO_CRYPTO_ORDER_STATUS.COMPLETED)).toEqual([]);
            expect(getAllowedFiatToCryptoOrderNextStatuses(FIAT_TO_CRYPTO_ORDER_STATUS.FAILED)).toEqual([]);
        });

        it("allows the happy path chain", () => {
            expect(isFiatToCryptoOrderTransitionAllowed("submitted", "paid")).toBe(true);
            expect(isFiatToCryptoOrderTransitionAllowed("paid", "purchasing")).toBe(true);
            expect(isFiatToCryptoOrderTransitionAllowed("purchasing", "transferring")).toBe(true);
            expect(isFiatToCryptoOrderTransitionAllowed("transferring", "completed")).toBe(true);
        });

        it("disallows skipping intermediate states on the happy path", () => {
            expect(isFiatToCryptoOrderTransitionAllowed("submitted", "purchasing")).toBe(false);
            expect(isFiatToCryptoOrderTransitionAllowed("paid", "transferring")).toBe(false);
        });

        it("exposes ownership for a transition", () => {
            expect(getFiatToCryptoOrderTransitionOwner("submitted", "paid")).toBe("payment_processor");
            expect(getFiatToCryptoOrderTransitionOwner("paid", "purchasing")).toBe("treasury");
            expect(getFiatToCryptoOrderTransitionOwner("purchasing", "transferring")).toBe("custody");
            expect(getFiatToCryptoOrderTransitionOwner("transferring", "completed")).toBe("custody");
        });

        it("lists every transition exactly once in the declarative table", () => {
            expect(FIAT_TO_CRYPTO_ORDER_TRANSITIONS.length).toBeGreaterThanOrEqual(8);
            const keys = new Set(
                FIAT_TO_CRYPTO_ORDER_TRANSITIONS.map((t) => `${t.from}->${t.to}`),
            );
            expect(keys.size).toBe(FIAT_TO_CRYPTO_ORDER_TRANSITIONS.length);
        });
    });

    describe("validateFiatToCryptoOrderDraft", () => {
        const valid = {
            userId: "uid-1",
            fiatCurrency: "USD",
            fiatAmount: "100.00",
            targetAssetCode: "BTC",
            walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        };

        it("returns no errors for a minimal valid draft", () => {
            expect(validateFiatToCryptoOrderDraft(valid)).toEqual([]);
        });

        it("rejects non-objects", () => {
            expect(validateFiatToCryptoOrderDraft(null)[0]).toMatch(/object/i);
        });

        it("requires core identity and payout fields", () => {
            expect(validateFiatToCryptoOrderDraft({ ...valid, userId: "" }).length).toBeGreaterThan(0);
            expect(validateFiatToCryptoOrderDraft({ ...valid, fiatCurrency: "" }).length).toBeGreaterThan(0);
            expect(validateFiatToCryptoOrderDraft({ ...valid, fiatAmount: "" }).length).toBeGreaterThan(0);
            expect(validateFiatToCryptoOrderDraft({ ...valid, targetAssetCode: "" }).length).toBeGreaterThan(0);
            expect(validateFiatToCryptoOrderDraft({ ...valid, walletAddress: "" }).length).toBeGreaterThan(0);
        });

        it("validates fiat amount format and sign", () => {
            expect(validateFiatToCryptoOrderDraft({ ...valid, fiatAmount: "abc" }).some((e) => /fiatAmount/i.test(e))).toBe(
                true,
            );
            expect(validateFiatToCryptoOrderDraft({ ...valid, fiatAmount: "0" }).some((e) => /greater than zero/i.test(e))).toBe(
                true,
            );
        });

        it("validates wallet address length bounds", () => {
            expect(validateFiatToCryptoOrderDraft({ ...valid, walletAddress: "short" }).length).toBeGreaterThan(0);
        });

        it("requires network to be a string when present", () => {
            expect(validateFiatToCryptoOrderDraft({ ...valid, network: 123 }).length).toBeGreaterThan(0);
        });
    });
});

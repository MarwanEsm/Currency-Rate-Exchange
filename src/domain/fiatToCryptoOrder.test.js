import {
    FIAT_TO_CRYPTO_ORDER_REQUIRED_DRAFT_FIELDS,
    FIAT_TO_CRYPTO_ORDER_STATUS,
    FIAT_TO_CRYPTO_ORDER_TRANSITIONS,
    getAllowedFiatToCryptoOrderNextStatuses,
    getFiatToCryptoOrderTransitionOwner,
    isFiatToCryptoOrderStatus,
    isFiatToCryptoOrderTransitionAllowed,
    validateFiatToCryptoOrderDraft,
} from "./fiatToCryptoOrder";

describe("fiatToCryptoOrder (FCX-17, FCX-38)", () => {
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

    describe("FCX-38 (lifecycle, model, validation contract)", () => {
        it("defines the six operational statuses from submission through fulfillment", () => {
            expect(new Set(Object.values(FIAT_TO_CRYPTO_ORDER_STATUS))).toEqual(
                new Set(["submitted", "paid", "purchasing", "transferring", "completed", "failed"]),
            );
        });

        it("documents required draft fields for create/submit validation", () => {
            expect(FIAT_TO_CRYPTO_ORDER_REQUIRED_DRAFT_FIELDS).toEqual([
                "userId",
                "fiatCurrency",
                "fiatAmount",
                "targetAssetCode",
                "walletAddress",
            ]);
            const partial = {
                userId: "u",
                fiatCurrency: "USD",
                fiatAmount: "10",
                targetAssetCode: "BTC",
            };
            const errs = validateFiatToCryptoOrderDraft(partial);
            expect(errs.some((e) => /walletAddress/i.test(e))).toBe(true);
        });

        it("every non-terminal status has at least one documented transition", () => {
            const nonTerminal = Object.values(FIAT_TO_CRYPTO_ORDER_STATUS).filter(
                (s) => s !== "completed" && s !== "failed",
            );
            for (const s of nonTerminal) {
                expect(FIAT_TO_CRYPTO_ORDER_TRANSITIONS.some((t) => t.from === s)).toBe(true);
            }
        });
    });
});

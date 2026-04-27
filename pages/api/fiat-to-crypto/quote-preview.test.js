/**
 * @jest-environment node
 */

import handler from "./quote-preview";

jest.mock("@/services/exchangeRateProvider", () => ({
    getExchangeRates: jest.fn(),
}));

import { getExchangeRates } from "@/services/exchangeRateProvider";

describe("GET /api/fiat-to-crypto/quote-preview", () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const setHeader = jest.fn();
    const res = { status, setHeader };

    beforeEach(() => {
        json.mockReset();
        status.mockImplementation(() => ({ json }));
        setHeader.mockReset();
        getExchangeRates.mockReset();
    });

    it("returns 400 when params invalid", async () => {
        await handler({ method: "GET", query: {} }, res);
        expect(status).toHaveBeenCalledWith(400);
    });

    it("returns 200 with quote when provider has rate", async () => {
        getExchangeRates.mockResolvedValue({
            base: "USD",
            fetchedAt: "2026-01-01T00:00:00.000Z",
            rates: { BTC: "0.00002" },
        });
        await handler(
            { method: "GET", query: { fiatCurrency: "USD", fiatAmount: "100", targetAssetCode: "BTC" } },
            res,
        );
        expect(status).toHaveBeenCalledWith(200);
        const body = json.mock.calls[0][0];
        expect(body.indicative).toBe(true);
        expect(body.quote.netCryptoAmount).toBeDefined();
        expect(body.providerSpotCryptoPerFiat).toBe("0.00002");
    });

    it("returns 404 when asset rate missing", async () => {
        getExchangeRates.mockResolvedValue({
            base: "USD",
            fetchedAt: "2026-01-01T00:00:00.000Z",
            rates: { EUR: "0.9" },
        });
        await handler(
            { method: "GET", query: { fiatCurrency: "USD", fiatAmount: "100", targetAssetCode: "BTC" } },
            res,
        );
        expect(status).toHaveBeenCalledWith(404);
    });
});

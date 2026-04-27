import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/firebase/authContext", () => {
    const R = require("react");
    return {
        AuthContext: R.createContext({ user: null, isAuthenticated: false, logout: jest.fn() }),
    };
});

jest.mock("next/router", () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

import { AuthContext } from "@/firebase/authContext";
import FiatToCryptoRequestForm from "./FiatToCryptoRequestForm";

const authOk = {
    user: { uid: "user-intake-1" },
    isAuthenticated: true,
    logout: jest.fn(),
};

const renderWithAuth = (value = authOk) =>
    render(
        <AuthContext.Provider value={value}>
            <FiatToCryptoRequestForm />
        </AuthContext.Provider>,
    );

const validBtcAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

describe("FiatToCryptoRequestForm (FCX-40)", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    it("when logged in, renders quote fields and buy form (wallet + submit)", () => {
        renderWithAuth();
        expect(screen.getByLabelText("Fiat amount for quote")).toBeInTheDocument();
        expect(screen.getByLabelText("Crypto asset for quote")).toBeInTheDocument();
        expect(screen.getByLabelText("Destination wallet address")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /submit buy request/i })).toBeInTheDocument();
    });

    it("when guest, shows rate check only — no wallet or submit", () => {
        renderWithAuth({ user: null, isAuthenticated: false, logout: jest.fn() });
        expect(screen.getByLabelText("Fiat amount for quote")).toBeInTheDocument();
        expect(screen.queryByLabelText("Destination wallet address")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /submit buy request/i })).not.toBeInTheDocument();
    });

    it("blocks submission with the same client validation as the server when the amount is invalid", async () => {
        renderWithAuth();
        await userEvent.type(screen.getByLabelText("Fiat amount for quote"), "not-a-number");
        await userEvent.type(screen.getByLabelText("Destination wallet address"), validBtcAddress);
        await userEvent.click(screen.getByRole("button", { name: /submit buy request/i }));
        expect(global.fetch).not.toHaveBeenCalled();
        expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("submits to the API and shows the request reference on success (submitted order)", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({
                order: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "submitted",
                    targetAssetCode: "BTC",
                    fiatAmount: "100.00",
                    fiatCurrency: "USD",
                },
            }),
        });

        renderWithAuth();
        await userEvent.type(screen.getByLabelText("Fiat amount for quote"), "100.00");
        await userEvent.type(screen.getByLabelText("Destination wallet address"), validBtcAddress);
        await userEvent.click(screen.getByRole("button", { name: /submit buy request/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/fiat-to-crypto/orders",
                expect.objectContaining({ method: "POST" }),
            );
        });
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.userId).toBe("user-intake-1");
        expect(body.fiatAmount).toBe("100.00");
        expect(body.kycVerificationStatus).toBe("verified");

        expect(await screen.findByTestId("order-reference")).toHaveTextContent("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        const confirm = screen.getByLabelText("Order confirmation");
        expect(confirm).toHaveTextContent("submitted");
    });

    it("loads indicative quote without login when Check indicative quote is used", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                indicative: true,
                disclaimer: "Indicative only.",
                fiatAmount: "50.00",
                fiatCurrency: "USD",
                targetAssetCode: "BTC",
                providerSpotCryptoPerFiat: "0.00002",
                quote: {
                    netCryptoAmount: "0.001",
                    netCryptoAssetCode: "BTC",
                    feeFiatAmount: "1.00",
                },
            }),
        });

        renderWithAuth({ user: null, isAuthenticated: false, logout: jest.fn() });
        await userEvent.type(screen.getByLabelText("Fiat amount for quote"), "50.00");
        await userEvent.click(screen.getByRole("button", { name: /check indicative quote/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
            expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/fiat-to-crypto\/quote-preview\?/);
        });
        expect(await screen.findByText(/Indicative only/i)).toBeInTheDocument();
    });
});

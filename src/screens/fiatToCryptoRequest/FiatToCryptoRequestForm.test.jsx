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

    it("renders fields for fiat amount, asset, and destination address", () => {
        renderWithAuth();
        expect(screen.getByLabelText("Fiat amount")).toBeInTheDocument();
        expect(screen.getByLabelText("Crypto asset")).toBeInTheDocument();
        expect(screen.getByLabelText("Destination wallet address")).toBeInTheDocument();
    });

    it("blocks submission with the same client validation as the server when the amount is invalid", async () => {
        renderWithAuth();
        await userEvent.type(screen.getByLabelText("Fiat amount"), "not-a-number");
        await userEvent.type(screen.getByLabelText("Destination wallet address"), validBtcAddress);
        await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
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
        await userEvent.type(screen.getByLabelText("Fiat amount"), "100.00");
        await userEvent.type(screen.getByLabelText("Destination wallet address"), validBtcAddress);
        await userEvent.click(screen.getByRole("button", { name: /submit request/i }));

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

    it("does not call the API when the user is not logged in", async () => {
        renderWithAuth({ user: null, isAuthenticated: false, logout: jest.fn() });
        await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { EXCHANGE_RATE_ERROR_CODES } from "@/services/exchangeRateProvider";

jest.mock("@/firebase/authContext", () => ({
    AuthContext: React.createContext({
        logout: jest.fn(),
        isAuthenticated: false,
    }),
}));

jest.mock("axios");

import CurrenciesList from "./CurrenciesList";

const mockUseExchangeRates = jest.fn();

jest.mock("@/utils/useExchangeRates", () => ({
    __esModule: true,
    default: (...args) => mockUseExchangeRates(...args),
}));

jest.mock("next/router", () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

describe("CurrenciesList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({
            data: {
                data: [
                    { id: "USD", name: "US Dollar" },
                    { id: "EUR", name: "Euro" },
                ],
            },
        });
        mockUseExchangeRates.mockReturnValue({ numericRate: null, providerError: null });
    });

    it("exposes the amount input with an accessible label", async () => {
        render(<CurrenciesList />);

        expect(await screen.findByLabelText("Amount")).toBeInTheDocument();
    });

    it("exposes the exchange rate region as a labelled group", async () => {
        render(<CurrenciesList />);

        expect(await screen.findByRole("group", { name: "Exchange Rate" })).toBeInTheDocument();
    });

    it("shows a provider error next to the rate when the hook reports a failure", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from && to) {
                return {
                    numericRate: null,
                    providerError: { code: EXCHANGE_RATE_ERROR_CODES.NETWORK },
                };
            }
            return { numericRate: null, providerError: null };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));

        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        await waitFor(() => {
            expect(mockUseExchangeRates).toHaveBeenCalledWith("USD", "EUR");
        });

        expect(
            await screen.findByText(/unable to reach the exchange rate provider/i),
        ).toBeInTheDocument();
    });
});

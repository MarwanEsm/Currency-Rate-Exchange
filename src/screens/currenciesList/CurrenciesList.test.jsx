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
const retryRatesMock = jest.fn();

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
        mockUseExchangeRates.mockReturnValue({
            numericRate: null,
            providerError: null,
            isLoading: false,
            fetchedAt: null,
            retryRates: retryRatesMock,
        });
    });

    it("exposes the amount input with an accessible label", async () => {
        render(<CurrenciesList />);

        expect(await screen.findByLabelText("Amount")).toBeInTheDocument();
    });

    it("exposes the exchange rate region as a labelled group", async () => {
        render(<CurrenciesList />);

        expect(await screen.findByRole("group", { name: /exchange rate/i })).toBeInTheDocument();
    });

    it("shows a provider error next to the rate when the hook reports a failure", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from && to) {
                return {
                    numericRate: null,
                    providerError: { code: EXCHANGE_RATE_ERROR_CODES.NETWORK },
                    isLoading: false,
                    fetchedAt: null,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                retryRates: retryRatesMock,
            };
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

    it("provides retry affordance and calls retry action on click", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from && to) {
                return {
                    numericRate: null,
                    providerError: { code: EXCHANGE_RATE_ERROR_CODES.NETWORK },
                    isLoading: false,
                    fetchedAt: null,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

        expect(retryRatesMock).toHaveBeenCalledTimes(1);
    });

    it("shows a formatted pair rate and last-updated time when data is ready", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.912345,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: "2026-04-19T14:00:00.000Z",
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));

        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        expect(await screen.findByText(/1 USD = 0[,.]912345 EUR/)).toBeInTheDocument();
        expect(screen.getByText(/rates updated/i)).toBeInTheDocument();
        expect(screen.queryByText(/^As of/i)).not.toBeInTheDocument();
        expect(screen.getByRole("group", { name: /as of/i })).toBeInTheDocument();
    });

    it("shows a friendly amount validation message when Convert is pressed with no amount", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 2,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        expect(screen.getByRole("button", { name: "Convert" })).not.toBeDisabled();
        await userEvent.click(screen.getByRole("button", { name: "Convert" }));

        expect(
            await screen.findByText(/enter a whole number amount/i),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true");
    });

    it("shows a Stale rate badge and a Refresh rate button when the hook reports isStale=true", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.915,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: "2026-04-19T14:00:00.000Z",
                    ageMs: 5 * 60 * 1000,
                    isStale: true,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        expect(await screen.findByTestId("stale-rate-badge")).toHaveTextContent(/stale rate/i);
        expect(screen.getByRole("group", { name: /stale rate/i })).toBeInTheDocument();
        expect(screen.getByText(/rates updated 5m ago/i)).toBeInTheDocument();

        const refreshButton = screen.getByRole("button", { name: /refresh rate/i });
        await userEvent.click(refreshButton);
        expect(retryRatesMock).toHaveBeenCalledTimes(1);
    });

    it("does not show a Stale rate badge when the hook reports fresh data", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.915,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: "2026-04-19T14:00:00.000Z",
                    ageMs: 2_000,
                    isStale: false,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        await screen.findByText(/1 USD = 0[.,]915 EUR/);
        expect(screen.queryByTestId("stale-rate-badge")).toBeNull();
        expect(screen.queryByRole("button", { name: /refresh rate/i })).toBeNull();
    });

    it("triggers conversion when Enter is pressed in the amount field (FCX-32)", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.5,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    ageMs: null,
                    isStale: false,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        const amountInput = screen.getByLabelText("Amount");
        expect(amountInput).toHaveAttribute("aria-keyshortcuts", "Enter");

        await userEvent.type(amountInput, "10");
        await userEvent.keyboard("{Enter}");

        expect(screen.getByRole("button", { name: /5[.,]00\s+EUR/ })).toBeInTheDocument();
    });

    it("Enter does nothing when Convert is disabled (no pair / invalid state) (FCX-32)", async () => {
        render(<CurrenciesList />);

        await screen.findByLabelText("Amount");
        const amountInput = screen.getByLabelText("Amount");
        await userEvent.click(amountInput);
        await userEvent.keyboard("{Enter}");

        expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
        expect(screen.queryByText(/enter a whole number amount/i)).toBeNull();
    });

    it("strips non-digit input so neighboring digits stay valid (FCX-32)", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 2,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    ageMs: null,
                    isStale: false,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        const amountInput = screen.getByLabelText("Amount");
        await userEvent.type(amountInput, "1a-.0");

        expect(amountInput.value).toMatch(/^10$/);

        await userEvent.click(screen.getByRole("button", { name: "Convert" }));
        expect(screen.getByRole("button", { name: /20[.,]00\s+EUR/ })).toBeInTheDocument();
    });

    it("ignores fully invalid amount input — Convert with no digits surfaces validation, no result (FCX-32)", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 2,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    ageMs: null,
                    isStale: false,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        const amountInput = screen.getByLabelText("Amount");
        await userEvent.type(amountInput, "abc.-");
        expect(amountInput.value).toBe("");

        await userEvent.click(screen.getByRole("button", { name: "Convert" }));
        expect(
            await screen.findByText(/enter a whole number amount/i),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /EUR/ })).toBeNull();
    });

    it("rounds to two decimals using half-up at the precision boundary (FCX-32)", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.005,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    ageMs: null,
                    isStale: false,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                ageMs: null,
                isStale: false,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        await userEvent.type(screen.getByLabelText("Amount"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Convert" }));

        expect(screen.getByRole("button", { name: /0[.,]01\s+EUR/ })).toBeInTheDocument();
    });

    it("shows a rounded two-decimal converted total after Convert", async () => {
        mockUseExchangeRates.mockImplementation((from, to) => {
            if (from === "USD" && to === "EUR") {
                return {
                    numericRate: 0.915,
                    providerError: null,
                    isLoading: false,
                    fetchedAt: null,
                    retryRates: retryRatesMock,
                };
            }
            return {
                numericRate: null,
                providerError: null,
                isLoading: false,
                fetchedAt: null,
                retryRates: retryRatesMock,
            };
        });

        render(<CurrenciesList />);

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("US Dollar"));
        await userEvent.click(screen.getByLabelText("Select target currency"));
        await userEvent.click(await screen.findByText("Euro"));

        await userEvent.type(screen.getByLabelText("Amount"), "10");
        await userEvent.click(screen.getByRole("button", { name: "Convert" }));

        expect(screen.getByRole("button", { name: /9[.,]15\s+EUR/ })).toBeInTheDocument();
    });
});

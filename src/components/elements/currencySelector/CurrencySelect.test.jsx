import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import CurrencySelect from "./CurrencySelect";

jest.mock("axios");

const CURRENCIES_URL = "https://api.coinbase.com/v2/currencies";

const mockCurrencies = () => {
    axios.get.mockResolvedValue({
        data: {
            data: [
                { id: "USD", name: "US Dollar" },
                { id: "EUR", name: "Euro" },
                { id: "GBP", name: "British Pound" },
            ],
        },
    });
};

describe("CurrencySelect (FCX-30)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCurrencies();
    });

    test("dropdown is reachable by its accessible label (sr-only <label htmlFor>)", async () => {
        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={jest.fn()}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        const input = await screen.findByLabelText("Select source currency");
        expect(input).toBeInTheDocument();
        expect(input.id).toBe("from-currency");
    });

    test("renders without an associated <label> when label or inputId are missing", async () => {
        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="Pick"
                onCurrencySelect={jest.fn()}
                value={null}
            />,
        );

        await waitFor(() => expect(axios.get).toHaveBeenCalledWith(CURRENCIES_URL, expect.any(Object)));
        expect(screen.queryByLabelText("Pick")).toBeNull();
    });

    test("invokes onCurrencySelect with the picked option when user selects a currency", async () => {
        const onCurrencySelect = jest.fn();
        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={onCurrencySelect}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        await userEvent.click(await screen.findByText("Euro"));

        expect(onCurrencySelect).toHaveBeenCalledWith(
            expect.objectContaining({ value: "EUR", label: "Euro" }),
            expect.anything(),
        );
    });

    test("can be opened and a value selected entirely from the keyboard", async () => {
        const onCurrencySelect = jest.fn();
        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={onCurrencySelect}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        const input = await screen.findByLabelText("Select source currency");
        input.focus();
        expect(input).toHaveFocus();

        await userEvent.type(input, "Eu");
        await screen.findByText("Euro");
        await userEvent.keyboard("{Enter}");

        await waitFor(() =>
            expect(onCurrencySelect).toHaveBeenCalledWith(
                expect.objectContaining({ value: "EUR" }),
                expect.anything(),
            ),
        );
    });

    test("filters out the disabled value (source currency) from the menu", async () => {
        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="To"
                onCurrencySelect={jest.fn()}
                value={null}
                disabledValue="USD"
                inputId="to-currency"
                label="Select target currency"
            />,
        );

        await userEvent.click(await screen.findByLabelText("Select target currency"));

        await screen.findByText("Euro");
        expect(screen.queryByText("US Dollar")).toBeNull();
    });

    test("acts as a controlled component — reflects the `value` prop", async () => {
        const { rerender } = render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={jest.fn()}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        await screen.findByLabelText("Select source currency");
        expect(screen.queryByText("Euro")).toBeNull();

        rerender(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={jest.fn()}
                value={{ value: "EUR", label: "Euro" }}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        expect(await screen.findByText("Euro")).toBeInTheDocument();
    });

    test("aborts the in-flight currency fetch when unmounted (cleanup)", async () => {
        const abortSpy = jest.spyOn(AbortController.prototype, "abort");

        const { unmount } = render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={jest.fn()}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        unmount();
        expect(abortSpy).toHaveBeenCalled();
        abortSpy.mockRestore();
    });

    test("renders an empty option list when the currency endpoint fails", async () => {
        axios.get.mockRejectedValueOnce(new Error("network down"));
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        render(
            <CurrencySelect
                url={CURRENCIES_URL}
                placeholder="From"
                onCurrencySelect={jest.fn()}
                value={null}
                inputId="from-currency"
                label="Select source currency"
            />,
        );

        await userEvent.click(await screen.findByLabelText("Select source currency"));
        expect(await screen.findByText(/no options/i)).toBeInTheDocument();
        errorSpy.mockRestore();
    });
});

import { fireEvent, render, screen } from "@testing-library/react";
import Converter from "@/components/elements/converter/Converter";

jest.mock("@/utils/useExchangeRates", () => ({
    __esModule: true,
    default: () => ({
        numericRate: 2,
    }),
}));

describe("Converter", () => {
    it("converts typed amount using fetched exchange rate", () => {
        render(<Converter searchedCurrency="EUR" fromCurrencyCode="USD" />);

        fireEvent.change(screen.getByLabelText("Amount to convert"), { target: { value: "10" } });
        fireEvent.click(screen.getByRole("button", { name: "Convert" }));

        expect(screen.getByRole("status")).toHaveTextContent("20.00");
    });
});

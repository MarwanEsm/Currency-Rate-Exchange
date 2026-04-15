import React, { useState } from "react";
import Button from "../button/Button";
import useExchangeRates from "../../../utils/useExchangeRates";
import styles from "./Converter.module.scss"

const Converter = ({ searchedCurrency, fromCurrencyCode = "USD" }) => {
    const [fromAmount, setFromAmount] = useState("");
    const [convertedAmount, setConvertedAmount] = useState("");
    const { numericRate } = useExchangeRates(fromCurrencyCode, searchedCurrency);

    const updateInputValue = (event) => {
        setFromAmount(event.target.value);
    };

    const convert = () => {
        const amount = Number.parseFloat(fromAmount);
        if (!Number.isFinite(amount) || numericRate === null) {
            setConvertedAmount("");
            return;
        }

        setConvertedAmount((amount * numericRate).toFixed(2));
    };

    const isConvertDisabled =
        fromAmount.trim() === "" || searchedCurrency === null || searchedCurrency === undefined || numericRate === null;

    return (
        <div className={styles.container}>

            <div className="input-group">
                <label htmlFor="converter-amount-input">Amount to convert</label>
                <input
                    id="converter-amount-input"
                    type="number"
                    className="form-control"
                    value={fromAmount}
                    onChange={updateInputValue}
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    aria-describedby="converter-result"
                />
            </div>

            <Button type="button" onClick={convert} disabled={isConvertDisabled}>
                Convert
            </Button>


            <div className="input-group">
                <p id="converter-result" role="status" aria-live="polite">{convertedAmount}</p>
            </div>
        </div>


    );
}



export default Converter;

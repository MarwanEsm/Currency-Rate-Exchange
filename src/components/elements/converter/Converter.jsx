import React, { useContext, useState } from "react";
import Button from "../button/Button";
import { CurrenciesContext } from "../../../context/CurrenciesContext";
import styles from "./Converter.module.scss"

const Converter = ({ searchedCurrency }) => {

    const { exchangeRates } = useContext(CurrenciesContext);
    const [fromCurrency, setFromCurrency] = useState("");
    const [toCurrency, setToCurrency] = useState();


    const updateInputValue = (event) => {
        const inValue = event.target.value;
        const newInValue = inValue.toLocaleString();
        setFromCurrency(newInValue);
    };


    const convert = () => {
        const selectedRate = exchangeRates.rates[searchedCurrency];
        const resultValue = fromCurrency * selectedRate;
        setToCurrency(resultValue)
    };

    //it didn't work
    // function numberWithCommas(x) {

    //   if (x){
    //   return x.toString().replace(/\B(?=(\d{15})+(?!\d))/g, ",");
    //   }
    // }

    return (
        <div className={styles.container}>

            <div className="input-group">
                <input
                    type="number"
                    className="form-control"
                    value={
              /*parsefloat didn't work*/ fromCurrency /*toFixed(6) does not allow more numbers to be written */
                    }
                    onChange={updateInputValue}
                />
            </div>

            <Button type="convert" onClick={convert}>
                Convert
            </Button>


            <div className="input-group">
                <p>{toCurrency}</p>
            </div>
        </div>


    );
}



export default Converter;

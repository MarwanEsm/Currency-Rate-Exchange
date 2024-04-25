import React, { useContext } from "react";
import { CurrenciesContext } from "../../context/CurrenciesContext";
import styles from "./ListOfCurrencies.module.scss"


//TODO: change all function to arrow functions
const ListOfCurrencies = ({ onCurrencySelect }) => {

    const { currencies } = useContext(CurrenciesContext);

    return (
        <div className={styles.container}>
            <select
                onChange={(e) => onCurrencySelect(e.target.value)}
                className="browser-default custom-select"
            >
                {currencies &&
                    currencies.map((currency) =>
                        <option key={currency.id} value={currency.id}>
                            {currency.id}
                        </option>
                    )}
            </select>
        </div>
    );
}






export default ListOfCurrencies;

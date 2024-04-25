import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CurrenciesContext } from "../../context/CurrenciesContext";
import styles from "./ListOfCurrencies.module.scss"

//TODO: change all function to arrow functions
const ListOfCurrencies = () => {

    const { currencies } = useContext(CurrenciesContext);

    const navigate = useNavigate();

    const handleChange = (e) => {
        navigate(`/currencies/${e.target.value}`);
        e.preventDefault();
    }

    return (
        <div className={styles.container}>

            <h2>Please choose a currency</h2>

            <select
                onChange={handleChange}
                className="browser-default custom-select"
            >
                {currencies &&
                    currencies.map((currency) => {
                        return (
                            <option key={currency.id} value={currency.id}>
                                {currency.id}
                            </option>
                        );
                    })}
            </select>
        </div>
    );
}






export default ListOfCurrencies;

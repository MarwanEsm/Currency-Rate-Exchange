import React, { useEffect, useContext, useState } from "react";
import { CurrenciesContext } from "../../context/CurrenciesContext";
import styles from "./ListOfCurrencies.module.scss";
import AsyncSelect from "react-select";
import axios from "axios";

const ListOfCurrencies = ({ onCurrencySelect }) => {
    const [options, setOptions] = useState(null);

    const loadCurrencies = () => {
        axios.get("https://api.coinbase.com/v2/currencies")
            .then(response => {
                if (response.data) {
                    setOptions(response.data.data.map(currency => ({ value: currency.id, label: currency.name })));
                }
            })
            .catch(error => {
                console.error("Error fetching currencies:", error);
            });
    };

    useEffect(() => {
        loadCurrencies();
    }, []);

    return (
        <div className={styles.container}>
            <AsyncSelect
                options={options}
                onChange={onCurrencySelect}
                className={styles.select}
                placeholder="Select a currency"
            />
        </div>
    );
};

export default ListOfCurrencies;

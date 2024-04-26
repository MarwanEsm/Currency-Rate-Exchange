import React, { useEffect, useState } from "react";
import styles from "./CurrencySelect.module.scss"
import AsyncSelect from "react-select";
import axios from "axios";

const CurrencySelect = ({ onCurrencySelect, url }) => {
    const [options, setOptions] = useState(null);

    const loadCurrencies = () => {
        axios.get(url)
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
                options={options !== null ? options : []}
                onChange={onCurrencySelect}
                className={styles.select}
                placeholder="From Currency"
            />
        </div>
    );
};

export default CurrencySelect;

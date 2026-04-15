import React, { useEffect, useState } from "react";
import styles from "./CurrencySelect.module.scss";
import Select from "react-select";
import axios from "axios";

const CurrencySelect = ({ onCurrencySelect, url, placeholder, value, disabledValue, inputId, label }) => {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        const controller = new AbortController();
        let isMounted = true;

        const loadCurrencies = async () => {
            try {
                const response = await axios.get(url, { signal: controller.signal });
                const mappedOptions = response?.data?.data?.map((currency) => ({
                    value: currency.id,
                    label: currency.name,
                })) ?? [];

                if (isMounted) {
                    setOptions(mappedOptions);
                }
            } catch (error) {
                if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
                if (isMounted) {
                    setOptions([]);
                }
                console.error("Error fetching currencies:", error);
            }
        };

        loadCurrencies();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [url]);

    return (
        <div className={styles.container}>
            {label && inputId && (
                <label htmlFor={inputId} className={styles.srOnly}>{label}</label>
            )}
            <Select
                options={options}
                onChange={onCurrencySelect}
                isOptionDisabled={disabledValue ? (option) => option.value === disabledValue : undefined}
                className={styles.select}
                placeholder={placeholder}
                menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                value={value}
                menuPosition="fixed"
                inputId={inputId}
            />
        </div>
    );
};

export default CurrencySelect;

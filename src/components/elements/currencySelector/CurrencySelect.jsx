import React, { useEffect, useState } from "react";
import styles from "./CurrencySelect.module.scss"
import AsyncSelect from "react-select";
import axios from "axios";

const CurrencySelect = ({ onCurrencySelect, url, placeholder, value }) => {
    const [options, setOptions] = useState(null);

    const loadCurrencies = async (signal, onSuccess) => {
        await axios.get(url, { signal })
            .then(response => {
                if (response.data) {
                    onSuccess(response.data.data.map(currency => ({ value: currency.id, label: currency.name })));
                }
            })
            .catch(error => {
                if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
                console.error("Error fetching currencies:", error);
            });
    };

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        loadCurrencies(controller.signal, (loadedOptions) => {
            if (isMounted) {
                setOptions(loadedOptions);
            }
        });

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [url]);

    return (
        <div className={styles.container}>
            <AsyncSelect
                options={options !== null ? options : []}
                onChange={onCurrencySelect}
                className={styles.select}
                placeholder={placeholder}
                menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                value={value}
                menuPosition="fixed"
            />
        </div>
    );
};

export default CurrencySelect;

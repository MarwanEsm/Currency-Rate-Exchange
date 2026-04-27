import React, { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import styles from "./CurrencySelect.module.scss";
import Select, { createFilter } from "react-select";
import axios from "axios";

const defaultStringFilter = createFilter({ stringify: (option) => `${option.label} ${option.value}` });

const CurrencySelect = ({ onCurrencySelect, url, placeholder, value, disabledValue, inputId, label }) => {
    const [options, setOptions] = useState([]);

    const filterOption = useMemo(() => {
        if (!disabledValue) return undefined;
        return (option, rawInput) => {
            if (option.value === disabledValue) return false;
            return defaultStringFilter(option, rawInput);
        };
    }, [disabledValue]);

    const selectClassNames = useMemo(
        () => ({
            container: () => styles.rsContainer,
            control: ({ isFocused, isDisabled }) =>
                classNames(
                    styles.rsControl,
                    isFocused && styles.rsControlFocused,
                    isDisabled && styles.rsControlDisabled,
                ),
            valueContainer: () => styles.rsValueContainer,
            singleValue: () => styles.rsSingleValue,
            placeholder: () => styles.rsPlaceholder,
            input: () => styles.rsInput,
            indicatorsContainer: () => styles.rsIndicatorsContainer,
            indicatorSeparator: () => styles.rsIndicatorSeparator,
            dropdownIndicator: () => styles.rsDropdownIndicator,
            clearIndicator: () => styles.rsClearIndicator,
            menu: () => styles.rsMenu,
            menuPortal: () => styles.rsMenuPortal,
            menuList: () => styles.rsMenuList,
            option: ({ isFocused, isSelected, isDisabled }) =>
                classNames(
                    styles.rsOption,
                    isFocused && styles.rsOptionFocused,
                    isSelected && styles.rsOptionSelected,
                    isDisabled && styles.rsOptionDisabled,
                ),
            loadingMessage: () => styles.rsLoadingMessage,
            noOptionsMessage: () => styles.rsNoOptionsMessage,
        }),
        [],
    );

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
                unstyled
                classNames={selectClassNames}
                options={options}
                onChange={onCurrencySelect}
                isOptionDisabled={disabledValue ? (option) => option.value === disabledValue : undefined}
                filterOption={filterOption}
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

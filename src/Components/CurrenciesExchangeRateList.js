import React, { createContext, useState, useEffect } from "react";

const initContextCurrenciesExchangeRate = { currenciesExchangeRateList: [] };
export const CurrenciesExchangeRateContext = createContext(
  initContextCurrenciesExchangeRate
);

export const CurrenciesExchangeRateProvider = ({ children }) => {
  const [
    currenciesExchangeRateList,
    setCurrenciesExchangeRateList,
  ] = useState();
  useEffect(() => {}, []);

  const fetchData = async () => {
    const response = await fetch("https://api.coinbase.com/v2/exchange-rates?");
    const data = await response.json();
    setCurrenciesExchangeRateList(data.data);
  };
  return (
    <CurrenciesExchangeRateContext.Provider value={currenciesExchangeRateList}>
      {children}
    </CurrenciesExchangeRateContext.Provider>
  );
};

export default CurrenciesExchangeRateProvider;

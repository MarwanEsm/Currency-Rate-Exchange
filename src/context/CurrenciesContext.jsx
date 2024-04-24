import React, { createContext, useState, useEffect } from "react";


const intiContext = {
  currencies: [],
  exchangeRates: [],
};

export const CurrenciesContext = createContext(intiContext);
export const ExchangeRatesContext = createContext(intiContext);

export const CurrenciesContextProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState();
  const [exchangeRates, setExchangeRates] = useState();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const response = await fetch("https://api.coinbase.com/v2/currencies");
    const data = await response.json();
    setCurrencies(data.data);
  };

  const fetchExchangeRate = async (id) => {
    const response = await fetch(
      `https://api.coinbase.com/v2/exchange-rates?currency=${id}`
    );
    const data = await response.json();
    setExchangeRates(data.data);
  };

  return (
    <CurrenciesContext.Provider value={{ currencies, exchangeRates, fetchExchangeRate }}>
      {children}
    </CurrenciesContext.Provider>
  );
};

export default CurrenciesContextProvider;

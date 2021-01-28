import React, { createContext, useState, useEffect } from "react";


const intiContext = {
  currencies: [],
  exchangeRate:[],
};

export const CurrenciesContext = createContext(intiContext);
export const ExchangeRateContext = createContext(intiContext);

export const CurrenciesContextProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState();
  const [exchangeRate, setExchangeRate] = useState();

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
    console.log(data)
    setExchangeRate(data.data);
  };

  return (
    <CurrenciesContext.Provider value={{ currencies, exchangeRate, fetchExchangeRate }}>
      {children}
    </CurrenciesContext.Provider>
  );
};

export default CurrenciesContextProvider;

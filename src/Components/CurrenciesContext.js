import React, { createContext, useState, useEffect } from "react";


const intiContext = {
  currencies: [],
};

export const CurrenciesContext = createContext(intiContext);

export const CurrenciesContextProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState();
  const [exchangeRate, setExchangeRate] = useState();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const response = await fetch("https://api.coinbase.com/v2/currencies");
    const data = await response.json();
    console.log(data)
    setCurrencies(data.data);
  };

  const fetchExchangeRate = async ({currency}) => {
    const response = await fetch(
      `https://api.coinbase.com/v2/currencies?currency=${currency}`
    );
    const data = await response.json();
    setExchangeRate(data.data);
  };

  return (
    <CurrenciesContext.Provider value={{currencies, exchangeRate, fetchExchangeRate}}>
      {children}
    </CurrenciesContext.Provider>
  );
};

export default CurrenciesContextProvider;

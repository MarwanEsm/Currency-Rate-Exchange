import React, { createContext, useState, useEffect } from "react";

const intiContext = {
  currencies: [],
};

export const CurrenciesContext = createContext(intiContext);

export const CurrenciesContextProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState();
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    const response = await fetch("https://api.coinbase.com/v2/currencies");
    const data = await response.json();
    setCurrencies(data.data);
  };
  
  return (
    <CurrenciesContext.Provider value={currencies}>
      {children}
    </CurrenciesContext.Provider>
    
  );
};

export default CurrenciesContextProvider;

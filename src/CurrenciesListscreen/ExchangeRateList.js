import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";

function ExchangeRateList() {
  const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);
  console.log(exchangeRates);
  const { currency } = useParams();
  useEffect(() => {
    fetchExchangeRate(currency);
  }, []);

  return (
    <div>
      {exchangeRates &&
        Object.keys(exchangeRates.rates).map((key, i) => (
          <p key={i}>
            <span>{key}</span>
            <span>{exchangeRates.rates[key]}</span>
          </p>
        ))}
    </div>
  );
}

export default ExchangeRateList;

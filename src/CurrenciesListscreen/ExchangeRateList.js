import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";

function ExchangeRateList() {
  const { fetchExchangeRate, exchangeRate } = useContext(CurrenciesContext);
  const { currency } = useParams();

  useEffect(() => {
    console.log(currency);
    fetchExchangeRate(currency);
  }, []);

  return (
    <div>
      <ul>
        <li>{currency}</li>
      </ul>
    </div>
  );
}

export default ExchangeRateList;

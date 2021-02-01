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
    <div style={divStyle}>
      {exchangeRates &&
        Object.keys(exchangeRates.rates).map((key, i) => (
          <p key={i}>
            <span style={spanStyle}>{key} &nbsp;</span>
            <span style={spanStyle}>{exchangeRates.rates[key]}</span>
          </p>
        ))}
    </div>
  );
}

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing : '3 em', 
};


const divStyle = {
  marginTop: "5%",
  marginBottom: "5%",
};
export default ExchangeRateList;

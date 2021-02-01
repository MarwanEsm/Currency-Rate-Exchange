import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Bootsrap from "react-bootstrap";

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
            <span className ="badge badge-pill badge-primary" style={spanStyle}>
              {key} &nbsp;
            </span>
            <span className ="badge badge-pill badge-warning" style={spanStyle}>
              {exchangeRates.rates[key]}
            </span>
          </p>
        ))}
    </div>
  );
}

const spanStyle = {
  fontSize: 13,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
};

const divStyle = {
  marginTop: "30%",
  marginBottom: "10%",
  
};
export default ExchangeRateList;

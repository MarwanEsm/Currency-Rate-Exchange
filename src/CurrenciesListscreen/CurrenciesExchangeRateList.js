import React, { useContext } from "react";
import { ExchangeRateContext } from "../Components/CurrenciesContext";
import { CurrenciesContext } from "../Components/CurrenciesContext";


function CurrenciesExchangeRateList() {
  const { exchangeRate } = useContext(ExchangeRateContext);
  return (
    <div>
      <ul>
        {exchangeRate &&
          exchangeRate.map((exchangeRate) => {
            return <li>{exchangeRate}</li>;
          })}
      </ul>
    </div>
  );
}


    
    


export default CurrenciesExchangeRateList;



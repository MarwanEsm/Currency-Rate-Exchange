import React, { useContext } from "react";
import { CurrenciesExchangeRateContext } from "../Components/CurrenciesContext";

const CurrenciesExchangeRateList = () => {
  const currenciesExchangeRateList = useContext(CurrenciesExchangeRateContext);
  return (
    <div>
      <ul>
        {currenciesExchangeRateList &&
          currenciesExchangeRateList.map((currenciesExchangeRate) => {
            return (
              <li key={currenciesExchangeRate.id}>
                {currenciesExchangeRate.rates}
              </li>
            );
          })}
      </ul>
    </div>
  );
};

export default CurrenciesExchangeRateList;

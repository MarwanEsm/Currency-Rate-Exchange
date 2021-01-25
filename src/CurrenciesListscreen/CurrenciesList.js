import React, { useContext } from "react";
import { CurrenciesContext } from "../Components/CurrenciesContext";


const CurrenciesList = () => {
  const currencies = useContext(CurrenciesContext);
  console.log(currencies);
  return (
    <div>
      <ul>
        {currencies &&
          currencies.map((currency) => {
            return <li key={currency.id}>{currency.id}</li>;
          })}
      </ul>
    </div>
  );
};


export default CurrenciesList;

import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import {CurrenciesContext,} from "../Components/CurrenciesContext";
import ExchangeRateList from "./ExchangeRateList";


function CurrenciesList() {
  const { currencies } = useContext(CurrenciesContext);
   let history = useHistory();

  function handleChange(e) {
     console.log(e.target.value)
     history.push(`/CurrenciesList/${e.target.value}`);
   }

  return (
    <div>
      <h2 style={h2Style}>Please choose a currency</h2>
      <select
        onChange={handleChange}
        className="browser-default custom-select"
        style={selectStyle}
      >
        {currencies &&
          currencies.map((currency) => {
            return (
              <option key={currency.id} value={currency.id}>
                {currency.id}
              </option>
            );
          })}
      </select>
    </div>
  );
}

const selectStyle = {
  marginTop: "7%",
  width: "50%",
  border: "bold",
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: "10%",
};

export default CurrenciesList;

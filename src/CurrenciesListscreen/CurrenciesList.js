import React, { useContext } from "react";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import { useHistory } from "react-router-dom";


function CurrenciesList() {
  const history = useHistory();
  const displayExchangeRate = () => {
  history.push("/CurrenciesListScreen/:currency");
  };
  const { currencies } = useContext(CurrenciesContext);
  return (
    <div>
      <h2 style={h2Style}>Please choose a currency</h2>
      <select
        className="browser-default custom-select"
        style={selectStyle}
        onChange={displayExchangeRate}
      >
        {currencies &&
          currencies.map((currency) => {
            return <option key={currency.id}>{currency.id}</option>;
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

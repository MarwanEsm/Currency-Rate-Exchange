import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";

function CurrenciesList() {
  const { currencies } = useContext(CurrenciesContext);
  const history = useHistory();
  function handleChange(e) {
    history.push(`/CurrenciesList/${e.target.value}`);
    e.preventDefault();
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
  marginTop: "3%",
  width: "30%",
  border: "bold",
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: "10%",
};

export default CurrenciesList;

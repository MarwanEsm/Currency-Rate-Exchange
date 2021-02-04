import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Convert from "./Converter";

function ExchangeRateList() {
  const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);
  const { currency } = useParams();

  useEffect(() => {
    fetchExchangeRate(currency);
  }, []);

  const [searchedCurrency, setSearchedCurrency] = useState("");

  const handleSearch = (event) => {
    const searchValue = event.target.value;
    setSearchedCurrency(searchValue);
  };

  const displayInSearchBar = (event) => {
    setSearchedCurrency(event.target.value);
  };

  const filteredRates = () => {
    const result = Object.keys(exchangeRates.rates).filter((rate) => {
      return (
        exchangeRates.currency !== rate &&
        rate.includes(searchedCurrency.toUpperCase())
      );
    });

    return result;
  };

  return (
    <div>
      <h2 style={h2Style}>Selected currency </h2>
      <h3 style={h3Style}>{currency} </h3>
      <h2 style={h2Style}>Search currency</h2>
      <input
        id="search"
        type="text"
        placeholder="Type here"
        value={searchedCurrency}
        onChange={handleSearch}
        className="form-control"
        style={inputStyle}
      />

      <br />
      <br />
      <div>
        {exchangeRates &&
          filteredRates().map((key, i) => (
            <div key={i}>
              <p>
                <button
                  className="badge badge-pill badge-primary"
                  style={spanStyle}
                  value={key}
                  onClick={displayInSearchBar}
                >
                  {key} &nbsp;
                </button>{" "}
                <span
                  className="badge badge-pill badge-warning"
                  style={spanStyle}
                >
                  {parseFloat(exchangeRates.rates[key]).toFixed(8)}
                </span>
              </p>
            </div>
          ))}
        <Convert searchedCurrency={searchedCurrency} />
      </div>
      <br />
      <br />
    </div>
  );
}

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin: 20,
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: "9%",
};

const inputStyle = {
  marginTop: "4%",
  marginLeft: "35%",
  width: "30%",
  border: "bold",
};

const h3Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  color: "#ff8000",
  marginTop: "3%",
};

export default ExchangeRateList;

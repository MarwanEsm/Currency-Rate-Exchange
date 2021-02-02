import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import CurrenciesList from "./CurrenciesList";
import Convert from "./Converter";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

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

  const filteredRates = () => {
    const result = Object.keys(exchangeRates.rates).filter((rate) => {
      return exchangeRates.currency !== rate && rate.includes(searchedCurrency);
    });

    return result;
  };

  return (
    <div>
      <div>
        <CurrenciesList />
      </div>

      <h2 style={h2Style}>Search currency</h2>
      <input
        type="text"
        placeholder="Type here"
        value={searchedCurrency}
        onChange={handleSearch}
        class="form-control"
        style={inputStyle}
      />

      <br />
      <br />
      <div>
        {exchangeRates &&
          filteredRates().map((key, i) => (
            <p key={i}>
              <span
                className="badge badge-pill badge-primary"
                style={spanStyle}
              >
                {key} &nbsp;
              </span>{" "}
              <span
                className="badge badge-pill badge-warning"
                style={spanStyle}
              >
                {parseFloat(exchangeRates.rates[key]).toFixed(8)}
              </span>
            </p>
          ))}
        <Convert />
      </div>
    </div>
  );
}

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin: 20,
};


const divStyle = {
  marginTop: "10%",
  marginBottom: "10%",
};

const groupStyle = {
  display: "flex",
  justifyContent: "center",
  width: "60%",
  marginLeft: "15%",
  marginRight: "15%",
  fontSize: 12,
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: "10%",
};

const inputStyle = {
  marginTop: "4%",
  marginLeft: "35%",
  width: "30%",
  border: "bold",
};

export default ExchangeRateList;

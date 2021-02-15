import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Convert from "./Converter";
import { Link } from "react-router-dom";
import Chat from "../Photos/Chat.png";
import Back from "../Photos/Back.png";

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
      <div style={divStyle}>
        <div style={imgDivStyle}>
          <Link to="/CurrenciesListScreen">
            <img src={Back} style={imagStyle} />
          </Link>
        </div>
        <div style={imgDivStyle}>
          <Link to="/ChatScreen">
            <img src={Chat} style={imagStyle} />
          </Link>
        </div>
      </div>
      <h2 style={h2Style}>Selected currency </h2>
      <h3 style={h3Style}>{currency} </h3>
      <h2 style={h2Style}>Conversion currency</h2>
      <input
        id="search"
        type="text"
        placeholder="Search here"
        value={searchedCurrency}
        onChange={handleSearch}
        className="form-control"
        style={inputStyle}
        id="inputGroup-sizing-sm"
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
                  {parseFloat(exchangeRates.rates[key]).toFixed(4)}
                </span>
              </p>
            </div>
          ))}
        <Convert searchedCurrency={searchedCurrency} />
      </div>

      <br />
    </div>
  );
}

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin: 20,
  width: 100,
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
  borderColor: "black",
};

const h3Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
  color: "#ff8000",
  marginTop: "3%",
};

const divStyle = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  marginTop: "10%",
  marginLeft: "1%",
  marginRight: "1%",
};


const imagStyle = {
  width: "15%",
};

const imgDivStyle = {
  marginRight: 5,
};
export default ExchangeRateList;

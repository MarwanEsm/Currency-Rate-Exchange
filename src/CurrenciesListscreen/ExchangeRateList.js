import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Convert from "./Converter";
import { Link } from "react-router-dom";
import { Nav, Navbar } from "react-bootstrap";

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
      <div style={div1Style}>
        <div>
          <Navbar collapseOnSelect expand="lg" bg="white">
            <Navbar.Brand href="#home"></Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="mr-auto">
                <Link to="/" style={textStyle}>
                  Logout
                </Link>
                <Link to="/ChatScreen" style={textStyle}>
                  Chat
                </Link>
                <Link to="/CurrenciesListScreen" style={textStyle}>
                  Back
                </Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>
      </div>
      <div>
        <div style={divStyle}></div>
        <h2 style={h2Style}>Selected currency </h2>
        <h3 style={h3Style}>{currency} </h3>
        <h2 style={h2Style}>Conversion currency</h2>
        <input
          type="text"
          placeholder="Search here"
          value={searchedCurrency}
          onChange={handleSearch}
          className="form-control"
          style={inputStyle}
          id="inputGroup-sizing-sm"
        />

        <br />

        <div>
          {exchangeRates &&
            filteredRates().map((key, i) => (
              <div key={i}>
                <p>
                  <button
                    className="badge badge-pill badge-primary"
                    style={span1Style}
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
    </div>
  );
}

const span1Style = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin: 20,
  width: 100,
  backgroundColor: "#ffa31a",
};

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin: 20,
  width: 100,
  backgroundColor: "#3B474D",
  color: "white",
};

const h2Style = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 18,
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
  justifyContent: "space-between",
  marginLeft: "8%",
  marginRight: "8%",
  position: "relative",
};

const textStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 18,
  fontWeight: "bold",
  color: "#ffa31a",
  marginBottom: "3%",
};

const div1Style = {
  backgroundColor: "#ffff00",
  width: "100%",
  borderColor: "black",
  border: "bold",
};
export default ExchangeRateList;

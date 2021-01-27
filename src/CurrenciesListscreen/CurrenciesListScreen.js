import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesContextProvider>
        <CurrenciesList />
      </CurrenciesContextProvider>
      <br/>
      <a href="/" style={aStyle}>
        Log out
      </a>
    </div>
  );
}

const aStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 15,
  textDecoration: "underline",
  marginTop: 10,
  margingBottom: 20,
  color: "#ff8000",
};
export default CurrenciesListScreen;

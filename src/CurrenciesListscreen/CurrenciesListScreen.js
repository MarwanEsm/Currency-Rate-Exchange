import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesContextProvider>
        <CurrenciesList />
      </CurrenciesContextProvider>
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
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
};
export default CurrenciesListScreen;

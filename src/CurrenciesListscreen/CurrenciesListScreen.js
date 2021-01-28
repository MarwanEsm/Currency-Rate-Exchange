import React from "react";
import CurrenciesList from "./CurrenciesList";

function CurrenciesListScreen() {
  return (
    <div>
     
        <CurrenciesList />
    
      <br />
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

import React from "react";
import CurrenciesList from "./CurrenciesList";
import { Link } from "react-router-dom";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesList />
      <br />
      <Link  to ="/" style={aStyle}/>
        Log out
      
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

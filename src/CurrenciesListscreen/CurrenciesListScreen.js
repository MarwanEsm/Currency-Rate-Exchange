import React from "react";
import CurrenciesList from "./CurrenciesList";
import { Link } from "react-router-dom";
import Logout from "../Photos/Logout.png";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesList />
      <br />
      <Link to="/" >
        <img src={Logout} style={imagStyle} />
      </Link>
    </div>
  );
}

const imagStyle = {
  width: "10%",
};


export default CurrenciesListScreen;

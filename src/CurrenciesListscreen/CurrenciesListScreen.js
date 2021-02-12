import React from "react";
import CurrenciesList from "./CurrenciesList";
import { Link } from "react-router-dom";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesList />
      <br />
      <Link to="/"  className="badge badge-warning">
        Log out
      </Link>
    </div>
  );
}



export default CurrenciesListScreen;

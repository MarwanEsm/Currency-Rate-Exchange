import React from "react";
import CurrenciesList from "./CurrenciesList";
import ButtonAppBar from "../Firstscreen/ButtonAppBar";

function CurrenciesListScreen() {
  return (
    <div>
      <ButtonAppBar />
      <CurrenciesList />
      <br />
    </div>
  );
}

export default CurrenciesListScreen;

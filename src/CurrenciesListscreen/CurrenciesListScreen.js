import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";

function CurrenciesListScreen() {
  return (
    <CurrenciesContextProvider>
      <CurrenciesList />
    </CurrenciesContextProvider>
  );
}

export default CurrenciesListScreen;

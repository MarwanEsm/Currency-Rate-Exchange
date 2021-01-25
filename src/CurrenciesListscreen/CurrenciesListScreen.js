import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";

function CurrenciesListScreen() {
  return (
    <div>
      <CurrenciesContextProvider>
        <CurrenciesList />
      </CurrenciesContextProvider>
    </div>
  );
}

export default CurrenciesListScreen;

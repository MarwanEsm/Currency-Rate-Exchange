import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";


const Wrapper = ({ children }) => (
  <div>
    <div>{children}</div>
  </div>
);
function SecondScreen() {
  return (
    <div>
      <Wrapper>
        <CurrenciesContextProvider>
          <CurrenciesList />
        </CurrenciesContextProvider>
      </Wrapper>
    </div>
  );
}

export default SecondScreen;

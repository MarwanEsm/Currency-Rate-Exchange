import React from "react";
import CurrenciesList from "./CurrenciesList";
import CurrenciesContextProvider from "../Components/CurrenciesContext";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

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

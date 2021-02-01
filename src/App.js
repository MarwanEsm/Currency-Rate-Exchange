import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
import ExchangeRateList from "./CurrenciesListscreen/ExchangeRateList";
import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
import TaCScreen from "./TermsAndConditions/TandConditions";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import CurrenciesList from "./CurrenciesListscreen/CurrenciesList";
import CurrenciesContextProvider from "./Components/CurrenciesContext";

export default function App() {
  return (
    <Router>
      <div className="App">
        <CurrenciesContextProvider>
          <Switch>
            <Route exact path="/">
              <LandingScreen />
            </Route>
            <Route path="/LogInScreen">
              <LogInScreen />
            </Route>
            <Route exact path="/CurrenciesListScreen">
              <CurrenciesListScreen />
            </Route>
            <Route path="/CurrenciesList/:currency">
              <ExchangeRateList />  
            </Route>
            <Route exact path="/RegistrationScreen">
              <RegistrationScreen />
            </Route>
            <Route exact path="/TandConditions">
              <TaCScreen />
            </Route>
          </Switch>
        </CurrenciesContextProvider>
      </div>
    </Router>
  );
}

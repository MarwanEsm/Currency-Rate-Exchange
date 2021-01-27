import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
import CurrenciesList from "./CurrenciesListscreen/CurrenciesList";
import CurrenciesExchangeRateList from "./CurrenciesListscreen/CurrenciesExchangeRateList";
import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
import Whatever from "./TermsAndConditions/Whatever";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

export default function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/">
            <LandingScreen />
          </Route>
          <Route path="/LogInScreen">
            <LogInScreen />
          </Route>
          <Route path="/CurrenciesListScreen">
            <CurrenciesListScreen />
          </Route>
          <Route path="/CurrenciesList/:currency">
            <CurrenciesList />
          </Route>
          <Route path="/RegistrationScreen">
            <RegistrationScreen />
          </Route>
          <Route path="/Whatever">
            <Whatever />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
// import CurrenciesExchangeRateList from './CurrenciesListscreen/CurrenciesExchangeRateList'
import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
import TermsAndConditionsScreen from "./TermsAndConditions/TermsAndConditionsScreen";
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
          <Route path="/CurrenciesListScreen/:currency"></Route>
          <Route path="/RegistrationScreen">
            <RegistrationScreen />
          </Route>
          <Route path="/TermsAndConditionsScreen">
            <TermsAndConditionsScreen />
          </Route>
      
        </Switch>
      </div>
    </Router>
  );
}

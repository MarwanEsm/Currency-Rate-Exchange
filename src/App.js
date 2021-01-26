import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

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
          <Route path="/RegistrationScreen">
            <RegistrationScreen />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

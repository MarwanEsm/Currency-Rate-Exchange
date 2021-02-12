import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
import ExchangeRateList from "./CurrenciesListscreen/ExchangeRateList";
import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import CurrenciesContextProvider from "./Components/CurrenciesContext";
import ResetPassword from "./LogInscreen/ResetPassword";
import ChatScreen from "./ChatForum/ChatScreen";
import AuthContextProvider from "./Firebase/FireBaseAuth";
import ChatConextProvider from "./Firebase/ChatContext";

export default function App() {
  return (
    <Router>
      <div className="App">
        <AuthContextProvider>
          <ChatConextProvider>
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
                <Route exact path="/CurrenciesList/:currency">
                  <ExchangeRateList />
                </Route>
                <Route exact path="/RegistrationScreen">
                  <RegistrationScreen />
                </Route>
                <Route path="/ResetPassword">
                  <ResetPassword />
                </Route>
                <Route  path="/ChatScreen">
                  <ChatScreen />
                </Route>
              </Switch>
            </CurrenciesContextProvider>
          </ChatConextProvider>
        </AuthContextProvider>
      </div>
    </Router>
  );
}

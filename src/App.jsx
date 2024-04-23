import './style/global.scss'
import React from "react";
import { BrowserRouter as Router, Switch, Route, Routes } from "react-router-dom";
// import LandingScreen from "./Firstscreen/LandingScreen";
// import LogInScreen from "./LogInscreen/LogInScreen";
// import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
// import ExchangeRateList from "./CurrenciesListscreen/ExchangeRateList";
// import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
// import CurrenciesContextProvider from "./Components/CurrenciesContext";
// import ResetPassword from "./LogInscreen/ResetPassword";
// import ChatScreen from "./ChatForum/ChatScreen";

// import AuthContextProvider from './firebase/FirebaseAuth';
// import CurrenciesContextProvider from "./context/CurrenciesContext";
import Home from "./screens/home/Home"
import LogIn from './screens/login/Login';

const App = () => {
  return (
    <Router>
      <div className="App">
        {/* <AuthContextProvider> */}
        {/* <ChatContextProvider> */}
        {/* <CurrenciesContextProvider> */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path='/login' element={<LogIn />} />
        </Routes>
        {/* <Switch>
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
                <Route path="/ChatScreen">
                  <ChatScreen />
                </Route>
              </Switch> */}
        {/* </CurrenciesContextProvider>
        </AuthContextProvider> */}
        {/* </ChatContextProvider>
        </FirebaseAuthentication> */}
      </div>
    </Router>
  );
}

export default App
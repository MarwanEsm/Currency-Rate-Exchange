import './style/global.scss'
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
// import LandingScreen from "./Firstscreen/LandingScreen";
// import LogInScreen from "./LogInscreen/LogInScreen";
// import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
// import ExchangeRateList from "./CurrenciesListscreen/ExchangeRateList";
// import RegistrationScreen from "./RegistrationScreen/RegistrationScreen";
// import CurrenciesContextProvider from "./Components/CurrenciesContext";
// import ResetPassword from "./LogInscreen/ResetPassword";
// import ChatScreen from "./ChatForum/ChatScreen";

// import AuthContextProvider from './firebase/FirebaseAuth';
import ChatContextProvider from "./firebase/chatContext"
import AuthContextProvider from "./firebase/authContext"
import CurrenciesContextProvider from "./context/CurrenciesContext"
// import CurrenciesContextProvider from "./context/CurrenciesContext";
import Home from "./screens/home/Home"
import SignIn from "./screens/login/SignIn"


const App = () => {
  return (
    <Router>
      <div className="App">
        <AuthContextProvider>
          <ChatContextProvider>
            <CurrenciesContextProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path='/sign_in' element={<SignIn />} />
              </Routes>
              {/* <Switch>
                <Route exact path="/CurrenciesListScreen">
                  <CurrenciesListScreen />
                </Route>
                <Route exact path="/CurrenciesList/:currency">
                  <ExchangeRateList />
                </Route>
                
                <Route path="/ChatScreen">
                  <ChatScreen />
                </Route>
              </Switch> */}

            </CurrenciesContextProvider>
          </ChatContextProvider>
        </AuthContextProvider>
      </div>
    </Router>
  );
}

export default App
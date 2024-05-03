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
import AuthContextProvider from "./firebase/authContext"
import CurrenciesList from './screens/currenciesList/CurrenciesList';
// import CurrenciesContextProvider from "./context/CurrenciesContext";
import Home from "./screens/home/Home"
import "./style/global.scss"



const App = () => {
  return (
    <Router>
      <div className="App">
        <AuthContextProvider>
          {/* <ChatContextProvider> */}

          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route path='/currencies' element={<CurrenciesList />} />
          </Routes>
          {/* <Switch>
          
                
                <Route path="/ChatScreen">
                  <ChatScreen />
                </Route>
              </Switch> */}
          {/* </ChatContextProvider> */}
        </AuthContextProvider>
      </div>
    </Router>
  );
}

export default App
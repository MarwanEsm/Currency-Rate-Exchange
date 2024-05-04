import './style/global.scss'
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthContextProvider from "./firebase/authContext"
import CurrenciesList from './screens/currenciesList/CurrenciesList';
import Home from "./screens/home/Home"
import { Provider } from 'react-redux'
import { store } from './redux/store';
import "./style/global.scss"



const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <AuthContextProvider>
            <Routes>
              <Route exact path="/" element={<Home />} />
              <Route path='/currencies' element={<CurrenciesList />} />
            </Routes>
          </AuthContextProvider>
        </div>
      </Router>
    </Provider>
  );
}

export default App
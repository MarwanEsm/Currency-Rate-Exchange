import './style/global.scss'
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthContextProvider from "./firebase/authContext"
import CurrenciesList from './screens/currenciesList/CurrenciesList';
import Home from "./screens/home/Home"
import "./style/global.scss"

//TODO: email template to activate user email address
// TODO: do not allow login if user did not activate email address
//TODO: Click on activate email address Link open the app browser that email is activated and after 5 seconds redirect to login
//TODO: send rest password email shows a message that email was sent
//TODO: click on rest password link opens up new page to resetPassword that has to open up login modal
//TODO: make minimum password required is 6 characters 1 big letter and a special character


const App = () => {
    return (
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
    );
}

export default App
import "./App.css";
import React from "react";
import LandingScreen from "./Firstscreen/LandingScreen";
import CurrenciesListScreen from "./CurrenciesListscreen/CurrenciesListScreen";
import LogInScreen from "./LogInscreen/LogInScreen";
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
            <Route path="/CurrenciesListScreen">
              <CurrenciesListScreen />
            </Route>
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

// function Home() {
//   return <h2>Home</h2>;
// }

// function About() {
//   return <h2>About</h2>;
// }

// function User() {
//   return <h2>Users</h2>;
// }

// export default class App extends Component {
//   render() {
//     return (
//       <BrowserRouter>
//         <div className="App">
//           <Switch>
//             <Route exact path="/" component={LandingScreen} />
//           </Switch>
//         </div>
//       </BrowserRouter>
//     );
//   }
// }

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//       <Header/>
//     </div>
//   );
// }

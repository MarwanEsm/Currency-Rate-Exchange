import React from "react";
import DateAndTime from "./DateAndTime";
import DollarAndEuroPrice from "./Dollar and Euro price";
import Icon from "./Icon";
import LoginButton from "./LoginButton";

import CurrenciesContextProvider from "../Components/CurrenciesContext";

const Wrapper = ({ children }) => (
  <div>
    <div>{children}</div>
  </div>
);
function LandingScreen() {
  return (
    <div>
      <Wrapper>
        <DateAndTime />
        <Icon />
        <DollarAndEuroPrice />
        <LoginButton />
      </Wrapper>
    </div>
  );
}

export default LandingScreen;

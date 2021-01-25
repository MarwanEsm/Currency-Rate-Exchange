import React from "react";
import DateAndTime from "./DateAndTime";
import DollarAndEuroPrice from "./Dollar and Euro price";
import Icon from "./Icon";
import LoginButton from "./LoginButton";

function LandingScreen() {
  return (
    <div>
      <DateAndTime />
      <Icon />
      <DollarAndEuroPrice />
      <LoginButton />
    </div>
  );
}

export default LandingScreen;

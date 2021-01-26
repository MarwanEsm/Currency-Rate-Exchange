import React from "react";
import DateAndTime from "./DateAndTime";
import DollarAndEuroPrice from "./Dollar and Euro price";
import Icon from "./Icon";
import LoginButton from "./LoginButton";
import RegistrationLink from './RegistrationLink';

function LandingScreen() {
  return (
    <div>
      <DateAndTime />
      <Icon />
      <DollarAndEuroPrice />
      <LoginButton />
      <RegistrationLink/>
    </div>
  );
}

export default LandingScreen;

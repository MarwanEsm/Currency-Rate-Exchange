import React from "react";
import DateAndTime from "./DateAndTime";

import Icon from "./Icon";
import LoginButton from "./LoginButton";
import RegistrationLink from './RegistrationLink';

function LandingScreen() {
  return (
    <div>
      <DateAndTime />
      <Icon />
      <LoginButton />
      <RegistrationLink/>
    </div>
  );
}

export default LandingScreen;

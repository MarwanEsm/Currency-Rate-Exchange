import React from "react";
import DateAndTime from "./DateAndTime";
import Icon from "./Icon";
import LoginButton from "./LoginButton";
import RegistrationLink from "./RegistrationLink";
import LandingScreenStyle from "../Style/LandingScreenStyle";

function LandingScreen() {
  return (
    <div>
      <div>
        <LandingScreenStyle></LandingScreenStyle>
      </div>
      <div style={divStyle}>
        <DateAndTime />
        <Icon />
        <LoginButton />
        <RegistrationLink />
      </div>
    </div>
  );
}

const divStyle = {
  position: "relative",
};
export default LandingScreen;

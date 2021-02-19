import React from "react";
import DateAndTime from "./DateAndTime";
import Icon from "./Icon";
import LoginButton from "./LoginButton";
import RegistrationLink from "./RegistrationLink";

function LandingScreen() {
  return (
    <div style={divStyle}>
      <div style={div1Style}>Hi</div>
      <div style={div2Style}>Hi</div>
    </div>
    //     <div>
    //       <DateAndTime />
    //       <Icon />
    //       <LoginButton />
    //       <RegistrationLink />
    //     </div>
    //   );
    // }
  );
}

const div1Style = {
  width: "50%",
  marginRight: "50%",
  height: "100vh",
  backgroundColor: "#ffa31a",
  position: "absolute",
};

const div2Style = {
  width: "50%",
  marginLeft: "50%",
  height: "100vh",
  backgroundColor: "#999966",
  position: "absolute",
};

const divStyle = {
  display: "flex",
  justifyContent: "space-around",
};

export default LandingScreen;

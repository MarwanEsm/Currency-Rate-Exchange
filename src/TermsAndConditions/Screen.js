import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/Button";
import { useHistory } from "react-router-dom";

function Screen() {
  const history = useHistory();
  const goBacktoRegScreen = (event) => {
    event.preventDefault();
    history.push("/RegistrationsScreen/RegistrationsScreen");
  };
  return (
    <div>
      <p style={pStyle}>TERMS OF SERVICE</p>
      <h3>
        Make sure you're enjoying your life and enjoy using this App either :)
      </h3>
      <Button
        variant="warning"
        type="submit"
        style={buttonStyle}
        onClick={goBacktoRegScreen}
      >
        Accept
      </Button>
    </div>
  );
}

const pStyle = {
  marginTop: "20%",
  fontWeight: "bold",
  fontSize: 20,
};

const buttonStyle = {
  marginTop: 35,
  fontFamily: "Helvetica",
  fontWeight: "bold",
};

export default Screen;

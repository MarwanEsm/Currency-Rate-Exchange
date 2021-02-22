import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import LandingScreenStyle from "../Style/LandingScreenStyle";

function ResetPassword() {
  const [email, setEmail] = useState();
  const enterEmail = (event) => {
    const enteredEmail = event.target.value;
    setEmail(enteredEmail);
  };

  const invalid = email === "";

  return (
    <div>
      <div>
        <LandingScreenStyle />
      </div>
      <div style={divStyle}>
        <Form>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridEmail">
              <Form.Label style={textStyle}>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={enterEmail}
              />
            </Form.Group>
          </Form.Row>
          <Button
            variant="warning"
            style={buttonStyle}
            onClick={() => {
              alert(
                "If you're already registered with us, we will send you a reset password link to your Email "
              );
            }}
            disabled={invalid}
          >
            Reset Password
          </Button>
          <div>
            <Link to="/" style={aStyle}>
              Home
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}

const buttonStyle = {
  marginTop: 35,
  marginBottom: 20,
  fontFamily: "Fantasy ",
  backgroundColor: "yellow",
  fontWeight: "bold",
  fontSize: 15,
};

const divStyle = {
  marginLeft: "5%",
  marginRight: "5%",
  marginTop: "10%",
  marginBottom: "15%",
  position: "relative",
};

const aStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 13,
  textDecoration: "underline",
  color: "white",
  cursor: "pointer",
};

const textStyle = {
  color: "#f2f2f2",
  fontWeight: "bold",
};

export default ResetPassword;

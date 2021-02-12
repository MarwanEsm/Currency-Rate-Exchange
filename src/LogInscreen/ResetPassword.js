import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";

function ResetPassword() {
  const [email, setEmail] = useState();
  const enterEmail = (event) => {
    const enteredEmail = event.target.value;
    setEmail(enteredEmail);
  };

  const invalid = email === '';
  return (
    <div style={divStyle}>
      <Form>
        <Form.Row>
          <Form.Group as={Col} controlId="formGridEmail">
            <Form.Label>Email</Form.Label>
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
          type="submit"
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
          <a href="/" style={aStyle}>
            Home
          </a>
        </div>
      </Form>
    </div>
  );
}

const buttonStyle = {
  marginTop: 35,
  fontFamily: "Helvetica",
  fontWeight: "bold",
  fontSize: 15,
  marginBottom: 30,
};

const divStyle = {
  marginLeft: "5%",
  marginRight: "5%",
  marginTop: "10%",
  marginBottom: "15%",
};

const aStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 13,
  textDecoration: "underline",
  color: "#ff8000",
  cursor: "pointer",
};

export default ResetPassword;

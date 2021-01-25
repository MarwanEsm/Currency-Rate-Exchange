import React from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";

function LogInScreen() {
  return (
    <Form>
      <Form.Group controlId="formBasicEmail">
        <Form.Label style={labelStyle}>Email address</Form.Label>
        <Form.Control
          type="email"
          placeholder="Enter email"
          data-ng-init="resp()"
          style={inputlStyle}
        />
        <Form.Text style={textStyle}>
          We'll never share your email with anyone else.
        </Form.Text>
      </Form.Group>

      <Form.Group controlId="formBasicPassword">
        <Form.Label style={labelStyle}>Password</Form.Label>
        <Form.Control
          type="password"
          placeholder="Password"
          data-ng-init="resp()"
          style={inputlStyle}
        />
      </Form.Group>
      <Form.Group controlId="formBasicCheckbox" style={groupStyle}>
        <Form.Check type="checkbox" />
        <Form.Label data-ng-init="resp()">
          Agree to terms and conditions
        </Form.Label>
      </Form.Group>
      <Button variant="warning" type="submit" style={buttonStyle}>
        Sign in
      </Button>
    </Form>
  );
}

const inputlStyle = {
  marginLeft: "10%",
  marginRight: "5%",
  width: "80%",
  display: "flex",
  justifyContent: "center",
};

const labelStyle = {
  fontSize: 20,
  fontFamily: "Courier New",
  marginTop: "3%",
  fontWeight: "bold",
};

const textStyle = {
  marginTop: 15,
  textDecoration: "underline",
  fontSize: 12,
};

const groupStyle = {
  display: "flex",
  justifyConten: "space-around",
  marginLeft: "25%",
  marginTop: 15,
  textDecoration: "underline",
  fontSize: 13,
};

const buttonStyle = {
    marginTop:40,
}
export default LogInScreen;

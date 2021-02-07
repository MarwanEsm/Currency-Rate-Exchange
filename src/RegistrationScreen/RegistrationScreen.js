import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";

function RegistrationScreen() {
  const submitDetails = () => {};
  return (
    <div>
      <div style={divStyle}>
        <Form>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridPassword">
              <Form.Label>First Name</Form.Label>
              <Form.Control type="email" placeholder="Enter first name" />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridPassword">
              <Form.Label>Last Name</Form.Label>
              <Form.Control type="password" placeholder="Enter last name" />
            </Form.Group>
          </Form.Row>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" placeholder="Enter email" />
            </Form.Group>
          </Form.Row>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" placeholder="Password" />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control type="password" placeholder="Password" />
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group as={Col} controlId="formGridCity">
              <Form.Label>Country</Form.Label>
              <Form.Control />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridState">
              <Form.Label>City</Form.Label>
              <Form.Control></Form.Control>
            </Form.Group>

            <Form.Group as={Col} controlId="formGridZip">
              <Form.Label>Zip</Form.Label>
              <Form.Control />
            </Form.Group>
          </Form.Row>
          <div>
            <Form.Group controlId="formBasicCheckbox" style={groupStyle}>
              <Form.Check type="checkbox" />
              <Terms />
            </Form.Group>
          </div>

          <Button
            variant="warning"
            type="submit"
            style={buttonStyle}
            onClick={submitDetails}
          >
            Register
          </Button>
        </Form>
        <br />

        <a href="/LogInScreen" style={aStyle}>
          Back to Log in
        </a>
      </div>
    </div>
  );
}

function Terms() {
  const [isOpen, setIsOpen] = useState(false);
  const goBacktoRegScreen = () => {
    setIsOpen(!isOpen);
  };
  return (
    <Popup
      trigger={<a style={a1Style}>Agree to terms and conditions</a>}
      position="center-top"
    >
      <div>
        <p style={pStyle}>Terms Of Service</p>
        <h3 style={h3Style}>
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
    </Popup>
  );
}

const pStyle = {
  marginTop: "20%",
  fontWeight: "bold",
  fontSize: 13,
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
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
};
const buttonStyle = {
  marginTop: 35,
  fontFamily: "Helvetica",
  fontWeight: "bold",
  fontSize: 15,
};

const groupStyle = {
  display: "flex",
  justifyContent: "center",
  width: "70%",
  marginLeft: "15%",
  textDecoration: "underline",
  fontSize: 12,
};

const a1Style = {
  color: "black",
  cursor: "pointer",
};

const h3Style = {
  fontSize: 15,
};

export default RegistrationScreen;

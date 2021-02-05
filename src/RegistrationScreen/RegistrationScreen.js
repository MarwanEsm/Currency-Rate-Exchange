import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";


function RegistrationScreen() {
  return (
    <div style={divStyle}>
      <Form>
        <Form.Row>
          <Form.Group as={Col} controlId="formGridEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" placeholder="Enter email" />
          </Form.Group>

          <Form.Group as={Col} controlId="formGridPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Password" />
          </Form.Group>
        </Form.Row>

        <Form.Group controlId="formGridAddress1">
          <Form.Label>Address</Form.Label>
          <Form.Control placeholder="1234 Main St" />
        </Form.Group>

        <Form.Group controlId="formGridAddress2">
          <Form.Label>Address 2</Form.Label>
          <Form.Control placeholder="Apartment, studio, or floor" />
        </Form.Group>

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

        <Form.Group controlId="formBasicCheckbox" style={groupStyle}>
          <Form.Check type="checkbox" />
          <Terms />
        </Form.Group>

        <Button variant="warning" type="submit" style={buttonStyle}>
          Register
        </Button>
      </Form>
      <br />

      <a href="/LogInScreen" style={aStyle}>
        Back to Log in
      </a>
    </div>
  );
}

function Terms() {
  const [isOpen, setIsOpen] = useState(false);
  const goBacktoRegScreen = () => {
    setIsOpen(!isOpen);
  };
  return (
    <Popup trigger={<a>Agree to terms and conditions</a>} position="center-top">
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
    </Popup>
  );
}

const pStyle = {
  marginTop: "20%",
  fontWeight: "bold",
  fontSize: 20,
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
};
export default RegistrationScreen;

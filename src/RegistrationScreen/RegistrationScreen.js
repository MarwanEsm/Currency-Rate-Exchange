import React, { useState, useContext } from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Link } from "react-router-dom";

function RegistrationScreen() {
  const [open, setOpen] = useState(false);

  const closePopup = (event) => {
    event.preventDefault();
    setOpen(true);
  };

  const { register } = useContext(AuthContext);

  const [state, setState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    country: "",
    city: "",
    zip: "",
    checked: false,
  });

  const changeInput = (event) => {
    const value = event.target.value;
    event.preventDefault();

    setState({
      ...state,
      [event.target.name]: value,
    });
  };

  // const preventReload = (event) => {
  //   event.preventDefault();
  // };

  const makeItChecked = () => {
    setState({ ...state, checked: !state.checked });
  };
  const handleRegister = (event) => {
    event.preventDefault();
    register(state);
    alert("thank you for submitting your details");
  };

  const [showPopup, setShowPopup] = useState({ showPopup: false })
  const openPopup = () => {
    setShowPopup({ showPopup: !showPopup });
  }

  const isInvalid =
    state.firstName === "" ||
    state.lastName === "" ||
    state.password === "" ||
    state.passwordConfirmation !== state.password ||
    state.country === "" ||
    state.city === "" ||
    state.zip === "" ||
    state.checked === false;

  return (
    <div>
      <div style={divStyle}>
        <Form>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridfName">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={state.firstName}
                onChange={changeInput}
              />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridlName">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={state.lastName}
                onChange={changeInput}
              />
            </Form.Group>
          </Form.Row>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={state.email}
                onChange={changeInput}
              />
            </Form.Group>
          </Form.Row>
          <Form.Row>
            <Form.Group as={Col} controlId="formGridPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={state.password}
                onChange={changeInput}
              />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridConfirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="passwordConfirmation"
                value={state.passwordConfirmation}
                onChange={changeInput}
              />
            </Form.Group>
          </Form.Row>

          <Form.Row>
            <Form.Group as={Col} controlId="formGridCity">
              <Form.Label>Country</Form.Label>
              <Form.Control
                type="text"
                name="country"
                value={state.country}
                onChange={changeInput}
              />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridState">
              <Form.Label>City</Form.Label>
              <Form.Control
                type="text"
                name="city"
                value={state.city}
                onChange={changeInput}
              />
            </Form.Group>

            <Form.Group as={Col} controlId="formGridZip">
              <Form.Label>Zip</Form.Label>
              <Form.Control
                type="number"
                name="zip"
                value={state.zip}
                onChange={changeInput}
              />
            </Form.Group>
          </Form.Row>

          <div>
            <Form.Group controlId="formBasicCheckbox" style={groupStyle}>
              <Form.Check
                onClick={makeItChecked}
                defaultChecked={state.checked}
                type="checkbox"
              />

              <Popup
                open={open}
                trigger={
                  <Link style={a1Style}>Agree to terms and conditions</Link>
                }
                position="center-top"
                onClick={openPopup}
              >
                <Terms />
              </Popup>
            </Form.Group>
          </div>

          <Button
            variant="warning"
            type="submit"
            style={buttonStyle}
            onClick={handleRegister}
            disabled={isInvalid}
          >
            Register
          </Button>
        </Form>
        <br />

        <Link to="/LogInScreen" style={aStyle}>
          Back to Log in
        </Link>
      </div>
    </div>
  );
}

function Terms({ closePopup }) {
  return (
    <div>
      <p style={pStyle}>Terms Of Service</p>
      <h3 style={h3Style}>
        Make sure you're enjoying your life and enjoy using this App either :)
      </h3>
      <Button
        variant="warning"
        type="submit"
        style={buttonStyle}
        onClick={closePopup}
      >
        Accept
      </Button>
    </div>
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
  fontWeight: "bold",
  textDecoration: "underline",
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
};
const buttonStyle = {
  marginTop: 20,
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

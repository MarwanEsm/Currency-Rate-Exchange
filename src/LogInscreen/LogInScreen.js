import React, { useContext, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Link } from "react-router-dom";
import Back from "../Photos/Back.png";
import LandingScreenStyle from "../Style/LandingScreenStyle";

function LogInScreen() {
  const [state, setState] = useState({
    email: "",
    password: "",
  });

  const { login } = useContext(AuthContext);

  const handelChange = (e) => {
    const value = e.target.value;
    setState({ ...state, [e.target.name]: value });
  };

  const handelLogin = (event) => {
    event.preventDefault();
    login(state);
  };

  const invalid = state.email === "" || state.password === "";

  return (
    <div>
      <div>
        <LandingScreenStyle></LandingScreenStyle>
      </div>
      <div style={divStyle}>
        <Form>
          <Form.Group controlId="formBasicEmail">
            <Form.Label style={text1Style}>Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              data-ng-init="resp()"
              name="email"
              style={inputlStyle}
              onChange={handelChange}
              value={state.email}
            />
            <Form.Text style={textStyle}>
              ( We'll never share your email with anyone else )
            </Form.Text>
          </Form.Group>

          <Form.Group controlId="formBasicPassword">
            <Form.Label style={text1Style}>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              data-ng-init="resp()"
              name="password"
              style={inputlStyle}
              onChange={handelChange}
              value={state.password}
            />
          </Form.Group>
          <br />
          <div>
            <Link to="/Resetpassword" style={a2Style}>
              Forgot Password ?
            </Link>
          </div>
          <Button
            variant="warning"
            style={buttonStyle}
            disabled={invalid}
            onClick={handelLogin}
          >
            Sign in
          </Button>
        </Form>
        <br />
        <Link to="/">
          <img src={Back} style={imagStyle} alt={""} />
        </Link>
      </div>
    </div>
  );
}

const inputlStyle = {
  width: "70%",
  marginLeft: "15%",
};

const textStyle = {
  marginTop: "5%",
  fontSize: 12,
  color: "#f2f2f2",
};

const buttonStyle = {
  marginTop: 30,
  marginBottom: 20,
  fontFamily: "Fantasy ",
  backgroundColor: "yellow",
};

const a2Style = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 14,
  textDecoration: "underline",
  paddingTop: 10,
  paddingBottom: 20,
  color: "#f2f2f2",
  cursor: "pointer",
  fontWeight: "bold",
};

const imagStyle = {
  width: 35,
  marginTop: 10,
};

const divStyle = {
  marginLeft: "5%",
  marginRight: "5%",
  marginTop: "19%",
  marginBottom: "15%",
  position: "relative",
};

const text1Style = {
  color: "#f2f2f2",
  fontWeight: "bold",
};

export default LogInScreen;

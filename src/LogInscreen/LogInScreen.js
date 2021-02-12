import React, { useContext, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Link } from "react-router-dom";


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
      <Form>
        <Form.Group controlId="formBasicEmail">
          <Form.Label style={labelStyle}>Email address</Form.Label>
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
          <Form.Label style={labelStyle}>Password</Form.Label>
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
      <Link to="/" style={a2Style}>
        Back
         </Link>
         
    </div>
  );
}

const inputlStyle = {
  width: "70%",
  marginLeft: "15%",
};

const labelStyle = {
  fontSize: 20,
  fontFamily: "Courier New",
  marginTop: "5%",
  fontWeight: "bold",
};

const textStyle = {
  marginTop: "5%",
  fontSize: 12,
};

const buttonStyle = {
  marginTop: 30,
  fontFamily: "Helvetica",
  fontWeight: "bold",
};

const a2Style = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 14,
  textDecoration: "underline",
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
  cursor: "pointer",
};



export default LogInScreen;

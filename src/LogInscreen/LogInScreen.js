import React, { useContext, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Redirect } from "react-router-dom";

function LogInScreen() {
  const [state, setState] = useState({
    email: "",
    password: "",
  });
  const handelChange = (e) => {
    const value = e.target.value;
    setState({ ...state, [e.target.name]: value });
  };
  // const [isAuthenticated, setIsAuthenticated] = useState();
  // const signIn = (event) => {
  //   if ({ user: isAuthenticated } ) {
  //     event.preventDefault();
  //     login();

  //   } else {
  //     alert('Please register')
  //   }
  // }

  // const [isAuthint, setLogedIn] = useState(false);
  const { login, user } = useContext(AuthContext);
  // const signIn = (event) => {
  //   event.preverntDefault();
  //   if ({ user }) {
  //     login();
  //   } else {
  //     alert("Please sign up");
  //   }
  // };

  // if (user) {
  //   return <Redirect to="/CurrenciesList" />;
  // } else {
  //   alert("Please sign up");

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
            We'll never share your email with anyone else.
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
          <a href="/Resetpassword" style={a2Style}>
            Forgot Password ?
          </a>
        </div>
        <Button
          variant="warning"
          type="submit"
          style={buttonStyle}
          onClick={login}
        >
          Sign in
        </Button>
      </Form>
      <br />
      <a href="/" style={a2Style}>
        Back
      </a>
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
  marginTop: "3%",
  textDecoration: "underline",
  fontSize: 12,
};

const buttonStyle = {
  marginTop: 30,
  fontFamily: "Helvetica",
  fontWeight: "bold",
};

const a2Style = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 15,
  textDecoration: "underline",
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
  cursor: "pointer",
};

export default LogInScreen;

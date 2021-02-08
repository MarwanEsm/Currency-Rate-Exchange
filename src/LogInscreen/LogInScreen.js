import React, {useContext} from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useHistory } from "react-router-dom";
import { AuthContext } from '../Firebase/FireBaseAuth';


function LogInScreen() {
  // const { login } = useContext (AuthContext)
  const history = useHistory();
  const signInAndDisplayCurrenciesList = (event) => {
    event.preventDefault();
    history.push("/CurrenciesListScreen");
  };
  return (
    <div>
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
          onClick={signInAndDisplayCurrenciesList}
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
  cursor:'pointer',
};

export default LogInScreen;

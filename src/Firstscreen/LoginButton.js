import React from "react";
import { useHistory } from "react-router-dom";

function LoginButton() {
  const history = useHistory();
  const showLogInPage = (event) => {
    event.preventDefault();
    history.push("/LogInScreen");
  };
  return (
    <div>
      <button
        className="btn btn-warning"
        style={buttonStyle}
        onClick={showLogInPage}
      >
        Log In
      </button>
    </div>
  );
}

const buttonStyle = {
  marginTop: 60,
  marginBottom: 35,
  fontFamily: "Fantasy ",

  backgroundColor: "yellow",
};
export default LoginButton;

import React from "react";
import { useHistory } from "react-router-dom";


function LoginButton() {
  const history = useHistory();
  const showLogInPage = () => history.push("../Thirdscreen/LogInPage");
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
  marginTop: 35,
  fontFamily: "Helvetica",
  fontWeight: "bold",
};
export default LoginButton;

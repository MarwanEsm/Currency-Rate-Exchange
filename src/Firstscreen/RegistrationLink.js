import React from "react";


function RegistrationLink() {
  
  return (
    <div>
      <h3 style={h3Style}>Don't have an account?</h3>
          <a href='/RegistrationScreen/RegistrationScreen' style={aStyle}>
        Click here to register
      </a>
    </div>
  );
}

const h3Style = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 13,
  paddingTop: 20,
};

const aStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 12,
  paddingTop: 10,
  paddingBottom: 20,
};
export default RegistrationLink;

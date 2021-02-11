import React from "react";
import { Link } from "react-router-dom";



function RegistrationLink() {
  
  return (
    <div>
      <h3 style={h3Style}>Don't have an account?</h3>
          <Link hto ='/RegistrationScreen' style={aStyle}/>
        Click here to register
      
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
  textDecoration: "underline",
  paddingTop: 10,
  paddingBottom: 20,
  color: "#ff8000",
};

export default RegistrationLink;

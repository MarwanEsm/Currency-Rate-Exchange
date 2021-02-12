import React from "react";
import Currency from "../Photos/Currency.png";



function Icon() {
    return (
      <div>
        <img
          src={Currency}
          width="40%"
          alt="Responsive"
          className="img-thumbnail"
          style ={imageStyle}
        />
      </div>
    );
}

const imageStyle = {
  marginTop:'10%', 
  borderRadius:6, 
}























export default Icon;
import React from "react";
import Currency from "./Currency.png";



function Icon() {
    return (
      <div>
        <img
          src={Currency}
          width="40%"
          alt="Responsive image"
          className="img-thumbnail"
          style ={imageStyle}
        />
      </div>
    );
}

const imageStyle = {
  marginTop:50, 
  borderRadius:6, 
}























export default Icon
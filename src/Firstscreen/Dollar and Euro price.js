import React from "react";


function DollarAndEuroPrice() {
  return (
    <div style={divStyle}>
      <div>
        <h1 style={h1Style}>{"US Dollar $"}</h1>
        <h2 style={h2Style}>{"display Euro price"}</h2>
      </div>
      <div>
        <h1 style={h1Style}>{"Euro €"}</h1>
        <h2 style={h2Style}>{"display Dolalr price"}</h2>
      </div>
    </div>
  );
}

const h1Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 12,
  fontWeight: "bold",
  marginTop: 50,
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 12,
  fontWeight: "bold",
  marginTop: 10,
};

const divStyle = {
    display: 'flex',
    justifyContent:'space-around'
}
export default DollarAndEuroPrice;

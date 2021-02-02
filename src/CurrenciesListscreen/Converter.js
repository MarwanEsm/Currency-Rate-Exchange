import React, { useState } from "react";
import Button from "react-bootstrap/Button";

function Converter() {
  const [inputValue, setInputValue] = useState("");
  const updateInputValue = (event) => {
    const inValue = event.target.value;
    setInputValue(inValue);
  };

  const [outputValue, setOutputValue] = useState("");

  const convert = (event) => {
    const outputValue = inputValue;
    const outValue = event.target.value;
      setOutputValue(outValue);
      
    return (
      <div className="input-group">
        <input type="text" className="form-control" value={outValue} />
      </div>
    );
  };

  return (
    <div style={divStyle}>
      <div>
        <div class="input-group">
          <input
            type="number"
            className="form-control"
            value={inputValue}
            onChange={updateInputValue}
          />
        </div>
      </div>
      <div>
        <Button
          variant="warning"
          type="convert"
          style={buttonStyle}
          onClick={convert }
        >
          Convert
        </Button>
      </div>
      <br />
    </div>
  );
}

const divStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexDirection: "column",
};

const buttonStyle = {
  marginTop: 30,
  fontFamily: "Helvetica",
  fontWeight: "bold",
};

export default Converter;

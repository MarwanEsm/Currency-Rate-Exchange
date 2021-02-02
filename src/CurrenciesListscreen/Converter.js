import React, { useState } from "react";
import Button from "react-bootstrap/Button";

function Convert() {
  const [inputValue, setInputValue] = useState('');
  const updateInputValue = (event) => {
    const inValue = event.target.value;
    setInputValue(inValue);
  };

  const [outputValue, setOutputValue] = useState('');

  const convert = (event) => {
    const outputValue = inputValue;
    const outValue = event.target.value;
      setOutputValue(outValue);
      console.log(outputValue);

    // return (
    //   <div>
    //     <h2>hi</h2>
    //   </div>
    // );
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
          value={outputValue}
          style={buttonStyle}
          onClick={convert}
        >
          Convert
        </Button>
      </div>
      <br />
      {/* <div>
        <div className="input-group">
          <input type="text" className="form-control" value={outputValue} />
        </div> */}
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

export default Convert;

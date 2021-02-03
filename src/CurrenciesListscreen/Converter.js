import React, { useContext, useState } from "react";
import Button from "react-bootstrap/Button";
import { CurrenciesContext } from "../Components/CurrenciesContext";

function Converter() {
  const { exchangeRates, currencies } = useContext(CurrenciesContext);
  const [fromCurrency, setFromCurrency] = useState("");
  const updateInputValue = (event) => {
    const inValue = event.target.value;
    setFromCurrency(inValue);
  };

  const [toCurrency, setToCurrency] = useState("");
  const convert = () => {
    const selectedRate = Object.keys(exchangeRates.rates)[0];
    const toCurrency = fromCurrency * selectedRate;
    setToCurrency(selectedRate);
    console.log(selectedRate);

    // return (
    //   <div className="input-group">
    //     <input type="text" className="form-control" value={toCurrency} />
    //   </div>
    // );
  };

  return (
    <div style={divStyle}>
      <div>
        <div className="input-group">
          <input
            type="number"
            className="form-control"
            value={fromCurrency}
            onChange={updateInputValue}
          />
        </div>
      </div>
      <div>
        <div className="input-group">
          <input type="number" className="form-control" onChange ={convert} value={toCurrency} />
        </div>
      </div>
      <div>
        <Button
          variant="warning"
          type="convert"
          style={buttonStyle}
          onClick={convert}
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

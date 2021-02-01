import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Bootsrap from "react-bootstrap";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

function ExchangeRateList() {
  const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);
  console.log(exchangeRates);
  const { currency } = useParams();
  useEffect(() => {
    fetchExchangeRate(currency);
  }, []);

  return (
    <div style={divStyle}>
      <Form>
        <Form.Row>
          <Form.Group as={Col} style={groupStyle}>
            <Form.Label style={labelStyle}>Seacrh Curreny</Form.Label>
            <Form.Control
              type="text"
              placeholder="Type here"
            />
          </Form.Group>
        </Form.Row>
      </Form>

      <div>
        {exchangeRates &&
          Object.keys(exchangeRates.rates).map((key, i) => (
            <p key={i}>
              <span
                className="badge badge-pill badge-primary"
                style={spanStyle}
              >
                {key} &nbsp;
              </span>
              <span
                className="badge badge-pill badge-warning"
                style={spanStyle}
              >
                {exchangeRates.rates[key]}
              </span>
            </p>
          ))}
      </div>
    </div>
  );
}

const spanStyle = {
  fontSize: 13,
  fontFamily: "DejaVu Sans Mono, monospace", 
  wordSpacing: "5 em",
};

const labelStyle = {
  fontSize: 14,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  fontWeight: "bold",
};
const divStyle = {
  marginTop: "10%",
  marginBottom: "10%",

};

const groupStyle = {
  display: "flex",
  justifyContent: "center",
  width: "70%",
  marginLeft: "15%",
  marginRight: "15%",
  fontSize: 12,
};
export default ExchangeRateList;

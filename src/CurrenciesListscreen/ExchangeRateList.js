import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CurrenciesContext } from "../Components/CurrenciesContext";
import Convert from './Converter';
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

function ExchangeRateList() {
  const { fetchExchangeRate, exchangeRates } = useContext(CurrenciesContext);
  const { currency } = useParams();

  useEffect(() => {
    fetchExchangeRate(currency);
  }, []);


// const [searchedCurrency, setSearchedCurrency] = useState("");
//   const [searchedResults, setSearchedResults] = useState([]);
//   const displaySearchedCurrency = (event) => {
//     setSearchedCurrency = event.target.value;
//   };
//   useEffect(() => {
//     const results = exchangeRates.key.filter((exchangeRate) =>
//       exchangeRate.includes(searchedCurrency)
//     );
//   });
//   setSearchedResults(results);
//   [searchedCurrency];

//   return (
//     <div>
//       {searchedResults.map((searchedResult) => (
//         <p key={i}>
//           <span>{key} &nbsp;</span>
//           <span>{searchedResult.rates[key]}</span>
//         </p>
//       ))}
//       );
//     </div>
//   );
// }

  return (
    <div style={divStyle}>
      <Form >
        <Form.Row>
          <Form.Group as={Col} style={groupStyle}>
            <Form.Label style={labelStyle}>Seacrh Curreny</Form.Label>
            <Form.Control
              type="text"
              placeholder="Type here"
              /* onChange={this.props.displaySearchedCurrency}*/
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
              </span>{" "}
            
              <span
                className="badge badge-pill badge-warning"
                style={spanStyle}
              >
                {parseFloat(exchangeRates.rates[key]).toFixed(8)}
              </span>
            </p>
          ))}
        <Convert/>
      </div>
    </div>
  );
}

// function displaySearchedCurrency() {
//   useEffect(() => {
//     if (value === exchangeRates.key && (key = { i })) {
//       return (<div>{exchangeRates.rates[key]}</div>);
//     }
//   });
// }

const spanStyle = {
  fontSize: 15,
  fontFamily: "DejaVu Sans Mono, monospace",
  wordSpacing: "5 em",
  margin:20,
};

const labelStyle = {
  fontSize: 16,
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
  width: "60%",
  marginLeft: "15%",
  marginRight: "15%",
  fontSize: 12,
};


export default ExchangeRateList;

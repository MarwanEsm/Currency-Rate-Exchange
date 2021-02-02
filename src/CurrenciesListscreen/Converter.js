import React from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

function Convert() {
  return (
    <div style={divStyle}>
      <div>
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            aria-label="Amount (to the nearest dollar)"
          />
          <div class="input-group-append">
            <span class="input-group-text">
              {"enter the currency which was selected "}
            </span>
            <span class="input-group-text">0.00</span>
          </div>
        </div>
      </div>
      <div>
        <Button variant="warning" type="convert" style={buttonStyle}>
          Convert
        </Button>
      </div>
      <br />
      <div>
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            aria-label="Amount (to the nearest dollar)"
          />
          <div class="input-group-append">
            <span class="input-group-text">
              {"enter the currency which was selected "}
            </span>
            <span class="input-group-text">0.00</span>
          </div>
        </div>
      </div>
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

import React from "react";
import CurrenciesList from "./CurrenciesList";
import LandingScreenStyle from "../Style/LandingScreenStyle";
import ThreeDotsMenu from "../Style/ThreeDotsMenu";

function CurrenciesListScreen() {
  return (
    <div>
      <div style={div1Style}>
        <ThreeDotsMenu />
      </div>
      <LandingScreenStyle />
      <div style={divStyle}>
        <CurrenciesList />
      </div>
    </div>
  );
}

const divStyle = {
  position: "relative",
};

const div1Style = {
  fontFamily: "Fantasy ",
  fontSize: 20,
  backgroundColor: "#ffff00",
  width: "100%",
};

export default CurrenciesListScreen;

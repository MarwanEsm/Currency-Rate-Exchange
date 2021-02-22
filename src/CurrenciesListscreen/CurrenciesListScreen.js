import React from "react";
import CurrenciesList from "./CurrenciesList";
import NavBar from "../Style/NavBar";
import ThreeDotsMenu from "../Style/ThreeDotsMenu";

function CurrenciesListScreen() {
  return (
    <div>
      <div style={div1Style}>
        <ThreeDotsMenu />
      </div>
      <NavBar />
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
  fontSize: 10,
  backgroundColor: "#ffff00",
  width: "100%",
};

export default CurrenciesListScreen;

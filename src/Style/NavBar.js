import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import firebase from "../Firebase/FirebaseConfig";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import LandingScreenStyle from "./LandingScreenStyle";

function NavBar() {
  return (
    <div style={divStyle}>
      <LandingScreenStyle></LandingScreenStyle>
    </div>
  );
}

const divStyle = {
  height: "15%",
};

export default NavBar;

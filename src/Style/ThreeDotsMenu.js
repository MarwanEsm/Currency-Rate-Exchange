import React from "react";
import "../Style/Style.css";
import { Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ThreeDotsMenu() {
  return (
    <div>
      <Navbar collapseOnSelect expand="lg" bg="white">
        <Navbar.Brand href="#home"></Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="mr-auto">
            <Link to="/" style={textStyle}>
              Logout
            </Link>
            <Link to="/ChatScreen" style={textStyle}>
              Chat
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </div>
  );
}

const textStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontWeight: "bold",
  fontSize: 18,
  color: "#ffa31a",
  marginBottom: "3%",
};

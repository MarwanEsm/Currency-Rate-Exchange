import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { ChatContext } from "../Firebase/ChatContext";
import { Link } from "react-router-dom";

import { Nav, Navbar } from "react-bootstrap";
import Message from "./Message";

function ChatScreen() {
  const { messages, writeMessages } = useContext(ChatContext);

  let history = useHistory();
  const [body, setBody] = useState("");

  const updateText = (event) => {
    const newText = event.target.value;
    setBody(newText);
  };

  const handelWriteMessages = () => {
    writeMessages(body);
    setBody("");
  };

  const goBack = () => {
    history.push("/CurrenciesListScreen");
  };
  return (
    <div>
      <div style={div1Style}>
        <div>
          <Navbar collapseOnSelect expand="lg" bg="white">
            <Navbar.Brand href="#home"></Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="mr-auto">
                <Link to="/" style={textStyle}>
                  Logout
                </Link>

                <Link to="/ExchangeRateList" style={textStyle}>
                  Back
                </Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>
      </div>
      <div>
        <InputGroup className="mb-3" style={contro1lStyle}>
          <Form.Control
            type="message"
            placeholder="Type your message"
            aria-describedby="basic-addon2"
            value={body}
            onChange={updateText}
          />
          <InputGroup.Append>
            <Button
              variant="warning"
              onClick={handelWriteMessages}
              style={buttonStyle}
            >
              Send
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </div>
      {messages ? (
        messages.map((message, i) => {
          return <Message message={message} key={i} />;
        })
      ) : (
        <h2>...Loading</h2>
      )}
    </div>
  );
}

const contro1lStyle = {
  width: "70%",
  marginBottom: "10%",
  marginRight: "20%",
  marginTop: "5%",
  marginLeft: "13%",
};

const textStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 18,
  fontWeight: "bold",
  color: "#ffa31a",
  marginBottom: "3%",
};

const div1Style = {
  backgroundColor: "#ffff00",
  width: "100%",
  borderColor: "black",
  border: "bold",
};

const buttonStyle = {
  fontFamily: "Fantasy ",
  backgroundColor: "yellow",
};

export default ChatScreen;

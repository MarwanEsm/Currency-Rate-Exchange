import React, { useContext, useState, useEffect,  } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { ChatContext } from "../Firebase/ChatContext";
import { AuthContext } from "../Firebase/FireBaseAuth";
import firebase from "../Firebase/FirebaseConfig";
import { Link } from "react-router-dom";

function ChatScreen() {
  const { messages, writeMessages } = useContext(ChatContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const [body, setBody] = useState("");

  const updateText = (event) => {
    const newText = event.target.value;
    setBody(newText);
  };

  const handelWriteMessages = () => {
    writeMessages(body);
  };

  return (
    <div>
      <div style={divStyle}>
        <Link
          to="/ExchangeRateList"
          style={aStyle}
          onClick={() => firebase.auth().signOut()}
        >
          Back
        </Link>
        <Link to="/" style={aStyle} onClick={() => firebase.auth().signOut()}>
          Logout
        </Link>
      </div>

      <InputGroup className="mb-3" style={contro1lStyle}>
        <Form.Control
          type="message"
          placeholder="Type your message"
          aria-describedby="basic-addon2"
          value={body}
          onChange={updateText}
        />
        <InputGroup.Append>
          <Button variant="outline-secondary" onClick={handelWriteMessages}>
            Send
          </Button>
        </InputGroup.Append>
      </InputGroup>
      {messages ? (
        messages.map((message, index) => {
          return (
            <div>
              <h1 style={h1Style}>{message.firstName}</h1>
              <h2 style={h2Style}>{message.body}</h2>
              <h2 style={h2Style}>{message.timestamp.toString()}</h2>
            </div>
          );
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
  border: "bold",
  marginRight: "20%",
  marginTop: "10%",
  marginLeft: "14%",
};

const divStyle = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
};

const aStyle = {
  fontFamily: "Trebuchet MS, sans-serif ",
  fontSize: 13,
  textDecoration: "underline",
  color: "#ff8000",
  marginBottom: "10%",
  marginTop: "10%",
};

const h2Style = {
  fontSize: 15,
};

const h1Style = {
  fontSize: 12,
};
export default ChatScreen;

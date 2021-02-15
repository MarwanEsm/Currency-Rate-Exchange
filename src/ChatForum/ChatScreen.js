import React, { useContext, useState, useEffect } from "react";
import { useHistory } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { ChatContext } from "../Firebase/ChatContext";
import { AuthContext } from "../Firebase/FireBaseAuth";
import firebase from "../Firebase/FirebaseConfig";
import { Link } from "react-router-dom";
import Toast from "react-bootstrap/Toast";
import Back from "../Photos/Back.png";
import Logout from "../Photos/Logout.png";

function ChatScreen() {
  const { messages, writeMessages } = useContext(ChatContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  let history = useHistory();
  const [body, setBody] = useState("");

  const updateText = (event) => {
    const newText = event.target.value;
    setBody(newText);
  };

  const handelWriteMessages = () => {
    writeMessages(body);
  };

  const goBack =()=> {
    
    history.push("/CurrenciesListScreen");
  }

  return (
    <div>
      <div style={divStyle}>
        <div>
          <img src={Back} style={imagStyle} onClick={goBack} />
        </div>
        <div>
          <Link to="/" onClick={() => firebase.auth().signOut()}>
            <img src={Logout} style={imagStyle} />
          </Link>
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
        messages.map((message, index) => {
          return (
            <div style={div1Style}>
              <Toast>
                <Toast.Header>
                  <strong className="mr-auto">{message.firstName}</strong>
                  <h6 style={h6Style}>{message.timestamp.toLocaleTimeString()}</h6>
                </Toast.Header>
                <h2 style={h2Style}>{message.body}</h2>
              </Toast>
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
  marginRight: "20%",
  marginTop: "5%",
  marginLeft: "13%",
};

const h2Style = {
  fontSize: 13,
};

const h6Style = {
  fontSize: 8,
};

const div1Style = {
  marginLeft: "13%",
  width: "60%",
  marginTop: "15%",
};

const imagStyle = {
  width: 25,
};

const divStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "7%",
  marginBottom: "10%",
  marginLeft: "7%",
  marginRight: "7%",
};

const buttonStyle = {
  fontFamily: "Helvetica",
  fontWeight: "bold",
};

export default ChatScreen;

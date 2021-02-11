import React, { useContext, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { ChatContext } from "../Firebase/ChatContext";
import { AuthContext } from "../Firebase/FireBaseAuth";

function ChatScreen() {
  const { messages, writeMessages, getMessages } = useContext(ChatContext);
  const { isAuthenticated } = useContext(AuthContext);
  const [body, setBody] = useState('');
  const updateText = (event) => {
    const newText = event.target.value;
    setBody(newText);
  };

  const handelWriteMessages = () => {
    writeMessages(body);
  };

  return (
    <div>
      <InputGroup className="mb-3" style={contro1lStyle}>
        <Form.Control
          type='message'
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
              <h1>{message.dispalyName}</h1>
              <h2>{message.body}</h2>
            
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
  marginLeft: "20%",
};

export default ChatScreen;

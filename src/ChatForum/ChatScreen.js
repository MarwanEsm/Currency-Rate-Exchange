import React, { useContext, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { ChatContext } from "../Firebase/ChatContext";

function ChatScreen() {
  const { writeMessages } = useContext(ChatContext);
  const [text, setText] = useState();
  const updateText = (event) => {
    const newText = event.target.value;
    setText(newText);
   
  };

  const handelWriteMessages = (text) => {
    writeMessages(text);
    console.log(writeMessages);
  };

  return (
    <div>
      <InputGroup className="mb-3" style={contro1lStyle}>
        <Form.Control
          placeholder="Type your message"
          aria-describedby="basic-addon2"
          value={text}
          onChange={updateText}
        />
        <InputGroup.Append>
          <Button variant="outline-secondary" onClick={handelWriteMessages}>
            Send
          </Button>
        </InputGroup.Append>
      </InputGroup>
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

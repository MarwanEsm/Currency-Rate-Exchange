import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

function Chat() {
  const [text, setText] = useState();
  const updateText = (event) => {
    const newText = event.target.value;
    setText(newText);
  };

  // const [intialPosts, setInitialPosts] = useState();

  // const postText = (newText) => {
  //   return (
  //     <div>
  //       <h1>{newText}</h1>
  //     </div>
  //   );
  // };
  return (
    <div>
      {/* <InputGroup className="mb-3" style={controlStyle}>
        <Form.Control placeholder="" aria-describedby="basic-addon2"  />
        
      </InputGroup> */}
      <InputGroup className="mb-3" style={contro1lStyle}>
        <Form.Control
          placeholder="Type your message"
          aria-describedby="basic-addon2"
          value={text}
          onChange={updateText}
        />
        <InputGroup.Append>
          <Button variant="outline-secondary" onClick={postText}>
            Send
          </Button>
        </InputGroup.Append>
      </InputGroup>
    </div>
  );
}

// const controlStyle = {
//   width: "70%",
//   height: "70%",
//   marginBottom: "10%",
//   marginLeft: "20%",
//   marginRight: "20%",
//   marginTop: "10%",
//   border: "bold",
// };

const contro1lStyle = {
  width: "70%",
  marginBottom: "10%",
  border: "bold",
  marginRight: "20%",
  marginTop: "10%",
  marginLeft: "20%",
};

export default Chat;

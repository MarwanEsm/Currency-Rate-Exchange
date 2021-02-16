import React, { useState, useContext } from "react";
import PropTypes from "prop-types";
import Toast from "react-bootstrap/Toast";
import { AuthContext } from "../Firebase/FireBaseAuth";

const Message = ({ message }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [showToaster, setShowToaster] = useState(true);
  const closeToast = (event) => {
    event.preventDefault();
    setShowToaster(!showToaster);
  };

  const isUser = user.displayName === message.firstName;

  return (
    <Toast
      // key={message.uid}
      style={isUser ? div1Style : reverse}
      show={showToaster}
      onClose={closeToast}

      // className={
      //   user.firstName === !message.firstName ? reverse :''
      // }
    >
      <Toast.Header>
        <strong className="mr-auto">{message.firstName}</strong>
        <h6 style={h6Style}>{message.timestamp.toLocaleString()}</h6>
      </Toast.Header>
      <h2 style={h2Style}>{message.body}</h2>
    </Toast>

    /* } else {
            <div style={reverse}>
              <Toast>
                <Toast.Header>
                  <strong className="mr-auto">{message.firstName}</strong>
                  <h6 style={h6Style}>{message.timestamp.toLocaleString()}</h6>
                </Toast.Header>
                <h2 style={h2Style}>{message.body}</h2>
              </Toast>
            </div>;
          } */
  );
};

Message.propTypes = {};

export default Message;

const h2Style = {
  fontSize: 13,
};

const h6Style = {
  fontSize: 8,
};

const div1Style = {
  marginLeft: "13%",
  width: "40%",
  marginTop: "15%",
};
const reverse = {
  marginLeft: "30%",
  width: "60%",
  marginTop: "15%",
};

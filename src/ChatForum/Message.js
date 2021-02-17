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
    <div style={isUser ? div1Style : reverse}>
      <Toast show={showToaster} onClose={closeToast}>
        <Toast.Header>
          <strong className="mr-auto">{message.firstName}</strong>
          <h6 style={h6Style}>{message.timestamp.toLocaleString()}</h6>
        </Toast.Header>
        <h2 style={h2Style}>{message.body}</h2>
      </Toast>
    </div>
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
  marginLeft: "42%",
  width: "40%",
  marginTop: "15%",
};

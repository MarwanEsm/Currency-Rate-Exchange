import React, { createContext, useContext, useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../Firebase/FireBaseAuth";
import firebase from "../Firebase/FirebaseConfig";

const initContext = {
  messages: [],

  getMessages: () => {
    throw new Error("getMessages() is not implemented");
  },

  writeMessages: () => {
    throw new Error("write messages() is not implemented");
  },
};

export const ChatContext = createContext(initContext);
export const ChatContextProvider = ({ children }) => {
  const [messages, setMessages] = useState(initContext.messages);
  const histroy = useHistory();
  const { user } = useContext(AuthContext);
  const db = firebase.firestore();
  useEffect(() => {
    getMessages();
  });
  const getMessages = () => {
    db.collection("messages")
      .get()
      .then((querySnapshot) => {
        const messagesArray = [];
        querySnapshot.forEach((doc) => {
          messagesArray.push(doc.data());
        });
        setMessages(messagesArray);
      });
  };

  const writeMessages = async (body) => {
    db.collection("messages")
      .add({
        body,
        firstName: user.displayName,
        timestamp: new Date().toString(),
      })
      .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
        getMessages();
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
      });
  };

  return (
    <ChatContext.Provider value={{ messages, getMessages, writeMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider;

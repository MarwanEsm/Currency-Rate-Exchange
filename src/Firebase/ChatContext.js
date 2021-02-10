import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthContext } from "../Firebase/FireBaseAuth";
import firebase from "../Firebase/FirebaseConfig";

const initContext = {
  messages: [],

  getMessages() {
    throw new Error("getMessages() is not implemented");
  },

  writeMessages() {
    throw new Error("write messages() is not implemented");
  },
};

export const ChatContext = createContext(initContext);
export const ChatContextProvider = ({ children }) => {
  const [messages, setMessages] = useSatet(initContext.messages);
  const { user } = useContext(AuthContext);
  const db = firebase.firestore();

  const getMessages = () => {
    db.collection("messages")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const messagesArray = [];
          messagesArray.push(doc.data());
        });
        setMessages(messagesArray);
      });
  };

  const writeMessages = () => {
    db.collection("messages")
      .add({
        body,
        userName: user.firstName,
        timeStamp: new Date(),
      })
      .then((docRef) => {
        getMessages();
      });
  };

  return (
    <ChatContext.Provider value={{ messages, getMessages, writeMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

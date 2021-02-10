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
      .then((querySnapshots) => {
        querySnapshot.forEach((doc) => {
          const messagesArray = [];
          messagesArray.push(doc.data());
        });
        setMessages(messagesArray);
      });
  };
};

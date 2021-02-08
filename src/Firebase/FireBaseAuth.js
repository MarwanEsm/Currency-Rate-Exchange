import React, { createContext, useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import firebase from "./FirebaseConfig";
// import firebase from "firebase/app";


const initContext = {
  user: null,
  login: () => {
    throw new Error("login () not implemented");
  },
  register: () => {
    throw new Error("register() not implemented");
  },
};

export const AuthContext = createContext(initContext);
export const AuthContextProvider = ({ children }) => {
  const history = useHistory();
  const db = firebase.firestore();
  const [user, setUser] = useState(initContext.user);

  const register = ({ email, password, name }) => {
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        console.log("user", user);
        db.collection("user").doc(user.uid).set({ name: name });
      })

      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage, errorCode);
      });
  };

  const login = async ({ email, password }) => {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setUser(user);
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage, errorCode);
      });
  };

  return (
    <AuthContext.Provider value={{ user, login, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

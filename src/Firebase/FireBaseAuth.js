import React, { createContext, useState } from "react";
import { useHistory } from "react-router-dom";
import firebase from "./FirebaseConfig";

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
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  let history = useHistory();
  const db = firebase.firestore();

  const register = ({ email, password, name }) => {
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        console.log("user", user);

        setUser(user);
        setIsAuthenticated(true);
        db.collection("user").doc(user.uid).set({ name });
      })

      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
      });
  };

  const login = async ({ email, password }) => {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setUser(user);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
      });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

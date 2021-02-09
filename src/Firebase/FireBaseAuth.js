import React, { createContext, useState, useEffect } from "react";
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
  const db = firebase.firestore();
  const [user, setUser] = useState(initContext.user);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  let history = useHistory();
  useEffect(() => {
    firebase.auth().onAuthStateChanged(setUser);
  }, []);

  const register = ({ email, password, firstName, lastName }) => {
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        console.log("user", user);
        db.collection("user").doc(user.uid).set({
          firstName: firstName,
          lastName: lastName,
        });
      })

      .catch((error) => {
        var errorMessage = error.message;
        console.log("error", errorMessage);
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
        var errorMessage = error.message;
        console.log("error", errorMessage);
      });
  };

  return (
    <AuthContext.Provider value={{ user, login, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

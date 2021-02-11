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
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
      }
    });
  }, []);

  const register = ({ email, password, firstName, lastName }) => {
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        
        user
          .updateProfile({
            displayName: firstName,
            photoURL: "https://example.com/jane-q-user/profile.jpg",
          })
          .then(function () {
           console.log("user", user);
            const { email, firstName } = user;
            setUser( user );
            setIsAuthenticated(true);
          })
          .catch(function (error) {});
        db.collection("user").doc(user.uid).set({
          firstName: firstName,
          lastName: lastName,
        });
      })

      .catch((error) => {
        var errorCode = error.code;
        console.log("error", errorCode);
      });
  };

  const login = async ({ email, password }) => {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setUser(user);
        console.log(user);
        history.push("/CurrenciesListScreen");
      })
      .catch((error) => {
        var errorMessage = error.message;
        alert(errorMessage, "Please signup");
        console.log("error", errorMessage);
      });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

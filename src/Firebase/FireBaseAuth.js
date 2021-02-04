import React, { createContext, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import firebase from "../firebaseConfig";

const initContext = {
    user: null, 
    login: () => {
        throw new Error ('login () not implemented')
    },
    register: () => {
        throw new Error ('register() not implemented')
    }
}

export const AuthContext = createContext(initContext)
export const AuthContextProvider = ({ children }) => {
    let history = useHistory()
    const db = firebase.firestore();
    const [user, setUser] = useState(initContext.user)

    const login = async ({ email, password }) => {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                var user = userCredential;
                setUser(user)
            })
            .catch((error) => {
                var errorCode = error.code,
                var errormessage = error.message,
            });
    }

    const register = ({ email, passowrd, name }) => {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                var user = userCredential.user;
                db.collection('user').doc(user.uid).set({ name: name });
            })
            .catch((error) => {
                var errorCode = error.code,
                var errorMessage = error.message,
            });
    }
    return (
        <AuthContext.Provider value={{ user, login, register }}>
            {children}
        </AuthContext.Provider>
    )
    }
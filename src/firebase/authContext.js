// authContext.js

import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig"; // Import Firebase initialization

export const AuthContext = createContext();
export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = getAuth(app).onAuthStateChanged(user => {
            if (user) {
                setUser(user);
                setIsAuthenticated(true);
            }
        });
        return () => unsubscribe();
    }, []);

    const register = ({ email, password, firstName }) => {

        createUserWithEmailAndPassword(getAuth(app), email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {
                    await updateProfile(user, { displayName: firstName });
                    setUser(user);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Error updating profile:", error);
                }
            })
            .catch((error) => {
                console.error("Error registering:", error);
            });
    };

    const login = async ({ email, password }) => {
        signInWithEmailAndPassword(getAuth(app), email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                setUser(user);
                setIsAuthenticated(true);
                navigate("/currencies");
            })
            .catch((error) => {
                const errorMessage = error.message;
                alert(errorMessage, "Please signup");
                console.error("Error logging in:", errorMessage);
            });
    };


    return (
        <AuthContext.Provider value={{ user, register, login, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

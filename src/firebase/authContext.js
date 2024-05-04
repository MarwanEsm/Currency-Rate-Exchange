import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig";

const ERRORS = {
    "User already exists": 0,
    "Registration email error": 1,
    "Error updating profile": 2,
    "Error registering": 3
};

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

    const onError = (error, additionalInfo) => {
        switch (error) {
            case ERRORS["User already exists"]:
                console.error("User already exists with email:", additionalInfo);
                // Handle user already exists error
                break;
            case ERRORS["Registration email error"]:
                console.error("Error with registration email:", additionalInfo);
                // Handle registration email error
                break;
            case ERRORS["Error updating profile"]:
                console.error("Error updating profile:", additionalInfo);
                // Handle error updating profile
                break;
            case ERRORS["Error registering"]:
                console.error("Error registering:", additionalInfo);
                // Handle error registering
                break;
            default:
                console.error("Unknown error occurred:", error, additionalInfo);
            // Handle unknown error
        }
    };

    const register = async ({ email, password, firstName }) => {
        // Check if user already exists
        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (existingUser) {
                onError(ERRORS["User already exists"], existingUser.email);
                return;
            }
        } catch (error) {
            onError(ERRORS["Registration email error"], email);
        }

        // Proceed with user registration
        createUserWithEmailAndPassword(getAuth(app), email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {
                    await updateProfile(user, { displayName: firstName });
                    await sendEmailVerification(user); // Send email verification
                    setUser(user);
                    setIsAuthenticated(true);
                } catch (error) {
                    onError(ERRORS["Error updating profile"], error);
                }
            })
            .catch((error) => {
                onError(ERRORS["Error registering"], error);
            });
    };

    const login = async ({ email, password }) => {
        // Check if user is already registered
        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (!existingUser) {
                onError("No user");
                return;
            }
        } catch (error) {
            onError("error");
        }

        // Proceed with user login
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
        <AuthContext.Provider value={{ user, register, login, isAuthenticated, onError }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

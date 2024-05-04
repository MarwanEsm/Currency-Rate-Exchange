import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig";
import { useDispatch } from "react-redux";


const ERRORS = {
    "User already exists": 0,
    "Registration email error": 1,
    "Error updating profile": 2,
    "Error registering": 3,
    "No user exists": 4,
    "Could not register": 5,
    "Please sign up first": 6,
    "Invalid credentials": 7
};

// const SUCCESSES = {

// }

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorCode, setErrorCode] = useState(null)

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


    const register = async ({ email, password, firstName }) => {
        // Check if user already exists
        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (existingUser) {
                setErrorCode(ERRORS["User already exists"], existingUser.email)
            }
        } catch (error) {
            setErrorCode(ERRORS["Registration email error"], email)
        }

        // Proceed with user registration
        createUserWithEmailAndPassword(getAuth(app), email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {
                    await updateProfile(user, { displayName: firstName });
                    await sendEmailVerification(user);
                    setUser(user);
                    setIsAuthenticated(true);
                } catch (error) {
                    setErrorCode(ERRORS["Error updating profile"])
                }
            })
            .catch((error) => {
                setErrorCode(ERRORS["Error registering"])
            });
    };

    const login = async ({ email, password }) => {
        // Check if user is already registered
        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (!existingUser) {
                setErrorCode(ERRORS["No user exists"])
            }
        } catch (error) {
            setErrorCode(ERRORS["Please sign up first"])
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
                setErrorCode(ERRORS["Invalid credentials"])
            });
    };

    return (
        <AuthContext.Provider value={{ user, register, login, isAuthenticated, errorCode }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

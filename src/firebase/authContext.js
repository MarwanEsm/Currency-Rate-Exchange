import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig";



const ERRORS = {
    "Error": 0,
    "User already exists": 1,
    "Error updating profile": 2,
    "Registration failed": 3,
    "Please sign up first": 4,
    "Invalid credentials": 5
};

const SUCCESSES = {
    "Success": 0,
    "Registration successful": 1
}

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    // const [successCode, setSuccessCode] = useState(false);
    // const [errorCode, setErrorCode] = useState(null)

    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = getAuth(app).onAuthStateChanged(user => {
            if (user) {
                setUser(user);
            }
        });
        return () => unsubscribe();
    }, []);


    const register = async ({ email, password, firstName }, onRegistrationSuccess, onRegistrationFailure) => {

        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (existingUser) {
                onRegistrationFailure(ERRORS["User already exists"], existingUser.email)
            }
        } catch (error) {
            onRegistrationFailure(ERRORS["Error registering"], email)
        }

        // Proceed with user registration
        createUserWithEmailAndPassword(getAuth(app), email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {
                    await updateProfile(user, { displayName: firstName });
                    await sendEmailVerification(user);
                    setUser(user);
                    onRegistrationSuccess(SUCCESSES["Registration successful"]);
                } catch (error) {
                    onRegistrationFailure(ERRORS["Error updating profile"])
                }
            })
            .catch((error) => {
                onRegistrationFailure(ERRORS["Registration failed"])
            });
    };

    const login = async ({ email, password }, onLoginFailure) => {
        // Check if user is already registered
        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (!existingUser) {
                onLoginFailure(ERRORS["Please sign up first"])
            }
        } catch (error) {
            onLoginFailure(ERRORS["Error"])
        }

        // Proceed with user login
        signInWithEmailAndPassword(getAuth(app), email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                setUser(user);
                navigate("/currencies");
            })
            .catch((error) => {
                onLoginFailure(ERRORS["Invalid credentials"])
            });
    };

    return (
        <AuthContext.Provider value={{ user, register, login }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

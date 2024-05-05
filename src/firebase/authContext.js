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
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = getAuth(app).onAuthStateChanged(user => {
            if (user) {
                setUser(user);
                setIsAuthenticated(true)
            }
        });
        return () => unsubscribe();
    }, []);


    const register = async ({ email, password, firstName }, onRegistrationSuccess, onRegistrationFailure) => {
        try {
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
                    onRegistrationFailure(ERRORS["User already exists"])
                });
        }
        catch (error) {
            onRegistrationFailure(ERRORS["Registration failed"])
        }
    };

    const login = async ({ email, password }, onLoginFailure) => {

        try {
            const existingUser = await getAuth(app).getUserByEmail(email);
            if (!existingUser) {
                onLoginFailure(ERRORS["Please sign up first"])
            }
        } catch (error) {
            onLoginFailure(ERRORS["Error"])
        }

        signInWithEmailAndPassword(getAuth(app), email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                setUser(user);
                setIsAuthenticated(true)
                navigate("/currencies");
            })
            .catch((error) => {
                onLoginFailure(ERRORS["Invalid credentials"])
            });
    };


    return (
        <AuthContext.Provider value={{ user, register, login, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

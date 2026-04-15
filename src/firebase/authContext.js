import React, { createContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut, signInWithEmailAndPassword } from "firebase/auth";
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

const getRegistrationErrorCode = (error) => {
    switch (error?.code) {
        case "auth/email-already-in-use":
            return ERRORS["User already exists"];
        case "auth/invalid-email":
        case "auth/weak-password":
            return ERRORS["Registration failed"];
        default:
            return ERRORS["Error"];
    }
};

const getLoginErrorCode = (error) => {
    switch (error?.code) {
        case "auth/invalid-email":
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return ERRORS["Invalid credentials"];
        default:
            return ERRORS["Error"];
    }
};

export const AuthContext = createContext();
export const AuthContextProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = getAuth(app).onAuthStateChanged(user => {
            if (user) {
                setUser(user);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const register = async ({ email, password, firstName }, onRegistrationSuccess, onRegistrationFailure) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(getAuth(app), email, password);
            const registeredUser = userCredential.user;
            await updateProfile(registeredUser, { displayName: firstName });
            await sendEmailVerification(registeredUser);
            setUser(registeredUser);
            setIsAuthenticated(true);
            onRegistrationSuccess(SUCCESSES["Registration successful"]);
        } catch (error) {
            const errorCode = error?.code === "auth/user-token-expired"
                ? ERRORS["Error updating profile"]
                : getRegistrationErrorCode(error);
            onRegistrationFailure(errorCode);
        }
    };

    const login = async ({ email, password }, onLoginFailure) => {
        const auth = getAuth(app);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = userCredential.user;
            setUser(loggedInUser);
            setIsAuthenticated(true);
            router.push("/currencies");
            return loggedInUser;
        } catch (error) {
            onLoginFailure(getLoginErrorCode(error));
            return null;
        }
    };

    const logout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
            router.push("/");
        } catch (error) {
            console.error("sign out error", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, register, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

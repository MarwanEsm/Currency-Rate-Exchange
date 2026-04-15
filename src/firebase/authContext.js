import React, { createContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { app } from "@/firebase/firebaseConfig";

export const AUTH_ERROR_CODES = {
    UNKNOWN: "unknown_error",
    USER_ALREADY_EXISTS: "user_already_exists",
    PROFILE_UPDATE_FAILED: "profile_update_failed",
    REGISTRATION_FAILED: "registration_failed",
    INVALID_CREDENTIALS: "invalid_credentials",
};

export const AUTH_SUCCESS_CODES = {
    REGISTRATION_SUCCESSFUL: "registration_successful",
};

const getRegistrationErrorCode = (error) => {
    switch (error?.code) {
        case "auth/email-already-in-use":
            return AUTH_ERROR_CODES.USER_ALREADY_EXISTS;
        case "auth/invalid-email":
        case "auth/weak-password":
            return AUTH_ERROR_CODES.REGISTRATION_FAILED;
        default:
            return AUTH_ERROR_CODES.UNKNOWN;
    }
};

const getLoginErrorCode = (error) => {
    switch (error?.code) {
        case "auth/invalid-email":
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return AUTH_ERROR_CODES.INVALID_CREDENTIALS;
        default:
            return AUTH_ERROR_CODES.UNKNOWN;
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
            onRegistrationSuccess(AUTH_SUCCESS_CODES.REGISTRATION_SUCCESSFUL);
        } catch (error) {
            const errorCode = error?.code === "auth/user-token-expired"
                ? AUTH_ERROR_CODES.PROFILE_UPDATE_FAILED
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

    const resetPassword = async (email) => {
        const auth = getAuth(app);
        try {
            await sendPasswordResetEmail(auth, email);
            return true;
        } catch (error) {
            console.error("password reset error", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, register, login, logout, resetPassword, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

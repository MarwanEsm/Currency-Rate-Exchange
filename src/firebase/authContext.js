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
            createUserWithEmailAndPassword(getAuth(app), email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    try {
                        await updateProfile(user, { displayName: firstName });
                        await sendEmailVerification(user);
                        setUser(user);
                        setIsAuthenticated(true);
                        onRegistrationSuccess(SUCCESSES["Registration successful"]);
                    } catch (error) {
                        onRegistrationFailure(ERRORS["Error updating profile"]);
                    }
                })
                .catch((error) => {
                    onRegistrationFailure(ERRORS["User already exists"]);
                });
        } catch (error) {
            onRegistrationFailure(ERRORS["Registration failed"]);
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
            onLoginFailure(ERRORS["Invalid credentials"]);
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
            console.log("sign out error", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, register, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

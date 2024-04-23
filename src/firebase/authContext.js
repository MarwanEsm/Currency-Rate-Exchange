import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, firestore } from "./firebaseConfig"; // Import auth and firestore

export const AuthContext = createContext(); // No need to pass initialContext

export const AuthContextProvider = ({ children }) => {
    // State variables
    const [user, setUser] = useState(null); // Initialize user state to null
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // History hook
    const navigate = useNavigate();

    // Effect hook to listen for authentication changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                setUser(user);
                setIsAuthenticated(true);
            }
        });
        return () => unsubscribe();
    }, []);

    // Register function
    const register = ({ email, password, firstName, lastName }) => {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                user.updateProfile({ displayName: firstName })
                    .then(() => {
                        setUser(user);
                        setIsAuthenticated(true);
                    })
                    .catch(error => console.error("Error updating profile:", error));
                firestore.collection("user").doc(user.uid).set({
                    firstName: firstName,
                    lastName: lastName,
                });
            })
            .catch((error) => {
                console.error("Error registering:", error);
            });
    };

    // Login function
    const login = async ({ email, password }) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            setUser(user);
            navigate("/CurrenciesListScreen");
        } catch (error) {
            console.error("Error logging in:", error);
            alert(error.message);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContextProvider;

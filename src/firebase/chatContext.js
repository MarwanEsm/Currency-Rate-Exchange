import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthContext } from "./authContext";
import { firebaseApp } from "./firebaseConfig"; // Import firebaseApp to access Firestore
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore"; // Import necessary Firestore functions


// Initial context values
const initialContext = {
    messages: [],
    getMessages: () => {
        throw new Error("getMessages() is not implemented");
    },
    writeMessages: () => {
        throw new Error("writeMessages() is not implemented");
    },
};

export const ChatContext = createContext(initialContext);

export const ChatContextProvider = ({ children }) => {
    // State variables
    const [messages, setMessages] = useState(initialContext.messages);
    const { user } = useContext(AuthContext);
    const db = getFirestore(firebaseApp); // Initialize Firestore instance

    // Effect hook to get messages on component mount
    useEffect(() => {
        getMessages();
    }, []);

    // Function to retrieve messages from Firestore
    const getMessages = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "messages")); // Use collection() and getDocs() to fetch messages
            const messagesArray = [];
            querySnapshot.forEach((doc) => {
                messagesArray.push(doc.data());
            });
            setMessages(messagesArray);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    // Function to write a new message to Firestore
    const writeMessages = async (body) => {
        try {
            await addDoc(collection(db, "messages"), { // Use collection() and addDoc() to add a new message
                body,
                firstName: user.displayName,
                timestamp: new Date().toLocaleString(),
            });
            getMessages(); // Refresh messages after writing
        } catch (error) {
            console.error("Error adding document:", error);
        }
    };

    return (
        <ChatContext.Provider value={{ messages, getMessages, writeMessages }}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContextProvider;

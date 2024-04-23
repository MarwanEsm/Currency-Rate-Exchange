import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthContext } from "./authContext";
import firebase from "./firebaseConfig"

// Initial context values
const initialContext = {
    messages: [],
    getMessages: () => {
        throw new Error("getMessages() is not implemented");
    },
    writeMessages: () => {
        throw new Error("write messages() is not implemented");
    },
};

export const ChatContext = createContext(initialContext);

export const ChatContextProvider = ({ children }) => {
    // State variables
    const [messages, setMessages] = useState(initialContext.messages);
    const { user } = useContext(AuthContext);
    const db = firebase.firestore();

    // Effect hook to get messages on component mount
    useEffect(() => {
        getMessages();
    }, []);

    // Function to retrieve messages from Firestore
    const getMessages = () => {
        db.collection("messages")
            .get()
            .then((querySnapshot) => {
                const messagesArray = [];
                querySnapshot.forEach((doc) => {
                    messagesArray.push(doc.data());
                });
                setMessages(messagesArray);
            })
            .catch((error) => {
                console.error("Error fetching messages:", error);
            });
    };

    // Function to write a new message to Firestore
    const writeMessages = async (body) => {
        try {
            const docRef = await db.collection("messages").add({
                body,
                firstName: user.displayName,
                timestamp: new Date().toLocaleString(),
            });
            console.log("Document written with ID:", docRef.id);
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

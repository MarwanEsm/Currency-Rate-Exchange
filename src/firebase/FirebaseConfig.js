import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAXaxNct1q5yhiiom6HSaBMWrbCqGPV_WA",
    authDomain: "curreny-exchange-rate.firebaseapp.com",
    databaseURL: "https://curreny-exchange-rate-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "curreny-exchange-rate",
    storageBucket: "curreny-exchange-rate.appspot.com",
    messagingSenderId: "49297494787",
    appId: "1:49297494787:web:c999833dd0dad7fcd44f36"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Get Auth and Firestore instances
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export { auth, firestore, firebaseApp };

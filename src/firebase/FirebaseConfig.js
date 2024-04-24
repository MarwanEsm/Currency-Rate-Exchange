// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDwk-mGmYP_dQdUwKPXcbZcSs0uUs4mXUg",
    authDomain: "currency-exchange-d9615.firebaseapp.com",
    projectId: "currency-exchange-d9615",
    storageBucket: "currency-exchange-d9615.appspot.com",
    messagingSenderId: "677786325381",
    appId: "1:677786325381:web:2427f2543b7c7dd61e74ec",
    measurementId: "G-992H5MPSFR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
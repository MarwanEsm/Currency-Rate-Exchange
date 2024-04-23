// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebase = {
    apiKey: "AIzaSyAXaxNct1q5yhiiom6HSaBMWrbCqGPV_WA",
    authDomain: "curreny-exchange-rate.firebaseapp.com",
    databaseURL: "https://curreny-exchange-rate-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "curreny-exchange-rate",
    storageBucket: "curreny-exchange-rate.appspot.com",
    messagingSenderId: "49297494787",
    appId: "1:49297494787:web:c999833dd0dad7fcd44f36"
};

// Initialize Firebase
export const app = initializeApp(firebase);
export default firebase
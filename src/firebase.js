// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAL2mCMWL-FO9HEnmoMf5LTDFIVCzoElF8",
  authDomain: "rdc1-df539.firebaseapp.com",
  projectId: "rdc1-df539",
  storageBucket: "rdc1-df539.firebasestorage.app",
  messagingSenderId: "135166712876",
  appId: "1:135166712876:web:340ab0cb557875c24dc589",
  measurementId: "G-MD185MW9QM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);      // Firestore database
export const auth = getAuth(app);         // Firebase Auth
export const analytics = getAnalytics(app); // Analytics (optional)

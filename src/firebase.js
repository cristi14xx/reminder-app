import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configurația ta Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_y8567MQFzQ_ljA7ANPWmlZyb2JEw5Nc",
  authDomain: "smartreminder-20a59.firebaseapp.com",
  projectId: "smartreminder-20a59",
  storageBucket: "smartreminder-20a59.firebasestorage.app",
  messagingSenderId: "818104756873",
  appId: "1:818104756873:web:cd968c66753217db247458"
};

// Inițializare
const app = initializeApp(firebaseConfig);

// Exportăm serviciile pentru a fi folosite în App.jsx
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
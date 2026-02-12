import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQqVr1ZbLrmafuzi6vH5vhfM6x5cqr_cs",
  authDomain: "chat-web-app-b1dfa.firebaseapp.com",
  projectId: "chat-web-app-b1dfa",
  storageBucket: "chat-web-app-b1dfa.firebasestorage.app",
  messagingSenderId: "15341298272",
  appId: "1:15341298272:web:20082c85a22abdc2341905"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

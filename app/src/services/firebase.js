import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ⚠️ Move to environment variables before production.
const firebaseConfig = {
  apiKey: "AIzaSyBvTVwuWT-sS7DqBmC0EpqJbg_DaT7PlXM",
  authDomain: "baby-tracker-001.firebaseapp.com",
  projectId: "baby-tracker-001",
  storageBucket: "baby-tracker-001.firebasestorage.app",
  messagingSenderId: "519425016604",
  appId: "1:519425016604:web:141420d0ca7291a5db30d9",
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);

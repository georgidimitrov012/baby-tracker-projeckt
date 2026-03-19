import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const storage = getStorage(app);

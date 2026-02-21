import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Register a new user.
 * Creates the Firebase Auth account AND a Firestore user profile doc.
 * Also creates their first baby automatically so the app works immediately.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<UserCredential>}
 */
export async function registerUser(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name on the Auth profile
  await updateProfile(user, { displayName });

  // Create the Firestore user document
  await setDoc(doc(db, "users", user.uid), {
    email,
    displayName,
    createdAt: serverTimestamp(),
  });

  return credential;
}

/**
 * Log in an existing user.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Log out the current user.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  return signOut(auth);
}

/**
 * Subscribe to auth state changes.
 * Returns the Firebase user object or null.
 * Call the returned unsubscribe function on cleanup.
 *
 * @param {function} callback - called with (user | null)
 * @returns {function} unsubscribe
 */
export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

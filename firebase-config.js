import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_API_KEY } from "./keys.js";

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "smartyasemin-e1b59.firebaseapp.com",
  projectId: "smartyasemin-e1b59",
  storageBucket: "smartyasemin-e1b59.firebasestorage.app",
  messagingSenderId: "661216873015",
  appId: "1:661216873015:web:97398f426549555cee8db2",
  measurementId: "G-40RLN02L82"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc, getDoc, onSnapshot };

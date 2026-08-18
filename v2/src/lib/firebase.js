import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc,
  addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore'

// Firebase istemci yapılandırması tarayıcıya gömülür — bu normaldir ve
// güvenlik Firestore Rules ile sağlanır (bkz. firestore.rules).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'smartyasemin-e1b59.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'smartyasemin-e1b59',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'smartyasemin-e1b59.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '661216873015',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:661216873015:web:97398f426549555cee8db2',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export {
  collection, doc,
  addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
}

/* ─────────── Koleksiyon yolları tek yerde ───────────
   Eski sürümdeki yolların birebir aynısı — mevcut veriler korunur. */
export const PATHS = {
  moodYasemin: 'myMode',
  moodKagan: 'myMode_kagan',
  address: 'address',
  notifications: 'Notifications',
  love: 'Love',
  wishes: 'Wishes',
  wardrobe: 'Wardrobe',
  settings: 'settings',
  diaryEntries: (owner) => ['Daily', owner, 'entries'],
  diaryPassword: (owner) => ['Daily', owner, 'settings', 'passwordDoc'],
  watchedMovies: ['Daily', 'Films', 'watchedMovies'],
  wishlistItems: ['Daily', 'Wishlist', 'Items'],
}

export const DIARY_OWNERS = {
  yasemin: { key: 'Diary', label: "Yasemin'in Günlüğü", fallbackPass: '12345' },
  kagan: { key: 'Kagan_Diary', label: "Kağan'ın Günlüğü", fallbackPass: 'yasemin' },
}

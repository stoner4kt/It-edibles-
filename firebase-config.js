// Firebase Configuration for OG EDIBLES1738
// ⚠️ IMPORTANT: Replace these values with your own Firebase project credentials
// Get them from: https://console.firebase.google.com → Project Settings → Your Apps

const firebaseConfig = {
  apiKey: "AIzaSyAyK4Qz97IGtNsZFAZT3ReLT19GHpvgyGQ",
  authDomain: "og-edibles---reviews.firebaseapp.com",
  projectId: "og-edibles---reviews",
  storageBucket: "og-edibles---reviews.firebasestorage.app",
  messagingSenderId: "932728051152",
  appId: "1:932728051152:web:3ff2345af63c91e691d5d5",
  measurementId: "G-BL0XW6REQX"
};

// Initialize Firebase (guard against duplicate initialization)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Firebase service references
const auth = firebase.auth();
const db   = firebase.firestore();
const storage = firebase.storage();

// ─────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Firestore Database (start in test mode)
// 3. Enable Firebase Storage
// 4. Enable Email/Password Authentication
// 5. Paste your config above
//
// FIRESTORE RULES:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
//     match /orders/{doc}   { allow read: if request.auth != null; allow create: if true; }
//     match /reviews/{doc}  { allow read: if true; allow create: if true; allow write: if request.auth != null; }
//     match /admins/{doc}   { allow read, write: if request.auth != null; }
//   }
// }
//
// STORAGE RULES:
// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /{allPaths=**} { allow read, write: if true; }
//   }
// }
//
// ADMIN SETUP:
// Create admin user in Firebase Auth console.
// Then add their UID to Firestore: Collection "admins" → Document = UID → { isAdmin: true }
// ─────────────────────────────────────────────

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFPXqjPp6_hgAKTTbwToS4m5wL8MJLSvQ",
  authDomain: "forrestcarrentsystem.firebaseapp.com",
  projectId: "forrestcarrentsystem",
  storageBucket: "forrestcarrentsystem.firebasestorage.app",
  messagingSenderId: "717797607332",
  appId: "1:717797607332:web:e329ba6873eb65fa3ce331",
  measurementId: ""
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

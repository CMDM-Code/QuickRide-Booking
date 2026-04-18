import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAFPXqjPp6_hgAKTTbwToS4m5wL8MJLSvQ",
  authDomain: "forrestcarrentsystem.firebaseapp.com",
  projectId: "forrestcarrentsystem",
  storageBucket: "forrestcarrentsystem.firebasestorage.app",
  messagingSenderId: "717797607332",
  appId: "1:717797607332:web:e329ba6873eb65fa3ce331",
  measurementId: ""
};

// Only initialize if credentials are present — prevents silent Firestore failures
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

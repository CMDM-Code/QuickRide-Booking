import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFPXqjPp6_hgAKTTbwToS4m5wL8MJLSvQ",
  authDomain: "forrestcarrentsystem.firebaseapp.com",
  databaseURL: "https://forrestcarrentsystem-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "forrestcarrentsystem",
  storageBucket: "forrestcarrentsystem.firebasestorage.app",
  messagingSenderId: "717797607332",
  appId: "1:717797607332:web:053ddf3dd92b6b673ce331",
  measurementId: "G-93T9BM8YVW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRead() {
  try {
    const snap = await getDocs(collection(db, "vehicles"));
    console.log(`✅ Read successful! Found ${snap.size} vehicles.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Read failed:", err.message);
    process.exit(1);
  }
}

testRead();

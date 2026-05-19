import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, collection } from "firebase/firestore";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const LOCATION_DATA = {
  'Region XI (Davao Region)': {
    'Davao del Norte': ['Tagum City', 'Panabo City', 'Island Garden City of Samal', 'Carmen', 'Asuncion'],
    'Davao del Sur': ['Digos City', 'Hagonoy', 'Kiblawan', 'Padada', 'Sulop'],
    'Davao de Oro': ['Nabunturan', 'Montevista', 'Mawab', 'Monkayo', 'Compostela'],
    'Davao Occidental': ['Jose Abad Santos', 'Don Marcelino', 'Malita', 'Sarangani', 'Santa Maria'],
    'Davao Oriental': ['Mati City', 'Baganga', 'Caraga', 'Boston', 'Cateel'],
    'Davao City': ['Davao City'],
  },
  'Region XII (SOCCSKSARGEN)': {
    'South Cotabato': ['General Santos City', 'Koronadal City', 'Surallah', 'Tboli', 'Banga'],
    'Sarangani': ['Alabel', 'Malapatan', 'Glan', 'Maasim', 'Malungon'],
    'Cotabato': ['Kidapawan City', 'Mlang', 'Kabacan', 'Matalam', 'Pigcawayan'],
    'Sultan Kudarat': ['Tacurong City', 'Isulan', 'Lebak', 'Kalamansig', 'Palimbang'],
  },
  'Region X (Northern Mindanao)': {
    'Bukidnon': ['Malaybalay City', 'Valencia City', 'Quezon', 'Maramag', 'Impasugong'],
    'Misamis Oriental': ['Cagayan de Oro City', 'Gingoog City', 'El Salvador', 'Villanueva'],
    'Misamis Occidental': ['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Jimenez'],
    'Lanao del Norte': ['Iligan City', 'Bacolod', 'Kapatagan', 'Kolambugan'],
    'Camiguin': ['Mambajao', 'Sagay', 'Catarman', 'Guinsiliban'],
  },
  'Region IX (Zamboanga Peninsula)': {
    'Zamboanga del Norte': ['Dipolog City', 'Dapitan City', 'Siocon', 'Sindangan', 'Jose Dalman'],
    'Zamboanga del Sur': ['Pagadian City', 'Aurora', 'Bayog', 'Dimataling', 'Dumingag'],
    'Zamboanga Sibugay': ['Ipil', 'Buug', 'Diplahan', 'Malangas', 'Payao'],
    'Zamboanga City': ['Zamboanga City'],
    'Isabela City': ['Isabela City'],
  },
  'Region XIII (CARAGA)': {
    'Agusan del Norte': ['Butuan City', 'Cabadbaran City', 'Nasipit', 'Carmen', 'Buenavista'],
    'Agusan del Sur': ['Prosperidad', 'Bayugan City', 'San Francisco', 'Trento', 'Veruela'],
    'Surigao del Norte': ['Surigao City', 'Siargao Islands', 'Claver', 'Placer', 'Bacuag'],
    'Surigao del Sur': ['Tandag City', 'Bislig City', 'Cantilan', 'Lanuza', 'Cagwait'],
    'Dinagat Islands': ['San Jose', 'Dinagat', 'Libjo', 'Cagdianao', 'Tubajon'],
  },
  'BARMM (Bangsamoro)': {
    'Basilan': ['Lamitan City', 'Tipo-Tipo', 'Sumisip', 'Lantawan', 'Tabuan-Lasa'],
    'Lanao del Sur': ['Marawi City', 'Malabang', 'Balindong', 'Bubong', 'Tugaya'],
    'Maguindanao del Norte': ['Datu Odin Sinsuat', 'Sultan Kudarat', 'Parang', 'Barira', 'Buldon'],
    'Maguindanao del Sur': ['Buluan', 'Sultan sa Barongis', 'Shariff Aguak', 'Ampatuan', 'Mamasapano'],
    'Tawi-Tawi': ['Bongao', 'Sanga-Sanga', 'Sitangkai', 'Simunul', 'Tandubas'],
    'Cotabato City': ['Cotabato City'],
  },
};

async function seed() {
  console.log("🚀 Starting Granular Location seeding via Client SDK...");

  try {
    for (const [region, provinces] of Object.entries(LOCATION_DATA)) {
      console.log(`📍 Seeding Region: ${region}`);
      
      for (const [province, cities] of Object.entries(provinces)) {
        console.log(`  - Seeding Province: ${province}`);
        
        for (const city of cities) {
          // Use a slugified ID for consistency
          const id = `${region}_${province}_${city}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          await setDoc(doc(db, "granular_locations", id), {
            region,
            province,
            city,
            created_at: serverTimestamp()
          });
        }
      }
    }
    console.log("✅ Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();

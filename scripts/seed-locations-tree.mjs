import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";

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
    'North Cotabato': ['Kidapawan City', 'Mlang', 'Kabacan', 'Matalam', 'Pigcawayan'],
    'Sultan Kudarat': ['Tacurong City', 'Isulan', 'Lebak', 'Kalamansig', 'Palimbang'],
  },
  'Region X (Northern Mindanao)': {
    'Bukidnon': ['Malaybalay City', 'Valencia City', 'Quezon', 'Maramag', 'Impasugong'],
    'Misamis Oriental': ['Cagayan de Oro City', 'Gingoog City', 'El Salvador', 'Villanueva'],
    'Misamis Occidental': ['Oroquieta City', 'Ozamiz City', 'Tangub City', 'Jimenez'],
    'Lanao del Norte': ['Iligan City', 'Bacolod', 'Kapatagan', 'Kolambugan'],
    'Camiguin': ['Mambajao', 'Sagay', 'Catarman', 'Guinsiliban'],
  },
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function seed() {
  console.log("🚀 Starting Location Tree seeding...");

  try {
    for (const [region, provinces] of Object.entries(LOCATION_DATA)) {
      const regionId = `loc_region_${slugify(region)}`;
      console.log(`📍 Seeding Region: ${region} (${regionId})`);
      
      await setDoc(doc(db, "locations", regionId), {
        name: region,
        type: "Region",
        parentId: null,
        created_at: serverTimestamp()
      }, { merge: true });

      for (const [province, cities] of Object.entries(provinces)) {
        const provinceId = `loc_prov_${slugify(province)}`;
        console.log(`  - Seeding Province: ${province} (${provinceId})`);
        
        await setDoc(doc(db, "locations", provinceId), {
          name: province,
          type: "Province",
          parentId: regionId,
          created_at: serverTimestamp()
        }, { merge: true });

        for (const city of cities) {
          const cityId = `loc_city_${slugify(province)}_${slugify(city)}`;
          
          await setDoc(doc(db, "locations", cityId), {
            name: city,
            type: "City",
            parentId: provinceId,
            created_at: serverTimestamp()
          }, { merge: true });
        }
      }
    }
    console.log("✅ Tree Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();

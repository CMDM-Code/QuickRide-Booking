import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Read service account
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function seed() {
  console.log("🚀 Starting Location Tree seeding via Admin SDK...");

  try {
    for (const [region, provinces] of Object.entries(LOCATION_DATA)) {
      const regionId = `loc_region_${slugify(region)}`;
      console.log(`📍 Seeding Region: ${region} (${regionId})`);
      
      await db.collection('locations').doc(regionId).set({
        name: region,
        type: "Region",
        parentId: null,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      for (const [province, cities] of Object.entries(provinces)) {
        const provinceId = `loc_prov_${slugify(province)}`;
        console.log(`  - Seeding Province: ${province} (${provinceId})`);
        
        await db.collection('locations').doc(provinceId).set({
          name: province,
          type: "Province",
          parentId: regionId,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        for (const city of cities) {
          const cityId = `loc_city_${slugify(province)}_${slugify(city)}`;
          
          await db.collection('locations').doc(cityId).set({
            name: city,
            type: "City",
            parentId: provinceId,
            created_at: admin.firestore.FieldValue.serverTimestamp()
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

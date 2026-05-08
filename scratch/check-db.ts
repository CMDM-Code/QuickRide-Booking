import { db } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkCollections() {
  const collections = ['locations', 'pricing_sheets', 'pricing_schedules', 'levels', 'car_types', 'vehicles'];
  for (const name of collections) {
    try {
      const snap = await getDocs(collection(db, name));
      console.log(`Collection ${name}: ${snap.docs.length} documents`);
    } catch (err) {
      console.error(`Error fetching ${name}:`, err);
    }
  }
}

checkCollections();

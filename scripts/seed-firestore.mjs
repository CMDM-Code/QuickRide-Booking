import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// IMPORTANT: Ensure you have downloaded your service account JSON from Firebase Console
// and named it 'service-account.json' in the root project directory.
const SERVICE_ACCOUNT_PATH = join(__dirname, '..', 'service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch (err) {
  console.error("❌ Error: Could not find 'service-account.json' in the root directory.");
  console.error("Please download it from Firebase Console > Project Settings > Service Accounts.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const locations = [
  { id: 'loc_gensan', name: 'GenSan', is_active: true },
  { id: 'loc_southcot', name: 'South Cotabato', is_active: true },
  { id: 'loc_saranggani', name: 'Saranggani', is_active: true },
  { id: 'loc_davaosur', name: 'Davao del Sur', is_active: true },
  { id: 'loc_davaonorte', name: 'Davao del Norte', is_active: true },
  { id: 'loc_outside11', name: 'Outside Region 11', is_active: true }
];

const carTypes = [
  { id: 'type_minivan', name: 'Mini Van', base_price_12hr: 700, base_price_24hr: 1300, requires_driver: false, driver_fee: 1000 },
  { id: 'type_hatchback', name: 'Hatchback', base_price_12hr: 800, base_price_24hr: 1400, requires_driver: false, driver_fee: 1000 },
  { id: 'type_sedan', name: 'Sedan', base_price_12hr: 1000, base_price_24hr: 1600, requires_driver: false, driver_fee: 1000 },
  { id: 'type_suv', name: 'SUV', base_price_12hr: 1300, base_price_24hr: 1900, requires_driver: false, driver_fee: 1000 },
  { id: 'type_l300', name: 'L300', base_price_12hr: 2000, base_price_24hr: 2500, requires_driver: false, driver_fee: 1000 },
  { id: 'type_pickup', name: 'Pick Up', base_price_12hr: 2500, base_price_24hr: 3000, requires_driver: true, driver_fee: 1000 }
];

const vehicles = [
  { id: 'veh_mazdavan', name: 'Mazda DA17 2024', car_type_id: 'type_minivan', license_plate: 'TBD-001', year: 2024, available: true, image_url: null, specs: { seats: 9, transmission: "Automatic" } },
  { id: 'veh_mirage_gls', name: 'Mitsubishi Mirage GLS', car_type_id: 'type_hatchback', license_plate: 'TBD-002', year: 2024, available: true, image_url: null, specs: { seats: 4, transmission: "Automatic" } },
  { id: 'veh_vios_xle', name: 'Toyota Vios XLE', car_type_id: 'type_sedan', license_plate: 'TBD-003', year: 2024, available: true, image_url: null, specs: { seats: 5, transmission: "Automatic" } },
  { id: 'veh_mirage_g4', name: 'Mitsubishi Mirage G4 GLX', car_type_id: 'type_sedan', license_plate: 'TBD-004', year: 2024, available: true, image_url: null, specs: { seats: 5, transmission: "Automatic" } },
  { id: 'veh_mg_style', name: 'MG 1.5 STYLE', car_type_id: 'type_sedan', license_plate: 'TBD-005', year: 2024, available: true, image_url: null, specs: { seats: 5, transmission: "Automatic" } },
  { id: 'veh_ertiga', name: 'Suzuki Ertiga Hybrid', car_type_id: 'type_suv', license_plate: 'TBD-006', year: 2024, available: true, image_url: null, specs: { seats: 8, transmission: "Automatic" } }
];

const pricingRates = [
  // Mini Van
  { car_type_id: 'type_minivan', location_id: 'loc_gensan', rate_12hr: 700, rate_24hr: 1300 },
  { car_type_id: 'type_minivan', location_id: 'loc_southcot', rate_12hr: 1100, rate_24hr: 1600 },
  { car_type_id: 'type_minivan', location_id: 'loc_saranggani', rate_12hr: 1100, rate_24hr: 1600 },
  { car_type_id: 'type_minivan', location_id: 'loc_davaosur', rate_12hr: 1400, rate_24hr: 1900 },
  { car_type_id: 'type_minivan', location_id: 'loc_davaonorte', rate_12hr: 1400, rate_24hr: 1900 },
  // Hatchback
  { car_type_id: 'type_hatchback', location_id: 'loc_gensan', rate_12hr: 800, rate_24hr: 1400 },
  { car_type_id: 'type_hatchback', location_id: 'loc_southcot', rate_12hr: 1300, rate_24hr: 1800 },
  { car_type_id: 'type_hatchback', location_id: 'loc_saranggani', rate_12hr: 1300, rate_24hr: 1800 },
  { car_type_id: 'type_hatchback', location_id: 'loc_davaosur', rate_12hr: 1500, rate_24hr: 2000 },
  { car_type_id: 'type_hatchback', location_id: 'loc_davaonorte', rate_12hr: 1500, rate_24hr: 2000 },
  { car_type_id: 'type_hatchback', location_id: 'loc_outside11', rate_12hr: 1900, rate_24hr: 2400 },
  // Sedan
  { car_type_id: 'type_sedan', location_id: 'loc_gensan', rate_12hr: 1000, rate_24hr: 1600 },
  { car_type_id: 'type_sedan', location_id: 'loc_southcot', rate_12hr: 1400, rate_24hr: 1900 },
  { car_type_id: 'type_sedan', location_id: 'loc_saranggani', rate_12hr: 1400, rate_24hr: 1900 },
  { car_type_id: 'type_sedan', location_id: 'loc_davaosur', rate_12hr: 1600, rate_24hr: 2100 },
  { car_type_id: 'type_sedan', location_id: 'loc_davaonorte', rate_12hr: 1600, rate_24hr: 2100 },
  { car_type_id: 'type_sedan', location_id: 'loc_outside11', rate_12hr: 2100, rate_24hr: 2600 },
  // SUV
  { car_type_id: 'type_suv', location_id: 'loc_gensan', rate_12hr: 1300, rate_24hr: 1900 },
  { car_type_id: 'type_suv', location_id: 'loc_southcot', rate_12hr: 1900, rate_24hr: 2400 },
  { car_type_id: 'type_suv', location_id: 'loc_saranggani', rate_12hr: 1900, rate_24hr: 2400 },
  { car_type_id: 'type_suv', location_id: 'loc_davaosur', rate_12hr: 2100, rate_24hr: 2600 },
  { car_type_id: 'type_suv', location_id: 'loc_davaonorte', rate_12hr: 2100, rate_24hr: 2600 },
  { car_type_id: 'type_suv', location_id: 'loc_outside11', rate_12hr: 2400, rate_24hr: 2900 },
  // L300
  { car_type_id: 'type_l300', location_id: 'loc_gensan', rate_12hr: 2000, rate_24hr: 2500 },
  { car_type_id: 'type_l300', location_id: 'loc_southcot', rate_12hr: 2500, rate_24hr: 3000 },
  { car_type_id: 'type_l300', location_id: 'loc_saranggani', rate_12hr: 2500, rate_24hr: 3000 },
  { car_type_id: 'type_l300', location_id: 'loc_davaosur', rate_12hr: 3000, rate_24hr: 3500 },
  { car_type_id: 'type_l300', location_id: 'loc_davaonorte', rate_12hr: 3000, rate_24hr: 3500 },
  { car_type_id: 'type_l300', location_id: 'loc_outside11', rate_12hr: 3400, rate_24hr: 3900 },
  // Pick Up
  { car_type_id: 'type_pickup', location_id: 'loc_gensan', rate_12hr: 2500, rate_24hr: 3000 },
  { car_type_id: 'type_pickup', location_id: 'loc_southcot', rate_12hr: 3000, rate_24hr: 3500 },
  { car_type_id: 'type_pickup', location_id: 'loc_saranggani', rate_12hr: 3000, rate_24hr: 3500 },
  { car_type_id: 'type_pickup', location_id: 'loc_davaosur', rate_12hr: 3500, rate_24hr: 4000 },
  { car_type_id: 'type_pickup', location_id: 'loc_davaonorte', rate_12hr: 3500, rate_24hr: 4000 },
  { car_type_id: 'type_pickup', location_id: 'loc_outside11', rate_12hr: 3800, rate_24hr: 4300 },
];

async function seed() {
  console.log("🚀 Starting Firestore seeding...");

  try {
    // 1. Seed Locations
    console.log("📍 Seeding locations...");
    for (const loc of locations) {
      await db.collection('locations').doc(loc.id).set({
        ...loc,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 2. Seed Car Types
    console.log("🚗 Seeding car types...");
    for (const type of carTypes) {
      await db.collection('car_types').doc(type.id).set({
        ...type,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 3. Seed Vehicles
    console.log("🚙 Seeding vehicles...");
    for (const veh of vehicles) {
       await db.collection('vehicles').doc(veh.id).set({
         ...veh,
         created_at: admin.firestore.FieldValue.serverTimestamp()
       });
    }

    // 4. Seed Pricing Rates
    console.log("💰 Seeding pricing rates...");
    for (const rate of pricingRates) {
      // Use a composite ID for pricing rates to avoid duplicates: car_type_id + location_id
      const id = `${rate.car_type_id}_${rate.location_id}`;
      await db.collection('pricing_rates').doc(id).set({
        ...rate,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log("✅ Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

seed();

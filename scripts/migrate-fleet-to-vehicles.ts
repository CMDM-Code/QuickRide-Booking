/**
 * Migration Script: Convert Fleet Collection to Vehicles Collection
 * 
 * This script reads data from the 'fleet' collection in Firebase Firestore
 * and converts it to the 'vehicles' collection with the new schema.
 * 
 * Car Type Mapping:
 * - luxury -> (removed, map to sedan or suv based on seats)
 * - economy -> sedan
 * - compact -> hatchback
 * - midsize -> sedan
 * - suv -> suv
 * - van -> mini_van
 * - truck -> pick_up
 * 
 * New Car Types: mini_van, sedan, hatchback, l300, pick_up, suv
 */

import { db } from '../src/lib/firebase';
import { collection, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Car type mapping from old to new
const CAR_TYPE_MAPPING: Record<string, string> = {
  'economy': 'type_sedan',
  'compact': 'type_hatchback',
  'midsize': 'type_sedan',
  'suv': 'type_suv',
  'van': 'type_mini_van',
  'truck': 'type_pick_up',
  'luxury': 'type_sedan', // Default luxury to sedan
};

// Fallback mapping for vehicle names that might indicate specific types
const NAME_BASED_MAPPING: Record<string, string> = {
  'l300': 'type_l300',
  'hilux': 'type_pick_up',
  'pickup': 'type_pick_up',
  'van': 'type_mini_van',
  'mini van': 'type_mini_van',
};

function mapCarType(oldType: string, vehicleName: string): string {
  const nameLower = vehicleName.toLowerCase();
  
  // Check name-based mapping first
  for (const [keyword, typeId] of Object.entries(NAME_BASED_MAPPING)) {
    if (nameLower.includes(keyword)) {
      return typeId;
    }
  }
  
  // Use category mapping
  return CAR_TYPE_MAPPING[oldType] || 'type_sedan';
}

async function migrateFleetToVehicles() {
  console.log('🚀 Starting migration from fleet to vehicles collection...');
  
  try {
    // Read all documents from fleet collection
    const fleetSnap = await getDocs(collection(db, 'fleet'));
    console.log(`📦 Found ${fleetSnap.size} documents in fleet collection`);
    
    if (fleetSnap.empty) {
      console.log('⚠️ Fleet collection is empty. Nothing to migrate.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const fleetDoc of fleetSnap.docs) {
      const fleetData = fleetDoc.data();
      
      try {
        // Map old schema to new schema
        const newCarTypeId = mapCarType(fleetData.category || 'economy', fleetData.name || '');
        
        const vehicleData = {
          name: fleetData.name || 'Unknown Vehicle',
          car_type_id: newCarTypeId,
          year: fleetData.year ? String(fleetData.year) : new Date().getFullYear().toString(),
          seats: fleetData.seats || 5,
          transmission: fleetData.transmission || 'Automatic',
          image_url: fleetData.image || fleetData.image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1080',
          available: fleetData.available !== undefined ? fleetData.available : true,
          created_at: fleetData.createdAt || serverTimestamp(),
          updated_at: serverTimestamp(),
          // Preserve any additional fields
          ...(fleetData.mileage !== undefined && { mileage: fleetData.mileage }),
          ...(fleetData.dailyRate !== undefined && { daily_rate: fleetData.dailyRate }),
          ...(fleetData.status && { status: fleetData.status }),
        };
        
        // Add to vehicles collection
        await addDoc(collection(db, 'vehicles'), vehicleData);
        
        console.log(`✅ Migrated: ${fleetData.name} (${fleetData.category} -> ${newCarTypeId})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating document ${fleetDoc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📦 Total processed: ${fleetSnap.size}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with some errors. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateFleetToVehicles()
  .then(() => {
    console.log('✨ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

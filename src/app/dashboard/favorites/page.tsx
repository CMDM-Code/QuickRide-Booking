'use client';

import { useState, useEffect } from "react";
import { favoriteStore, Favorite } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  documentId 
} from "firebase/firestore";
import VehicleCard from "@/components/fleet/VehicleCard";
import { Vehicle } from "@/lib/types";
import { withTimeout } from "@/lib/api-utils";

export default function FavoritesPage() {
  const [favoriteVehicles, setFavoriteVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    try {
      const user = authClient.getCurrentUser();
      if (!user || !db) return;

      const favs = favoriteStore.getAll(user.id);
      const vehicleIds = favs.map(f => f.vehicleId);

      if (vehicleIds.length === 0) {
        setFavoriteVehicles([]);
        return;
      }

      // Firestore 'in' query supports up to 30 items
      const [vehsSnap, carTypesSnap] = await withTimeout(
        Promise.all([
          getDocs(query(collection(db, 'vehicles'), where(documentId(), 'in', vehicleIds.slice(0, 30)))),
          getDocs(collection(db, 'car_types'))
        ]),
        5000
      );

      const carTypesMap = Object.fromEntries(
          carTypesSnap.docs.map((d: any) => [d.id, d.data()])
      );

      const data = vehsSnap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
        car_type: carTypesMap[d.data().car_type_id] || { name: 'Standard', driver_only: false }
      } as Vehicle));

      setFavoriteVehicles(data);
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Favorites</h1>
          <p className="text-lg text-slate-600 mt-2 font-medium">Your curated selection of elite vehicles.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
      ) : favoriteVehicles.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-16 text-center max-w-2xl mx-auto">
          <div className="text-7xl mb-6">❤️</div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Your wishlist is empty</h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            Browse our elite fleet and tap the heart icon on your favorite vehicles to save them here for quick access later.
          </p>
          <button 
            onClick={() => window.location.href = '/fleet'}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
          >
            Explore the Fleet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {favoriteVehicles.map((vehicle) => (
            <div key={vehicle.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <VehicleCard car={vehicle} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


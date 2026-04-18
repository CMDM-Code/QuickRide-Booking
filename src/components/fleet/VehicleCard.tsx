"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Vehicle } from "@/lib/types";
import { favoriteStore } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";

const VehicleCard = ({ car }: { car: Vehicle }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      const favorites = favoriteStore.getAll(user.id);
      setIsFavorite(favorites.some(f => f.vehicleId === car.id));
    }
  }, [car.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const user = authClient.getCurrentUser();
    if (!user) {
      alert("Please login to save favorites.");
      return;
    }

    if (isFavorite) {
      const favorites = favoriteStore.getAll(user.id);
      const fav = favorites.find(f => f.vehicleId === car.id);
      if (fav) favoriteStore.delete(fav.id);
      setIsFavorite(false);
    } else {
      favoriteStore.create({
        vehicleId: car.id,
        vehicleName: car.name,
        vehicleImage: car.image_url || '',
        vehiclePrice: 0 // Pricing is dynamic
      });
      setIsFavorite(true);
    }
  };

  return (
    <div
      className="group relative bg-white rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 hover:border-green-200"
    >
      {/* Favorite Toggle */}
      <button 
        onClick={toggleFavorite}
        className={`absolute top-4 left-4 z-20 p-2.5 rounded-xl backdrop-blur-md border transition-all duration-300 ${
            isFavorite 
            ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30' 
            : 'bg-white/20 border-white/30 text-white hover:bg-white/40'
        }`}
      >
        <svg 
            className={`w-5 h-5 ${isFavorite ? 'fill-current' : 'fill-none'}`} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {car.available && (
        <div className="absolute top-4 right-4 z-20 bg-green-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
          Available
        </div>
      )}
      <div className="relative h-64 overflow-hidden bg-slate-50">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 bg-slate-100">🚗</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60"></div>
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <div className="flex gap-2">
                <span className="text-white text-[10px] font-black tracking-widest bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-xl uppercase">
                    {car.transmission}
                </span>
                <span className="text-white text-[10px] font-black tracking-widest bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-xl uppercase">
                    {car.seats} Seats
                </span>
            </div>
            {car.year && (
                <span className="text-[10px] font-black bg-white text-slate-900 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                    {car.year}
                </span>
            )}
        </div>
      </div>

      <div className="p-8">
        <div className="mb-2">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {car.name}
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{car.car_type?.name || 'Premium Class'}</p>
        </div>

        <div className="flex items-center justify-between pt-8 mt-4 border-t border-slate-50">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Status</p>
            <p className={`text-sm font-black ${car.available ? 'text-green-700' : 'text-amber-600'}`}>
              {car.available ? '● Ready for Rent' : '○ Currently Out'}
            </p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Transmission</p>
             <p className="text-sm font-black text-slate-900">{car.transmission || 'Automatic'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;

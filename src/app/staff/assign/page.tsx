'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { staffStore, Booking, Vehicle } from "@/lib/staff-store";

export default function AssignVehiclePage() {
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    const bookings = staffStore.getBookings();
    setConfirmedBookings(bookings.filter(b => b.status === 'confirmed' && !b.vehicleId));
    setAvailableVehicles(staffStore.getVehicles().filter(v => v.status === 'available'));
  }, []);

  const handleAssign = () => {
    if (selectedBooking && selectedVehicle) {
      staffStore.assignVehicle(selectedBooking.id, selectedVehicle.id);
      setConfirmedBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
      setAvailableVehicles(prev => prev.map(v => 
        v.id === selectedVehicle.id ? {...v, status: 'in-use'} : v
      ));
      setSelectedBooking(null);
      setSelectedVehicle(null);
    }
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assign Vehicle</h1>
          <p className="text-slate-600 mt-1">Assign physical vehicles to confirmed bookings</p>
        </div>

        {confirmedBookings.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Vehicles Assigned</h3>
            <p className="text-slate-600">There are no confirmed bookings waiting for vehicle assignment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Booking Details</h2>
              <div className="space-y-2">
                {confirmedBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    onClick={() => setSelectedBooking(booking)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedBooking?.id === booking.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{booking.id}</div>
                    <div className="text-sm text-slate-600">{booking.customerName}</div>
                    <div className="text-sm text-slate-500">
                      {new Date(booking.pickupDate).toLocaleDateString()} - {new Date(booking.returnDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Available Vehicles</h2>
              <div className="space-y-2">
                {availableVehicles.map((vehicle) => (
                  <div 
                    key={vehicle.id} 
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedVehicle?.id === vehicle.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{vehicle.plate}</div>
                    <div className="text-sm text-slate-500">VIN: {vehicle.vin}</div>
                    <div className="text-sm text-slate-500">Mileage: {vehicle.mileage.toLocaleString()} km</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleAssign}
                disabled={!selectedBooking || !selectedVehicle}
                className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Vehicle
              </button>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

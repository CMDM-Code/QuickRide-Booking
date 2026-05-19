'use client';

import { useEffect, useState } from "react";
import { getAllBookings, patchBooking, type FirestoreBooking } from "@/lib/booking-service";
import { getAllVehicles, updateVehicleStatus, type Vehicle } from "@/lib/vehicle-service";
import { toSafeDate } from "@/lib/api-utils";

export default function AssignVehiclePage() {
  const [confirmedBookings, setConfirmedBookings] = useState<FirestoreBooking[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<FirestoreBooking | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const bookings = await getAllBookings();
        const vehicles = await getAllVehicles();
        
        setConfirmedBookings(bookings.filter(b => b.status === 'approved' && !b.assigned_vehicle_id));
        setAvailableVehicles(vehicles.filter(v => v.status === 'available'));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleAssign = async () => {
    if (selectedBooking && selectedVehicle) {
      try {
        // Assign vehicle to booking
        await patchBooking(selectedBooking.id, {
          assigned_vehicle_id: selectedVehicle.id,
          status: 'approved'
        }, {
          at: new Date().toISOString(),
          by: 'staff',
          action: 'assigned_vehicle',
          detail: `Assigned ${selectedVehicle.name}`
        });
        
        // Update vehicle status to rented
        await updateVehicleStatus(selectedVehicle.id, 'rented');
        
        // Reload data
        const bookings = await getAllBookings();
        const vehicles = await getAllVehicles();
        setConfirmedBookings(bookings.filter(b => b.status === 'approved' && !b.assigned_vehicle_id));
        setAvailableVehicles(vehicles.filter(v => v.status === 'available'));
        
        setSelectedBooking(null);
        setSelectedVehicle(null);
      } catch (error) {
        console.error('Error assigning vehicle:', error);
      }
    }
  };

  return (
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
                    <div className="text-sm text-slate-600">{booking.profile?.name || 'Customer'}</div>
                    <div className="text-sm text-slate-500">
                      {toSafeDate(booking.start_date)?.toLocaleDateString() || 'N/A'} - {toSafeDate(booking.end_date)?.toLocaleDateString() || 'N/A'}
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
                    <div className="font-bold text-slate-900">{vehicle.licensePlate}</div>
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
  );
}

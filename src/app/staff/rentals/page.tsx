'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { staffStore, Booking, Vehicle } from "@/lib/staff-store";

const calculateDueIn = (returnDate: string) => {
  const now = new Date();
  const due = new Date(returnDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 0) {
    const overdue = Math.abs(diffMins);
    return overdue > 60 
      ? `Overdue by ${Math.floor(overdue/60)} hours, ${overdue % 60} minutes` 
      : `Overdue by ${overdue} minutes`;
  }
  
  if (diffMins < 60) return `${diffMins} minutes`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours} hours, ${mins} minutes`;
};

export default function ActiveRentalsPage() {
  const [activeBookings, setActiveBookings] = useState<(Booking & { vehicle?: Vehicle })[]>([]);

  useEffect(() => {
    const bookings = staffStore.getBookings().filter(b => b.status === 'active');
    const vehicles = staffStore.getVehicles();
    
    setActiveBookings(bookings.map(b => ({
      ...b,
      vehicle: vehicles.find(v => v.id === b.vehicleId)
    })));
  }, []);

  const handleProcessReturn = (id: string) => {
    staffStore.updateBookingStatus(id, 'completed');
    setActiveBookings(prev => prev.filter(b => b.id !== id));
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Active Rentals</h1>
          <p className="text-slate-600 mt-1">Track vehicles currently on rent and process returns</p>
        </div>

        {activeBookings.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Rentals</h3>
            <p className="text-slate-600">All vehicles are currently returned and available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((rental) => {
              const dueIn = calculateDueIn(rental.returnDate);
              const isOverdue = dueIn.startsWith('Overdue');
              
              return (
                <div key={rental.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-lg text-slate-900">{rental.vehicleName}</h3>
                        <span className={`badge ${isOverdue ? 'bg-red-100 text-red-800' : 'badge-success'}`}>
                          {isOverdue ? 'overdue' : 'on-time'}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{rental.customerName}</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Plate: {rental.vehicle?.plate || 'N/A'} • {rental.id}
                      </p>
                      <p className={`font-medium mt-2 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                        Due: {dueIn}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleProcessReturn(rental.id)}
                      className="btn-primary"
                    >
                      Process Return
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

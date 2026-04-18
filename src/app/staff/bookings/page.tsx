'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { Booking, staffStore } from "@/lib/staff-store";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setBookings(staffStore.getBookings());
  }, []);

  const handleCancel = (id: string) => {
    staffStore.updateBookingStatus(id, 'cancelled');
    setBookings(staffStore.getBookings());
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Booking Management</h1>
          <p className="text-slate-600 mt-1">View and manage all reservations</p>
        </div>

        <div className="card">
          {bookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Bookings Yet</h3>
              <p className="text-slate-600">New bookings from customers will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Booking ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Vehicle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Dates</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-medium text-slate-900">{booking.id}</td>
                      <td className="py-4 px-4 text-slate-700">{booking.customerName}</td>
                      <td className="py-4 px-4 text-slate-700">{booking.vehicleName}</td>
                      <td className="py-4 px-4 text-slate-700">
                        {new Date(booking.pickupDate).toLocaleDateString()} - {new Date(booking.returnDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge ${
                          booking.status === 'confirmed' ? 'badge-success' : 
                          booking.status === 'pending' ? 'badge-warning' : 
                          booking.status === 'active' ? 'badge-info' : 'badge-neutral'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-3">
                          <button className="text-green-700 hover:text-green-800 font-medium text-sm">View</button>
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button 
                              onClick={() => handleCancel(booking.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}

'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { Booking, getLocalBookings, updateBookingStatus } from "@/lib/booking-service";
import { staffAuth } from "@/lib/staff-auth";

export default function ApprovalsPage() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [staffId, setStaffId] = useState<string>('system');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const allBookings = getLocalBookings();
    setPendingBookings(allBookings.filter(b => b.status === 'pending'));

    const session = staffAuth.getSession();
    if (session?.userId) setStaffId(session.userId);
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await updateBookingStatus(id, 'confirmed', staffId);
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await updateBookingStatus(id, 'cancelled', staffId);
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    setProcessing(null);
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Booking Approvals</h1>
          <p className="text-slate-600 mt-1">Review and approve pending booking requests</p>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-600">There are no pending booking requests waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-bold text-lg text-slate-900">{booking.id}</h3>
                      <span className="badge badge-warning">Pending Approval</span>
                    </div>
                    <p className="text-slate-600 mt-1">{booking.customerName}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {booking.vehicleName} • {new Date(booking.pickupDate).toLocaleDateString()} - {new Date(booking.returnDate).toLocaleDateString()}
                    </p>
                    <p className="text-green-700 font-bold mt-2">₱{booking.totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(booking.id)} className="btn-primary">Approve</button>
                    <button onClick={() => handleReject(booking.id)} className="btn-secondary text-red-600">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

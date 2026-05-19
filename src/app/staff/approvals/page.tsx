'use client';

import { useEffect, useState } from "react";
import { getAllBookings, updateBookingStatus, type FirestoreBooking } from "@/lib/booking-service";
import { staffAuth } from "@/lib/staff-auth";
import { toSafeDate } from "@/lib/api-utils";

export default function ApprovalsPage() {
  const [pendingBookings, setPendingBookings] = useState<FirestoreBooking[]>([]);
  const [staffId, setStaffId] = useState<string>('system');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const allBookings = await getAllBookings();
      setPendingBookings(allBookings.filter(b => b.status === 'pending'));

      const session = staffAuth.getSession();
      if (session?.userId) setStaffId(session.userId);
    }
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await updateBookingStatus(id, 'approved', {
      at: new Date().toISOString(),
      by: staffId,
      action: 'approved',
      detail: 'Booking approved by staff.',
    });
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await updateBookingStatus(id, 'rejected', {
      at: new Date().toISOString(),
      by: staffId,
      action: 'rejected',
      detail: 'Booking rejected by staff.',
    });
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    setProcessing(null);
  };

  return (
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
                      <h3 className="font-bold text-lg text-slate-900">{booking.id.slice(0, 8)}</h3>
                      <span className="badge badge-warning">Pending Approval</span>
                    </div>
                    <p className="text-slate-600 mt-1">User: {booking.user_id}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Vehicle: {booking.car_id} • {toSafeDate(booking.start_date)?.toLocaleDateString() || 'N/A'} - {toSafeDate(booking.end_date)?.toLocaleDateString() || 'N/A'}
                    </p>
                    <p className="text-green-700 font-bold mt-2">₱{booking.total_price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(booking.id)} disabled={!!processing} className="btn-primary">
                      {processing === booking.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button onClick={() => handleReject(booking.id)} disabled={!!processing} className="btn-secondary text-red-600">
                      {processing === booking.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

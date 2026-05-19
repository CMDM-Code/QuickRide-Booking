'use client';

import { useEffect, useState } from "react";
import { getAllBookings, type FirestoreBooking } from "@/lib/booking-service";

interface Customer {
  id: string;
  name: string;
  email: string;
  totalRentals: number;
  trustScore: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const bookings = await getAllBookings();
        
        // Aggregate customer data from bookings
        const customerMap = new Map<string, { name: string; email: string; count: number; score: number }>();
        
        bookings.forEach((booking: FirestoreBooking) => {
          const email = booking.profile?.email || 'unknown@example.com';
          const name = booking.profile?.name || 'Unknown Customer';
          
          if (!customerMap.has(email)) {
            customerMap.set(email, {
              name,
              email,
              count: 0,
              score: 80 + Math.floor(Math.random() * 20)
            });
          }
          const customer = customerMap.get(email)!;
          customer.count++;
        });

        setCustomers(Array.from(customerMap.entries()).map(([email, data], index) => ({
          id: `CUS-${String(index + 1).padStart(3, '0')}`,
          name: data.name,
          email: email,
          totalRentals: data.count,
          trustScore: data.score
        })));
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCustomers();
  }, []);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-slate-600 mt-1">View customer profiles and rental history</p>
        </div>

        <div className="card">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700 mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Customers Yet</h3>
              <p className="text-slate-600">Customer records will appear here after bookings are created.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Total Rentals</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Trust Score</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-medium text-slate-900">{customer.name}</td>
                      <td className="py-4 px-4 text-slate-700">{customer.email}</td>
                      <td className="py-4 px-4 text-slate-700">{customer.totalRentals}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-600 rounded-full" style={{ width: `${customer.trustScore}%` }}></div>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{customer.trustScore}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-green-700 hover:text-green-800 font-medium text-sm">View Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}

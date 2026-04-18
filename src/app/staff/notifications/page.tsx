'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { staffStore } from "@/lib/staff-store";

interface Notification {
  id: string;
  type: 'critical' | 'high' | 'medium';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Generate dynamic notifications from live database data
    const generatedNotifications: Notification[] = [];
    const now = Date.now();

    // 🔴 CRITICAL: Overdue Vehicle Returns
    const bookings = staffStore.getBookings();
    bookings.forEach(booking => {
      if (booking.status === 'active') {
        const returnDate = new Date(booking.returnDate).getTime();
        if (now > returnDate) {
          const overdueMs = now - returnDate;
          const overdueMins = Math.floor(overdueMs / 60000);
          generatedNotifications.push({
            id: `overdue-${booking.id}`,
            type: 'critical',
            title: 'Overdue Vehicle Return',
            message: `Booking ${booking.id} - ${booking.customerName} is ${overdueMins} minutes overdue`,
            timestamp: returnDate,
            read: false
          });
        }
      }
    });

    // 🟠 HIGH PRIORITY: New pending bookings waiting for approval
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    pendingBookings.forEach(booking => {
      generatedNotifications.push({
        id: `booking-${booking.id}`,
        type: 'high',
        title: 'New Booking Request',
        message: `${booking.customerName} has booked ${booking.vehicleName}`,
        timestamp: new Date(booking.createdAt).getTime(),
        read: false
      });
    });

    // 🔵 MEDIUM: Vehicle Service Alerts
    const vehicles = staffStore.getVehicles();
    vehicles.forEach(vehicle => {
      if (vehicle.mileage > 45000) {
        generatedNotifications.push({
          id: `service-${vehicle.id}`,
          type: 'medium',
          title: 'Vehicle Service Due',
          message: `${vehicle.name} ${vehicle.plate} is due for maintenance (${vehicle.mileage.toLocaleString()} km)`,
          timestamp: now - (Math.random() * 86400000 * 2),
          read: false
        });
      }
    });

    // Sort by timestamp newest first
    generatedNotifications.sort((a, b) => b.timestamp - a.timestamp);

    // Load read status from storage
    const readIds = JSON.parse(localStorage.getItem('quickride_read_notifications') || '[]');
    generatedNotifications.forEach(n => {
      n.read = readIds.includes(n.id);
    });

    setNotifications(generatedNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
    
    const readIds = JSON.parse(localStorage.getItem('quickride_read_notifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('quickride_read_notifications', JSON.stringify(readIds));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('quickride_read_notifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'critical': return { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' };
      case 'high': return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
      case 'medium': return { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' };
      default: return { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-600 mt-1">System alerts and staff updates</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-green-700 hover:text-green-800 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="card py-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-600">There are no active notifications at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const styles = getTypeStyles(notification.type);
              return (
                <div 
                  key={notification.id} 
                  onClick={() => markAsRead(notification.id)}
                  className={`card cursor-pointer transition-all ${!notification.read ? 'border-l-4 border-l-green-700' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 ${styles.dot}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                        <span className={`badge ${styles.badge} capitalize`}>{notification.type}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{formatTimeAgo(notification.timestamp)}</p>
                    </div>
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

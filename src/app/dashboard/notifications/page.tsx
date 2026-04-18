'use client';

import { useState, useEffect } from "react";
import { notificationStore, Notification } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setNotifications(notificationStore.getAll(user.id));
    }
  }, []);

  const markAsRead = (id: string) => {
    notificationStore.update(id, { read: true });
    const user = authClient.getCurrentUser();
    if (user) {
      setNotifications(notificationStore.getAll(user.id));
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        notificationStore.update(n.id, { read: true });
      }
    });
    const user = authClient.getCurrentUser();
    if (user) {
      setNotifications(notificationStore.getAll(user.id));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-200';
      case 'warning': return 'bg-amber-100 border-amber-200';
      case 'error': return 'bg-red-100 border-red-200';
      default: return 'bg-blue-100 border-blue-200';
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-600 mt-1">System updates and alerts</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllAsRead}
              className="text-green-700 font-medium hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              You have no unread notifications. We'll let you know when there are updates about your rentals.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all ${!notification.read ? getTypeColor(notification.type) : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{notification.title}</h3>
                    <p className="text-slate-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && <div className="w-3 h-3 rounded-full bg-green-600"></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}


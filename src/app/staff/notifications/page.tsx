'use client';

import StaffLayout from "../layout";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "@/lib/notification-service";
import { Notification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, MessageSquare, Tag, Info, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserId(user.id);
      const unsubscribe = subscribeToNotifications(user.id, (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleMarkAllAsRead = async () => {
    if (userId) {
      await markAllAsRead(userId);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_status': return <Calendar className="w-6 h-6 text-blue-500" />;
      case 'chat': return <MessageSquare className="w-6 h-6 text-green-500" />;
      case 'promotion': return <Tag className="w-6 h-6 text-amber-500" />;
      case 'reminder': return <Calendar className="w-6 h-6 text-purple-500" />;
      default: return <Info className="w-6 h-6 text-slate-500" />;
    }
  };

  return (
    <StaffLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Staff Notifications</h1>
            <p className="text-slate-500 font-medium mt-1">Review system alerts, booking requests, and customer messages.</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No active alerts</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">
              Everything is running smoothly. We'll notify you when there's a new booking or message.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`group relative bg-white rounded-2xl border transition-all p-5 flex gap-5 ${
                  !n.read 
                    ? 'border-blue-100 bg-blue-50/20 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${!n.read ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-bold text-lg leading-tight ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                        {n.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex gap-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Mark as read
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(n.id)}
                      className="text-xs font-black text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>

                {!n.read && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

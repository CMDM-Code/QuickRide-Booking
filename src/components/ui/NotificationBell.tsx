'use client';

import { useState, useEffect } from "react";
import { Bell, Check, X, Info, Calendar, MessageSquare, Tag } from "lucide-react";
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "@/lib/notification-service";
import { Notification } from "@/lib/types";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { toSafeDate } from "@/lib/api-utils";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setUserId(user.id);
      const unsubscribe = subscribeToNotifications(user.id, (data) => {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
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
      case 'booking_status': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'promotion': return <Tag className="w-4 h-4 text-amber-500" />;
      case 'reminder': return <Calendar className="w-4 h-4 text-purple-500" />;
      default: return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-all"
        style={{ color: "var(--text-secondary)" }}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2"
          style={{ backgroundColor: "var(--error)", borderColor: "var(--bg-surface)" }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-subtle)" }}>
              <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-bold"
                  style={{ color: "var(--info)" }}
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--bg-subtle)" }}>
                    <Bell className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 flex gap-3 transition-colors relative group ${!n.read ? '' : ''}`}
                      style={{ backgroundColor: !n.read ? "var(--info-bg)" : "" }}
                    >
                      <div className="mt-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center`}
                          style={{ backgroundColor: !n.read ? "var(--bg-surface)" : "var(--bg-subtle)", boxShadow: !n.read ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                          {getIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold truncate`} style={{ color: !n.read ? "var(--text-primary)" : "var(--text-secondary)" }}>
                            {n.title}
                          </p>
                          <span className="text-[10px] whitespace-nowrap mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {(() => {
                              const d = toSafeDate(n.created_at);
                              return d ? formatDistanceToNow(d, { addSuffix: true }) : 'just now';
                            })()}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {n.message}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {!n.read && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] font-bold hover:underline"
                              style={{ color: "var(--info)" }}
                            >
                              Mark as read
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(n.id)}
                            className="text-[10px] font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "var(--error)" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {!n.read && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--info)" }}></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t text-center" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-subtle)" }}>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/dashboard/notifications";
                }}
                className="text-xs font-bold transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

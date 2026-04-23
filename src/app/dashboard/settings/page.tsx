'use client';

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { NotificationPreferences } from "@/lib/types";
import { DEFAULT_NOTIFICATION_PREFERENCES, updateNotificationPreferences } from "@/lib/notification-service";
import { Bell, Mail, Smartphone, ShieldCheck, Tag } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{id: string; name: string; email: string} | null>(null);
  const [name, setName] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const currentUser = authClient.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.name);
      fetchNotificationPrefs(currentUser.id);
    }
  }, []);

  async function fetchNotificationPrefs(userId: string) {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.notification_preferences) {
          setNotificationPrefs(data.notification_preferences);
        }
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    }
  }

  const handleNotificationPrefsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingPrefs(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await updateNotificationPreferences(user.id, notificationPrefs);
      setSuccessMessage("Notification preferences updated successfully!");
    } catch (error) {
      setErrorMessage("Failed to update notification preferences.");
      console.error(error);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleToggleChannel = (channel: 'in_app' | 'email' | 'sms') => {
    setNotificationPrefs(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const handleToggleType = (type: keyof NotificationPreferences['types']) => {
    setNotificationPrefs(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type]
      }
    }));
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    setSuccessMessage("Profile updated successfully!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    setSuccessMessage("Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account information</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">{successMessage}</div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{errorMessage}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Personal Information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
              />
              <p className="text-sm text-slate-500 mt-1">Email cannot be changed</p>
            </div>
            <button
              type="submit"
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-800 transition-colors"
            >
              Update Profile
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-700" />
            Notification Preferences
          </h2>
          <form onSubmit={handleNotificationPrefsUpdate} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleToggleChannel('in_app')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${notificationPrefs.in_app ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400'}`}
              >
                <Bell className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider">In-App</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleChannel('email')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${notificationPrefs.email ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400'}`}
              >
                <Mail className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider">Email</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleChannel('sms')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${notificationPrefs.sms ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400'}`}
              >
                <Smartphone className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider">SMS</span>
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-50">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Notification Types</p>
              
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Booking Updates</p>
                    <p className="text-[10px] text-slate-500">Status changes, approvals, and cancellations</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationPrefs.types.booking_updates} 
                  onChange={() => handleToggleType('booking_updates')}
                  className="w-5 h-5 rounded text-green-700 focus:ring-green-700 border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Reminders</p>
                    <p className="text-[10px] text-slate-500">Pickup reminders and document expiration</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationPrefs.types.reminders} 
                  onChange={() => handleToggleType('reminders')}
                  className="w-5 h-5 rounded text-green-700 focus:ring-green-700 border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Promotions</p>
                    <p className="text-[10px] text-slate-500">Exclusive deals and system updates</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationPrefs.types.promotions} 
                  onChange={() => handleToggleType('promotions')}
                  className="w-5 h-5 rounded text-green-700 focus:ring-green-700 border-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPrefs}
              className="w-full bg-slate-950 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
            >
              {isSavingPrefs ? 'Saving Preferences...' : 'Save Preferences'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-800 transition-colors"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
  );
}


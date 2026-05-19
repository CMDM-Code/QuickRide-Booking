'use client';
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  updateDoc, 
  doc, 
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { adminStore, AdminUser } from "@/lib/admin-store";
import { withTimeout } from "@/lib/api-utils";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Shield, ShieldCheck, Mail, Calendar, AlertCircle } from "lucide-react";

type FilterRole = 'all' | 'customer' | 'staff' | 'admin';
type UserSort = 'joined_desc' | 'joined_asc' | 'bookings_desc' | 'bookings_asc' | 'last_activity_desc' | 'inactive_first';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export default function UnifiedUserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [activeTab, setActiveTab] = useState<FilterRole>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '' });
  const [search, setSearch] = useState('');
  const [minBookings, setMinBookings] = useState<string>('');
  const [maxBookings, setMaxBookings] = useState<string>('');
  const [sort, setSort] = useState<UserSort>('joined_desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    if (db) {
      try {
        const [profilesSnap, bookingsSnap] = await withTimeout(
          Promise.all([
            getDocs(query(collection(db, 'profiles'), orderBy('created_at', 'desc'))),
            getDocs(collection(db, 'bookings'))
          ]),
          5000
        );

        const data = profilesSnap.docs.map((d: any) => ({
            id: d.id,
            ...d.data()
        }));

        setUsers(data);
        setBookings(bookingsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        setMode('cloud');
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Firestore fetch failed, falling back to local');
      }
    }

    // Fallback to localStorage
    const localUsers = adminStore.getUsers().filter(u => u.role !== 'super_admin');
    setUsers(localUsers.map((u: any) => ({
      id: u.id,
      full_name: u.name,
      role: u.role,
      status: u.status,
      created_at: u.createdAt,
      email: u.email,
      _source: 'local'
    })));
    setMode('local');
    setBookings([]);
    setLoading(false);
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = newStaff.email.trim().toLowerCase();
    const displayName = newStaff.full_name.trim();

    if (db && mode === 'cloud') {
      try {
        let snap = await getDocs(query(collection(db, 'profiles'), where('email', '==', normalizedEmail)));
        if (snap.empty && normalizedEmail !== newStaff.email.trim()) {
          snap = await getDocs(query(collection(db, 'profiles'), where('email', '==', newStaff.email.trim())));
        }
        
        if (!snap.empty) {
          const profileDoc = snap.docs[0];
          await updateDoc(doc(db, 'profiles', profileDoc.id), { 
             role: 'staff', 
             full_name: displayName || profileDoc.data().full_name,
             updated_at: serverTimestamp()
          });
          
          alert(`✅ Account detected: ${normalizedEmail} elevated to Staff!`);
        } else {
          alert(`📢 No matching account found for ${normalizedEmail}.\nThe user must sign up first at /auth/signup.`);
        }
      } catch (err: any) {
        alert("❌ Cloud promotion failed: " + err.message);
      }
    } else {
      adminStore.createUser(normalizedEmail, displayName, 'staff');
    }

    setNewStaff({ full_name: '', email: '' });
    setShowAddForm(false);
    fetchUsers();
  };

  const handleRoleChange = async (id: string, role: string, source?: string) => {
    if (mode === 'cloud' && db && source !== 'local') {
      try {
        await updateDoc(doc(db, 'profiles', id), { role, updated_at: serverTimestamp() });
        fetchUsers();
        return;
      } catch (err) {
          console.error("Error updating user role:", err);
      }
    }
    adminStore.updateUserRole(id, role as AdminUser['role']);
    fetchUsers();
  };

  const userStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const last: Record<string, Date> = {};

    for (const b of bookings) {
      const uid = String(b.user_id ?? '');
      if (!uid) continue;
      counts[uid] = (counts[uid] ?? 0) + 1;

      const t = toDate(b.created_at) ?? toDate(b.start_date) ?? toDate(b.end_date);
      if (!t) continue;
      if (!last[uid] || t > last[uid]) last[uid] = t;
    }

    return { counts, last };
  }, [bookings]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minBookings !== '' ? Number(minBookings) : null;
    const max = maxBookings !== '' ? Number(maxBookings) : null;
    const now = new Date();

    const base = users.filter((user) => {
      if (activeTab !== 'all' && user.role !== activeTab) return false;

      const bookingCount = userStats.counts[user.id] ?? 0;
      if (min !== null && bookingCount < min) return false;
      if (max !== null && bookingCount > max) return false;

      if (q) {
        const name = String(user.full_name || user.name || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        const id = String(user.id || '').toLowerCase();
        if (![name, email, id].some((x) => x.includes(q))) return false;
      }

      return true;
    });

    const sorted = [...base].sort((a, b) => {
      const aJoined = (toDate(a.created_at)?.getTime() ?? 0);
      const bJoined = (toDate(b.created_at)?.getTime() ?? 0);
      const aCount = userStats.counts[a.id] ?? 0;
      const bCount = userStats.counts[b.id] ?? 0;
      const aLast = userStats.last[a.id]?.getTime() ?? 0;
      const bLast = userStats.last[b.id]?.getTime() ?? 0;

      switch (sort) {
        case 'joined_desc':
          return bJoined - aJoined;
        case 'joined_asc':
          return aJoined - bJoined;
        case 'bookings_desc':
          return bCount - aCount;
        case 'bookings_asc':
          return aCount - bCount;
        case 'last_activity_desc':
          return bLast - aLast;
        case 'inactive_first': {
          // 30+ days since last activity goes first
          const threshold = 30 * 24 * 60 * 60 * 1000;
          const aInactive = aLast ? (now.getTime() - aLast) > threshold : true;
          const bInactive = bLast ? (now.getTime() - bLast) > threshold : true;
          if (aInactive !== bInactive) return aInactive ? -1 : 1;
          return bLast - aLast;
        }
        default:
          return bJoined - aJoined;
      }
    });

    return sorted;
  }, [users, activeTab, search, minBookings, maxBookings, sort, userStats]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      case 'staff': return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      case 'customer': return 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)]';
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="text-slate-500 font-medium animate-pulse">Syncing User Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity & Access"
        subtitle="Unified management for customers, employees, and admins."
        action={
          <div className="flex items-center gap-3">
            <button onClick={fetchUsers} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all font-bold" title="Refresh">🔄</button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name/email/id..."
              className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] font-bold text-sm text-[var(--text-primary)] outline-none w-[260px] focus:border-[var(--color-primary-500)]"
            />
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-lg">
              {showAddForm ? 'Cancel' : 'Elevate Staff Member'}
            </Button>
          </div>
        }
      />

      {mode === 'local' && (
        <Card className="bg-[var(--color-warning-light)] border-[var(--color-warning)]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <AlertCircle className="w-5 h-5 text-[var(--color-warning)]" />
             <div>
                <p className="text-sm font-bold text-[var(--color-warning)]">Local Mode Active</p>
                <p className="text-xs text-[var(--color-warning)]/80">Viewing local directory. Updates won't sync to the live database.</p>
             </div>
          </div>
          <button onClick={fetchUsers} className="text-xs font-bold text-[var(--color-warning)] underline px-3 py-1 hover:bg-[var(--color-warning)]/10 rounded-lg">Retry Sync</button>
        </Card>
      )}

      {/* Stats QuickView */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Total Users</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{users.length}</p>
        </Card>
        <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-warning)]">
           <p className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Admins</p>
           <p className="text-2xl font-black text-[var(--color-warning)]">{users.filter(u => u.role === 'admin').length}</p>
        </Card>
        <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-success)]">
           <p className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Active Staff</p>
           <p className="text-2xl font-black text-[var(--color-success)]">{users.filter(u => u.role === 'staff').length}</p>
        </Card>
        <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-primary-500)]">
           <p className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest mb-1">Customers</p>
           <p className="text-2xl font-black text-[var(--color-primary-600)]">{users.filter(u => u.role === 'customer').length}</p>
        </Card>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <Card className="shadow-premium border-2 border-[var(--color-primary-500)]/30">
              <h2 className="text-lg font-black text-[var(--text-primary)] mb-2">Elevate Registered User to Staff</h2>
              <p className="text-xs text-[var(--text-secondary)] font-bold mb-4">Search for an existing customer account by email to grant them staff permissions.</p>
              <form onSubmit={handleAddStaff} className="grid md:grid-cols-3 gap-4">
                 <input
                    type="text"
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] focus:border-[var(--color-primary-500)] outline-none font-bold text-sm text-[var(--text-primary)]"
                    placeholder="Preferred Display Name"
                    required
                  />
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] focus:border-[var(--color-primary-500)] outline-none font-bold text-sm text-[var(--text-primary)]"
                    placeholder="User's Registered Email"
                    required
                  />
                  <Button type="submit" className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white shadow-lg w-full">Elevate User</Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Tabs */}
      <div className="flex space-x-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl w-fit">
        {(['all', 'customer', 'staff', 'admin'] as FilterRole[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Bookings count</p>
          <div className="flex gap-2">
            <input
              value={minBookings}
              onChange={(e) => setMinBookings(e.target.value)}
              placeholder="Min"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-xs outline-none"
              inputMode="numeric"
            />
            <input
              value={maxBookings}
              onChange={(e) => setMaxBookings(e.target.value)}
              placeholder="Max"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-xs outline-none"
              inputMode="numeric"
            />
          </div>
        </Card>
        <Card className="flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Sort</p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as UserSort)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] font-bold text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none"
          >
            <option value="joined_desc">Newest users</option>
            <option value="joined_asc">Oldest users</option>
            <option value="bookings_desc">Most bookings</option>
            <option value="bookings_asc">Least bookings</option>
            <option value="last_activity_desc">Last activity (recent)</option>
            <option value="inactive_first">Inactive first (30+ days)</option>
          </select>
        </Card>
        <Card className="lg:col-span-2 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Interpretation</p>
          <p className="text-[11px] text-[var(--text-secondary)] font-bold leading-relaxed">
            <span className="font-black text-[var(--text-primary)]">Bookings</span> is total booking docs by user.{" "}
            <span className="font-black text-[var(--text-primary)]">Last activity</span> uses latest booking timestamp (created/start/end).
          </p>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Results</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{filteredUsers.length}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setMinBookings('');
              setMaxBookings('');
              setSort('joined_desc');
              setActiveTab('all');
            }}
            className="border-[var(--border-subtle)]"
          >
            Reset
          </Button>
        </Card>
      </div>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <th className="text-left py-6 px-6 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Identity</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Permission Level</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Joined At</th>
                <th className="text-right py-6 px-6 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Manage</th>
              </tr>
            </thead>
            <AnimatePresence>
              <motion.tbody>
                {filteredUsers.map((user, idx) => (
                  <motion.tr 
                    key={user.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:shadow-sm transition-all"
                  >
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] font-black uppercase text-sm">
                          {(user.full_name || user.name || 'A').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-[var(--text-primary)]">{user.full_name || user.name || 'Anonymous User'}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {user.email || user.id}</p>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              {userStats.counts[user.id] ?? 0} booking(s)
                            </span>
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              last: {userStats.last[user.id] ? userStats.last[user.id].toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value, (user as any)._source)}
                          className={`px-3 py-1.5 rounded-lg border outline-none cursor-pointer uppercase text-[10px] font-black tracking-widest ${getRoleColor(user.role)} border-current/20`}
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                    </td>
                    <td className="py-6 px-6">
                       <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {(() => {
                            const d = toDate(user.created_at);
                            return d ? d.toLocaleDateString() : 'N/A';
                          })()}
                       </p>
                    </td>
                    <td className="py-6 px-6 text-right">
                      {user.role !== 'customer' && (
                        <button
                          onClick={() => {
                            if (confirm(`Revoke elevated access for ${user.full_name || user.email}? They will be set back to Customer.`)) {
                              handleRoleChange(user.id, 'customer', (user as any)._source);
                            }
                          }}
                          className="text-[10px] font-black text-[var(--text-secondary)] hover:text-[var(--color-error)] uppercase tracking-widest transition-all hover:bg-[var(--color-error-light)] px-3 py-2 rounded-lg"
                        >
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                     <td colSpan={4} className="py-20 text-center">
                        <p className="text-[var(--text-secondary)] text-sm font-bold">No accounts match the current filters.</p>
                     </td>
                  </tr>
                )}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      </Card>
    </div>
  );
}

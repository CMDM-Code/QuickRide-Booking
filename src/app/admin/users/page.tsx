'use client';
import { useEffect, useState } from "react";
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

type FilterRole = 'all' | 'customer' | 'staff' | 'admin';

export default function UnifiedUserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [activeTab, setActiveTab] = useState<FilterRole>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    if (db) {
      try {
        const q = query(collection(db, 'profiles'), orderBy('created_at', 'desc'));
        const snap = await withTimeout(getDocs(q), 3000);

        const data = snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data()
        }));

        setUsers(data);
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

  const filteredUsers = users.filter(user => {
    if (activeTab === 'all') return true;
    return user.role === activeTab;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-amber-100 text-amber-800';
      case 'staff': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h1 className="text-3xl font-bold text-slate-900">Identity & Access</h1>
             <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === 'cloud' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {mode === 'cloud' ? '● Live Directory' : '⚠ Local Mode'}
             </span>
          </div>
          <p className="text-slate-600">Unified management for customers, employees, and admins.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchUsers} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold">🔄</button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
            {showAddForm ? 'Cancel' : 'Elevate Staff Member'}
          </button>
        </div>
      </div>

      {/* Stats QuickView */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Users</p>
          <p className="text-2xl font-black text-slate-900">{users.length}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Admins</p>
           <p className="text-2xl font-black text-amber-600">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-green-500">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Staff</p>
           <p className="text-2xl font-black text-green-700">{users.filter(u => u.role === 'staff').length}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Customers</p>
           <p className="text-2xl font-black text-blue-600">{users.filter(u => u.role === 'customer').length}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="card shadow-2xl border-2 border-green-200 animate-in zoom-in-95 duration-200">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Elevate Registered User to Staff</h2>
          <p className="text-xs text-slate-500 mb-4">Search for an existing customer account by email to grant them staff permissions.</p>
          <form onSubmit={handleAddStaff} className="grid md:grid-cols-3 gap-4">
             <input
                type="text"
                value={newStaff.full_name}
                onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-green-500 outline-none font-medium text-sm"
                placeholder="Preferred Display Name"
                required
              />
              <input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-green-500 outline-none font-medium text-sm"
                placeholder="User's Registered Email"
                required
              />
              <button type="submit" className="btn-primary">Elevate User</button>
          </form>
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['all', 'customer', 'staff', 'admin'] as FilterRole[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Level</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined At</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">{user.full_name || user.name || 'Anonymous User'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{user.email || user.id}</p>
                  </td>
                  <td className="py-4 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value, (user as any)._source)}
                        className={`badge ${getRoleColor(user.role)} border-none outline-none cursor-pointer uppercase text-[9px] font-black py-1 px-3`}
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                  </td>
                  <td className="py-4 px-6">
                     <p className="text-[11px] font-bold text-slate-600">
                        {user.created_at ? (user.created_at instanceof Timestamp ? user.created_at.toDate().toLocaleDateString() : new Date(user.created_at).toLocaleDateString()) : 'N/A'}
                     </p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {user.role !== 'customer' && (
                      <button
                        onClick={() => {
                          if (confirm(`Revoke elevated access for ${user.full_name || user.email}? They will be set back to Customer.`)) {
                            handleRoleChange(user.id, 'customer', (user as any)._source);
                          }
                        }}
                        className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-all"
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-20 text-center">
                      <p className="text-slate-400 text-sm font-medium">No accounts found in the {activeTab} directory.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

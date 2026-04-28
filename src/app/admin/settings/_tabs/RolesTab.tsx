'use client';
import { RolesSettings, RolePermission } from '@/lib/settings-service';
import { Section } from './shared';
import { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';

const PERM_LABELS: (keyof RolePermission['permissions'])[] = ['bookings','payments','vehicles','chat','users','settings'];

interface Props { data: RolesSettings; onChange: (d: RolesSettings) => void; }
export default function RolesTab({ data, onChange }: Props) {
  const [newName, setNewName] = useState('');

  const updateRole = (idx: number, updated: RolePermission) => {
    const roles = [...data.roles];
    roles[idx] = updated;
    onChange({ roles });
  };

  const addRole = () => {
    if (!newName.trim()) return;
    onChange({
      roles: [...data.roles, {
        role_id: newName.toLowerCase().replace(/\s+/g, '_'),
        role_name: newName.trim(),
        permissions: { bookings: false, payments: false, vehicles: false, chat: false, users: false, settings: false },
      }]
    });
    setNewName('');
  };

  const deleteRole = (idx: number) => {
    if (['admin', 'staff'].includes(data.roles[idx].role_id)) return;
    const roles = data.roles.filter((_, i) => i !== idx);
    onChange({ roles });
  };

  return (
    <div className="space-y-4">
      <Section title="Role Management" description="Admin override always wins. Roles with the same permission level follow last-action-wins.">
        <div className="space-y-4">
          {data.roles.map((role, idx) => {
            const isSystem = ['admin', 'staff'].includes(role.role_id);
            return (
              <div key={role.role_id} className="border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${isSystem ? 'text-green-600' : 'text-slate-400'}`} />
                    <span className="font-black text-slate-800 text-sm">{role.role_name}</span>
                    {isSystem && <span className="text-[9px] bg-green-100 text-green-700 font-black px-1.5 py-0.5 rounded uppercase">System</span>}
                  </div>
                  {!isSystem && (
                    <button onClick={() => deleteRole(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PERM_LABELS.map(perm => (
                    <label key={perm} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      role.permissions[perm] ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-100 text-slate-400'
                    } ${isSystem && role.role_id === 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={role.permissions[perm]}
                        disabled={isSystem && role.role_id === 'admin'}
                        onChange={e => updateRole(idx, {
                          ...role,
                          permissions: { ...role.permissions, [perm]: e.target.checked }
                        })}
                        className="accent-green-700"
                      />
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Add New Role">
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRole()}
            placeholder="Role name (e.g. Manager)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm font-medium"
          />
          <button
            onClick={addRole}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Role
          </button>
        </div>
      </Section>
    </div>
  );
}

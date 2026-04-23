'use client';
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "@/lib/notification-service";
import { Notification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, MessageSquare, Tag, Info, Trash2, CheckCircle, Settings, Inbox, Plus } from "lucide-react";

interface AutoNotificationRule {
  id: string;
  name: string;
  event: string;
  condition: string;
  channel: 'email' | 'sms' | 'push' | 'all';
  message: string;
  active: boolean;
  createdAt: string;
}

const EVENTS = [
  { value: 'booking_due', label: 'Booking Due / Return' },
  { value: 'payment_due', label: 'Payment Due' },
  { value: 'late_return', label: 'Late Return' },
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'booking_created', label: 'New Booking Created' },
  { value: 'vehicle_maintenance', label: 'Vehicle Maintenance Due' },
];

const CONDITIONS = [
  { value: '1_hour_before', label: '1 hour before' },
  { value: '3_hours_before', label: '3 hours before' },
  { value: '1_day_before', label: '1 day before' },
  { value: '2_days_before', label: '2 days before' },
  { value: '3_days_before', label: '3 days before' },
  { value: '7_days_before', label: '7 days before' },
  { value: 'at_event_time', label: 'At time of event' },
  { value: '1_day_after', label: '1 day after (overdue)' },
  { value: '3_days_after', label: '3 days after (overdue)' },
];

const TEMPLATE_VARS = ['{customer_name}', '{vehicle_name}', '{due_date}', '{booking_id}', '{total_price}', '{phone}'];

const generateId = () => 'AUTO-' + Math.random().toString(36).substring(2, 10).toUpperCase();

const getAutoRules = (): AutoNotificationRule[] => {
  try { return JSON.parse(localStorage.getItem('quickride_auto_notifications') || '[]'); } catch { return []; }
};

const saveAutoRules = (rules: AutoNotificationRule[]) => {
  localStorage.setItem('quickride_auto_notifications', JSON.stringify(rules));
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'rules'>('inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [rules, setRules] = useState<AutoNotificationRule[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    event: 'booking_due',
    condition: '1_day_before',
    channel: 'email' as AutoNotificationRule['channel'],
    message: 'Hi {customer_name}, your booking #{booking_id} for {vehicle_name} is due on {due_date}. Please ensure timely return.',
  });

  useEffect(() => {
    setRules(getAutoRules());
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
      case 'booking_status': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'chat': return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'promotion': return <Tag className="w-5 h-5 text-amber-500" />;
      case 'reminder': return <Calendar className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: AutoNotificationRule = {
      id: generateId(),
      ...newRule,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [rule, ...rules];
    saveAutoRules(updated);
    setRules(updated);
    setShowCreateForm(false);
    setNewRule({
      name: '',
      event: 'booking_due',
      condition: '1_day_before',
      channel: 'email',
      message: 'Hi {customer_name}, your booking #{booking_id} for {vehicle_name} is due on {due_date}. Please ensure timely return.',
    });
  };

  const toggleActive = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    saveAutoRules(updated);
    setRules(updated);
  };

  const deleteRule = (id: string) => {
    if (!confirm('Delete this auto-notification rule?')) return;
    const updated = rules.filter(r => r.id !== id);
    saveAutoRules(updated);
    setRules(updated);
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'push': return 'bg-purple-100 text-purple-800';
      case 'all': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getEventLabel = (value: string) => EVENTS.find(e => e.value === value)?.label || value;
  const getConditionLabel = (value: string) => CONDITIONS.find(c => c.value === value)?.label || value;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Notifications</h1>
          <p className="text-slate-500 font-medium mt-1">Manage system alerts and automated messaging rules.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'inbox' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Admin Inbox
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'rules' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Auto-Rules
          </button>
        </div>
      </div>

      {activeTab === 'inbox' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" />
              Notifications for Admin
            </h2>
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 font-bold text-sm hover:underline"
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
              <h3 className="text-2xl font-black text-slate-900 mb-2">Inbox is empty</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">
                No system alerts or customer requests at the moment.
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
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-700" />
                Automated Rules
              </h2>
              <p className="text-sm text-slate-500 font-medium">Define automated triggers for customer alerts.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${
                showCreateForm 
                  ? 'bg-slate-100 text-slate-600' 
                  : 'bg-green-700 text-white shadow-xl shadow-green-700/20 hover:bg-green-800'
              }`}
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Cancel' : 'New Rule'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Rules</p>
              <p className="text-3xl font-black text-slate-900">{rules.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active</p>
              <p className="text-3xl font-black text-green-700">{rules.filter(r => r.active).length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Email Rules</p>
              <p className="text-3xl font-black text-blue-600">{rules.filter(r => r.channel === 'email' || r.channel === 'all').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Inactive</p>
              <p className="text-3xl font-black text-slate-300">{rules.filter(r => !r.active).length}</p>
            </div>
          </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="card border-2 border-green-200">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Create Auto-Notification Rule</h2>
          <p className="text-sm text-slate-500 mb-6">Define when and how automatic notifications get sent to customers or staff.</p>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  placeholder="e.g. Booking Due Reminder"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notify Via</label>
                <select
                  value={newRule.channel}
                  onChange={(e) => setNewRule({...newRule, channel: e.target.value as any})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                >
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                  <option value="push">🔔 Push Notification</option>
                  <option value="all">📢 All Channels</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Trigger Event</label>
                <select
                  value={newRule.event}
                  onChange={(e) => setNewRule({...newRule, event: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                >
                  {EVENTS.map(evt => (
                    <option key={evt.value} value={evt.value}>{evt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">When to Send</label>
                <select
                  value={newRule.condition}
                  onChange={(e) => setNewRule({...newRule, condition: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                >
                  {CONDITIONS.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Message Template</label>
              <textarea
                value={newRule.message}
                onChange={(e) => setNewRule({...newRule, message: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none min-h-[100px]"
                required
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-slate-400 mr-1">Available variables:</span>
                {TEMPLATE_VARS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setNewRule({...newRule, message: newRule.message + ' ' + v})}
                    className="px-2 py-1 text-[10px] font-mono bg-slate-100 text-slate-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create Rule</button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div className="card p-0">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Active Rules</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {rules.map((rule) => (
            <div key={rule.id} className={`p-5 flex flex-col md:flex-row md:items-center gap-4 transition-opacity ${!rule.active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{rule.name}</h3>
                  <span className={`badge ${getChannelColor(rule.channel)}`}>{rule.channel}</span>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{getEventLabel(rule.event)}</span>
                  {' → '}
                  <span className="text-green-700 font-medium">{getConditionLabel(rule.condition)}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">{rule.message}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => toggleActive(rule.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    rule.active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {rule.active ? 'Active' : 'Paused'}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🔔</div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Auto-Notification Rules</h3>
              <p className="text-slate-500 mb-4">Create your first automated notification rule to keep customers informed.</p>
              <button onClick={() => setShowCreateForm(true)} className="btn-primary">Create First Rule</button>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold">ℹ</span>
          </div>
          <div>
            <h4 className="font-bold text-blue-900">How Auto-Notifications Work</h4>
            <p className="text-sm text-blue-800/80 leading-relaxed mt-1">
              Auto-notification rules automatically send alerts based on conditions you define. For example, you can create a rule that 
              sends an email to all customers whose booking is due in 1 day. The system checks active bookings periodically and triggers 
              notifications that match your conditions. Use template variables like <code className="bg-blue-100 px-1 rounded">{'{customer_name}'}</code> to 
              personalize messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

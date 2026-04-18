'use client';

import { useState, useEffect } from "react";
import { ticketStore, SupportTicket } from "@/lib/storage";
import { authClient } from "@/lib/auth-client";

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (user) {
      setTickets(ticketStore.getAll(user.id));
    }
  }, []);

  const createTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    ticketStore.create({
      subject,
      status: 'open',
      priority,
      messages: [{
        id: crypto.randomUUID(),
        sender: 'user',
        message,
        createdAt: new Date().toISOString(),
      }],
    });

    setSubject("");
    setMessage("");
    setShowCreateForm(false);

    const user = authClient.getCurrentUser();
    if (user) {
      setTickets(ticketStore.getAll(user.id));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'closed': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1>
            <p className="text-slate-600 mt-1">Get help with your rentals</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-800 transition-colors"
          >
            New Ticket
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create Support Ticket</h2>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-700 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No support tickets</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              If you need help with your booking or have questions about our service, create a new support ticket and our team will get back to you.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{ticket.subject}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Created {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadgeColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}


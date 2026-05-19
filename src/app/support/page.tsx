'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  subscribeToUserThreads,
  createSupportThread,
  customerReplyToThread,
  subscribeToReplies,
  markThreadReadByCustomer,
  type SupportThread,
  type SupportReply,
} from '@/lib/support-service';
import { MessageSquare, Send, Plus, ArrowLeft, CheckCircle } from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = authClient.getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToUserThreads(user.id, (data) => {
      setThreads(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedThread) return;
    markThreadReadByCustomer(selectedThread.id);
    const unsub = subscribeToReplies(selectedThread.id, (data) => {
      setReplies(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [selectedThread]);

  const handleCreate = async () => {
    const user = authClient.getCurrentUser();
    if (!user || !newSubject.trim() || !newMessage.trim()) return;
    await createSupportThread(user.id, user.name || user.email, newSubject, newMessage);
    setNewSubject('');
    setNewMessage('');
    setShowNewForm(false);
  };

  const handleReply = async () => {
    const user = authClient.getCurrentUser();
    if (!user || !selectedThread || !replyText.trim()) return;
    await customerReplyToThread(selectedThread.id, user.id, user.name || user.email, replyText);
    setReplyText('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        </div>

        {!selectedThread ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-600">Your support conversations</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Request
              </button>
            </div>

            {showNewForm && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                />
                <textarea
                  placeholder="Describe your issue..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={handleCreate} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                    Submit
                  </button>
                  <button onClick={() => setShowNewForm(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {threads.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No support requests yet</p>
                <p className="text-sm text-slate-500 mt-1">Create a new request if you need help.</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThread(t)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900">{t.subject}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{t.last_message}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span>{new Date(t.updated_at).toLocaleDateString()}</span>
                    {t.unread_count ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">{t.unread_count} unread</span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[70vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <button onClick={() => setSelectedThread(null)} className="text-sm text-slate-500 hover:text-slate-900 mb-1 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <h3 className="font-semibold text-slate-900">{selectedThread.subject}</h3>
              </div>
              {selectedThread.status === 'resolved' && (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Resolved
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {replies.map((r) => (
                <div key={r.id} className={`flex ${r.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${r.sender_role === 'customer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <p className="text-xs opacity-70 mb-1">{r.sender_name}</p>
                    <p>{r.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {selectedThread.status === 'open' && (
              <div className="p-4 border-t border-slate-100 flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                />
                <button onClick={handleReply} className="px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

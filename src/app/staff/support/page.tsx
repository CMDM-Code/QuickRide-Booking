'use client';

import { useEffect, useState, useRef } from 'react';
import {
  subscribeToSupportThreads,
  replyToThread,
  resolveThread,
  subscribeToReplies,
  markThreadReadByStaff,
  type SupportThread,
  type SupportReply,
} from '@/lib/support-service';
import { staffAuth } from '@/lib/staff-auth';
import { Send, CheckCircle, MessageSquare, ArrowLeft } from 'lucide-react';

export default function StaffSupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToSupportThreads((data) => {
      setThreads(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedThread) return;
    markThreadReadByStaff(selectedThread.id);
    const unsub = subscribeToReplies(selectedThread.id, (data) => {
      setReplies(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [selectedThread]);

  const handleReply = async () => {
    const session = staffAuth.getSession();
    if (!session?.userId || !selectedThread || !replyText.trim()) return;
    await replyToThread(selectedThread.id, session.userId, session.name || 'Staff', 'staff', replyText);
    setReplyText('');
  };

  const handleResolve = async () => {
    if (!selectedThread) return;
    await resolveThread(selectedThread.id, 'Staff');
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
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Support Inbox</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[75vh]">
          {/* Thread List */}
          <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-600">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No support requests</p>
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedThread?.id === t.id ? 'bg-slate-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm text-slate-900 truncate">{t.subject}</h4>
                      {t.unread_staff_count ? (
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{t.user_name || 'Customer'}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{t.last_message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(t.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            {selectedThread ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedThread.subject}</h3>
                    <p className="text-xs text-slate-500">{selectedThread.user_name || 'Customer'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedThread.status === 'open' && (
                      <button
                        onClick={handleResolve}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Resolve
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {replies.map((r) => (
                    <div key={r.id} className={`flex ${r.sender_role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${r.sender_role === 'customer' ? 'bg-slate-100 text-slate-800' : 'bg-slate-900 text-white'}`}>
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
                      placeholder="Type a reply..."
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                    />
                    <button onClick={handleReply} className="px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>Select a conversation to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

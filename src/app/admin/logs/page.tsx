'use client';

import { useState, useEffect } from "react";
import { fetchRecentLogs } from "@/lib/error-service";
import { SystemLog } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { 
  AlertCircle, 
  Clock, 
  User, 
  Code, 
  RefreshCw,
  Search
} from "lucide-react";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const data = await fetchRecentLogs();
    setLogs(data);
    setLoading(false);
  }

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Logs</h1>
          <p className="text-slate-500 font-medium mt-1">Monitor critical errors and system events in real-time.</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs by message or user ID..."
          className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] border border-slate-100 bg-white shadow-sm font-medium text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <p className="text-slate-500 font-medium">Fetching latest logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">System Healthy</h3>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">
            No critical errors have been logged recently.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:border-red-100 transition-all group">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Error</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 truncate">{log.message}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      User: <span className="font-bold text-slate-700">{log.user_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Code className="w-3.5 h-3.5" />
                      Log ID: <span className="font-mono text-slate-400">{log.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <button className="px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 transition-all opacity-0 group-hover:opacity-100">
                  View Details
                </button>
              </div>
              
              {log.stack && (
                <div className="px-8 pb-8">
                  <div className="bg-slate-950 p-6 rounded-2xl overflow-x-auto">
                    <pre className="text-[10px] font-mono text-slate-400 leading-relaxed">
                      {log.stack}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

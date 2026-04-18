'use client';
import { useEffect, useState } from "react";
import { adminStore, SecurityLog } from "@/lib/admin-store";

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);

  useEffect(() => {
    setLogs(adminStore.getSecurityLogs());
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Security Logs</h1>
          <p className="text-slate-600 mt-1">Immutable audit trail of all system activity</p>
        </div>

        <div className="card">
          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Security Events</h3>
              <p className="text-slate-600">System activity will be logged here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-700 font-mono">{formatTimestamp(log.timestamp)}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{log.action}</td>
                      <td className="py-3 px-4 text-slate-700 text-sm">{log.userId.substring(0, 12)}...</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <p className="text-amber-800 text-sm">
            ⚠️ <strong>Security Note:</strong> These logs are append-only and cannot be modified or deleted. All administrative actions are automatically recorded for audit purposes.
          </p>
        </div>
      </div>
    </>
  );
}

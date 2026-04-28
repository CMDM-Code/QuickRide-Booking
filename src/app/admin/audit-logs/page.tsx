'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  getAllAuditLogs, 
  filterAuditLogs, 
  getFilterOptions,
  AuditLogEntry, 
  AuditLogFilter,
  AuditActionType,
  EntityType,
  ActorRole,
  exportAuditLogs,
  clearAuditLogs
} from '@/lib/audit-log-service';
import { 
  Filter, Download, Trash2, Search, RefreshCw, 
  Calendar, User, Tag, AlertCircle, Info, AlertTriangle,
  ChevronDown, ChevronUp, X, CheckCircle2, Cloud,
  CloudOff
} from 'lucide-react';
import { syncQueuedLogs, getCachedLogs } from '@/lib/audit-log-service';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearReason, setClearReason] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Filter states
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    entityTypes: [] as EntityType[],
    actionTypes: [] as AuditActionType[],
    actors: [] as { id: string; name: string; role: ActorRole }[],
    severities: [] as ('info' | 'warning' | 'critical')[]
  });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    const filtered = filterAuditLogs(logs, filters);
    setFilteredLogs(filtered);
  }, [logs, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await getAllAuditLogs();
      setLogs(allLogs);
      setFilterOptions(getFilterOptions(allLogs));
    } catch (error) {
      console.error('Failed to load logs:', error);
      // Fallback to cache
      const cached = getCachedLogs();
      setLogs(cached);
      setFilterOptions(getFilterOptions(cached));
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const synced = await syncQueuedLogs();
      setSyncCount(synced);
      if (synced > 0) {
        await loadLogs();
      }
      setTimeout(() => setSyncCount(0), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExport = () => {
    const json = exportAuditLogs(filteredLogs);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleClear = () => {
    if (!clearReason.trim()) return;
    const success = clearAuditLogs('admin', 'Administrator', clearReason);
    if (success) {
      loadLogs();
      setShowClearDialog(false);
      setClearReason('');
    }
  };

  const updateFilter = (key: keyof AuditLogFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Immutable audit trail with before/after snapshots</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing || !isOnline}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl font-medium transition-all disabled:opacity-50 ${
              syncCount > 0 ? 'border-green-300 text-green-700 bg-green-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {syncCount > 0 ? `Synced ${syncCount}` : 'Sync'}
          </button>
          
          {exportSuccess && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Exported!
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowClearDialog(true)}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Logs</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{logs.length.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtered</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{filteredLogs.length.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical</p>
          <p className="text-2xl font-black text-red-600 mt-1">
            {logs.filter(l => l.severity === 'critical').length.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Range</p>
          <p className="text-sm font-bold text-slate-700 mt-2">
            {logs.length > 0 ? `${formatDate(logs[logs.length - 1]?.timestamp).split(',')[0]} - ${formatDate(logs[0]?.timestamp).split(',')[0]}` : 'No data'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-slate-700 font-bold hover:text-slate-900"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Entity Type Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Entity Type
                </label>
                <select
                  value={filters.entityType || ''}
                  onChange={(e) => updateFilter('entityType', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="">All Types</option>
                  {filterOptions.entityTypes.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              {/* Action Type Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Action
                </label>
                <select
                  value={filters.actionType || ''}
                  onChange={(e) => updateFilter('actionType', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="">All Actions</option>
                  {filterOptions.actionTypes.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              {/* Actor Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <User className="w-3 h-3 inline mr-1" />
                  Actor
                </label>
                <select
                  value={filters.actorId || ''}
                  onChange={(e) => updateFilter('actorId', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="">All Users</option>
                  {filterOptions.actors.map(actor => (
                    <option key={actor.id} value={actor.id}>
                      {actor.name} ({actor.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Severity
                </label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => updateFilter('severity', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="">All Severities</option>
                  {filterOptions.severities.map(sev => (
                    <option key={sev} value={sev}>{sev.replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Search className="w-3 h-3 inline mr-1" />
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in logs..."
                    value={filters.searchQuery || ''}
                    onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Entity</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actor</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {logs.length === 0 ? 'No Audit Logs' : 'No Matching Logs'}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {logs.length === 0 
                        ? 'System activity will be logged here automatically.' 
                        : 'Try adjusting your filter criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 100).map((log) => (
                  <>
                    <tr 
                      key={log.id} 
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border ${getSeverityClass(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-slate-900">
                          {log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <span className="font-medium text-slate-900">{log.entity_type}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-slate-600 font-mono text-xs">{log.entity_id.substring(0, 12)}...</span>
                        </div>
                        {log.entity_name && (
                          <p className="text-xs text-slate-500 mt-0.5">{log.entity_name}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <span className="font-medium text-slate-900">{log.actor_name || 'Unknown'}</span>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 mt-1">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">{log.reason || '-'}</p>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Before Snapshot */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Before
                              </h4>
                              <pre className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 overflow-auto max-h-48">
                                {log.before_snapshot ? JSON.stringify(log.before_snapshot, null, 2) : 'No data'}
                              </pre>
                            </div>
                            {/* After Snapshot */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                After
                              </h4>
                              <pre className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 overflow-auto max-h-48">
                                {log.after_snapshot ? JSON.stringify(log.after_snapshot, null, 2) : 'No data'}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-200 grid md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 font-bold uppercase">Log ID:</span>
                              <span className="ml-2 text-slate-600 font-mono">{log.id}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase">Actor ID:</span>
                              <span className="ml-2 text-slate-600 font-mono">{log.actor_id}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase">IP Address:</span>
                              <span className="ml-2 text-slate-600 font-mono">{log.ip_address || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 100 && (
          <div className="p-4 border-t border-slate-200 text-center text-sm text-slate-500">
            Showing first 100 of {filteredLogs.length} logs. Use filters to narrow results.
          </div>
        )}
      </div>

      {/* Clear Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Clear All Audit Logs?</h3>
            <p className="text-slate-500 mb-4">
              This will permanently delete all {logs.length} audit log entries. This action is irreversible and will be logged.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <label className="block text-sm font-bold text-amber-800 mb-2">
                Reason (required) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={clearReason}
                onChange={(e) => setClearReason(e.target.value)}
                placeholder="Explain why you are clearing all audit logs..."
                className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowClearDialog(false); setClearReason(''); }}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={!clearReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

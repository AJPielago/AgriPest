import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, User, Download, Filter, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import { downloadCsv } from '../../utils/csvExport';

const PAGE_SIZE = 25;

export const AuditLogs = () => {
  const { lang, t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL'); // 'ALL' | 'DETECTION' | 'AUTH' | 'ADMIN'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = {
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
          category: actionFilter,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        const res = await api.get('/admin/audit', { params });
        setLogs(res.data.items || []);
        setTotal(res.data.total ?? (res.data.items || []).length);
      } catch (err) {
        console.error("Error loading audit logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [actionFilter, page, debouncedSearch]);

  const handleFilterChange = (type) => {
    setPage(0);
    setActionFilter(type);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ["Timestamp", "User Name", "Action", "IP Address", "Details"];
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.user_name,
      l.action,
      l.ip_address || 'N/A',
      l.details || 'N/A',
    ]);
    downloadCsv(`agripest_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      
      {/* Header Workstation Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700">
              {lang === 'tl' ? 'TALAAN NG AUDIT' : 'SYSTEM AUDIT STREAM'}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Activity className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            {t('systemAuditLogs')}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {t('realtimeMonitoring')}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={handleExportCSV}
          disabled={logs.length === 0}
        >
          {lang === 'tl' ? 'I-download ang CSV' : 'Export Audit CSV'}
        </Button>
      </div>

      {/* Action Category Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'tl' ? 'Maghanap sa detalye o aksyon...' : 'Search action, details, or IP...'}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-sans font-bold">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">Filter:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-md border border-slate-300 dark:border-slate-800 font-sans font-bold">
            {['ALL', 'DETECTION', 'AUTH', 'ADMIN'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFilterChange(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                  actionFilter === type
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card title={t('systemAuditLogs')} subtitle={`Showing ${logs.length} of ${total} recorded telemetry events (Page ${page + 1} of ${totalPages})`}>
        {loading ? (
          <LoadingSpinner label={lang === 'tl' ? 'Ikinakarga ang talaan ng audit...' : 'Loading audit trail...'} />
        ) : logs.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-sans">
                    <th className="py-2.5 px-3">{t('timestamp')}</th>
                    <th className="py-2.5 px-3">{t('user')}</th>
                    <th className="py-2.5 px-3">{t('actions')}</th>
                    <th className="py-2.5 px-3">{t('details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-xs font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-bold whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100 font-bold font-sans flex items-center gap-1.5 whitespace-nowrap">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {log.user_name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge 
                          variant={
                            log.action.includes('DETECTION') ? 'success' : 
                            log.action.includes('ADMIN') || log.action.includes('DELETE') || log.action.includes('FAILED') ? 'danger' : 'info'
                          } 
                          className="text-xs font-mono"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans max-w-md truncate font-medium" title={log.details || ''}>
                        {log.details || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'tl' ? `Pahina ${page + 1} ng ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    {lang === 'tl' ? 'Nakaraan' : 'Prev'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronRight}
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    {lang === 'tl' ? 'Susunod' : 'Next'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-6 text-xs">{t('noLogs')}</p>
        )}
      </Card>

    </div>
  );
};


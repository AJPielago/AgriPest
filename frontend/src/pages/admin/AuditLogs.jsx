import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, ShieldAlert, User, Download, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const AuditLogs = () => {
  const { lang, t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL'); // 'ALL' | 'DETECTION' | 'AUTH' | 'ADMIN'

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit');
        setLogs(res.data.items || []);
      } catch (err) {
        console.error("Error loading audit logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (actionFilter === 'ALL') return true;
    if (actionFilter === 'DETECTION') return l.action.includes('DETECTION');
    if (actionFilter === 'AUTH') return l.action.includes('LOGIN') || l.action.includes('AUTH') || l.action.includes('REGISTER');
    if (actionFilter === 'ADMIN') return l.action.includes('ADMIN') || l.action.includes('USER') || l.action.includes('CROP') || l.action.includes('PEST');
    return true;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "User Name", "Action", "Details"];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.user_name}"`,
      `"${l.action}"`,
      `"${(l.details || 'N/A').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agripest_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          disabled={filteredLogs.length === 0}
        >
          {lang === 'tl' ? 'I-download ang CSV' : 'Export Audit CSV'}
        </Button>
      </div>

      {/* Action Category Filter Segmented Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-sans font-bold">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">Filter Stream:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-md border border-slate-300 dark:border-slate-800 w-full sm:w-auto font-sans font-bold">
          {['ALL', 'DETECTION', 'AUTH', 'ADMIN'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActionFilter(type)}
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

      <Card title={t('systemAuditLogs')} subtitle={`Showing ${filteredLogs.length} of ${logs.length} recorded telemetry events`}>
        {loading ? (
          <LoadingSpinner label={t('analyzingImage')} />
        ) : filteredLogs.length > 0 ? (
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
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-bold">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100 font-bold font-sans flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {log.user_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge 
                        variant={
                          log.action.includes('DETECTION') ? 'success' : 
                          log.action.includes('ADMIN') || log.action.includes('DELETE') ? 'danger' : 'info'
                        } 
                        className="text-xs font-mono"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans max-w-md truncate font-medium">
                      {log.details || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-6 text-xs">{t('noLogs')}</p>
        )}
      </Card>

    </div>
  );
};


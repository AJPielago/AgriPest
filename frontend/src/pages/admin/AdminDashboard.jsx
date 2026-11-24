import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShieldAlert, Users, Sprout, Bug, Activity, ArrowRight, Server, HardDrive, CheckCircle2, Flag, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const AdminDashboard = () => {
  const { lang, t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [flaggedScans, setFlaggedScans] = useState([]);
  const [exportingFlagged, setExportingFlagged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, healthRes, flaggedRes] = await Promise.all([
          api.get('/admin/metrics'),
          api.get('/admin/health'),
          api.get('/admin/flagged-scans?limit=15')
        ]);
        setMetrics(metricsRes.data);
        setHealth(healthRes.data);
        setFlaggedScans(flaggedRes.data?.items || []);
      } catch (err) {
        console.error("Error loading admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportFlagged = async () => {
    setExportingFlagged(true);
    try {
      const res = await api.get('/admin/flagged-scans/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flagged_scans_active_learning.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export flagged scans:', err);
    } finally {
      setExportingFlagged(false);
    }
  };

  if (loading) return <LoadingSpinner label={t('analyzingImage')} size="lg" />;

  return (
    <div className="space-y-4">
      
      {/* Header Workstation Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700">
              {t('systemAdmin')}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <ShieldAlert className="w-5 h-5 text-red-700 dark:text-red-400" />
            {lang === 'tl' ? 'Pangkalahatang Tanawin ng Admin' : 'System Administration Dashboard'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {t('realtimeMonitoring')}
          </p>
        </div>
      </div>

      {/* System Health & Infrastructure Monitor Panel */}
      <div className="bg-slate-950 text-slate-100 p-4 rounded-md border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-200 font-sans">
              {lang === 'tl' ? 'Pagsusuri sa Kalagayan ng Sistema at Imprastraktura' : 'System Health & Telemetry Monitor'}
            </h3>
          </div>
          <Badge variant="success" className="text-xs font-mono">
            {lang === 'tl' ? 'MAHUSAY' : (health?.status?.toUpperCase() || 'HEALTHY')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-900 rounded-md border border-slate-800">
            <span className="text-slate-400 block text-xs font-bold">
              {lang === 'tl' ? 'KONEKSYON SA DATABASE' : 'DB CONNECTIVITY'}
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'tl' ? 'SQLite Aktibo' : 'SQLite Active'}
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-md border border-slate-800">
            <span className="text-slate-400 block text-xs font-bold">
              {lang === 'tl' ? 'ENGINE STATUS' : 'ENGINE PIPELINE'}
            </span>
            <span className="font-bold text-emerald-400 mt-1 block text-xs">
              ONLINE
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-md border border-slate-800">
            <span className="text-slate-400 block text-xs font-bold">
              {lang === 'tl' ? 'IMBAKAN NG MGA LARAWAN' : 'UPLOAD STORAGE'}
            </span>
            <span className="font-bold text-slate-200 flex items-center gap-1 mt-1 text-xs">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" /> 
              {lang === 'tl' 
                ? `${health?.upload_file_count || 0} Larawan` 
                : `${health?.upload_file_count || 0} Files Stored`}
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-md border border-slate-800">
            <span className="text-slate-400 block text-xs font-bold">PYTHON RUNTIME</span>
            <span className="font-bold text-slate-200 mt-1 block text-xs">
              v{health?.python_version || '3.14'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Quick Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">{t('userDirectory')}</span>
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics?.total_users || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-900 dark:text-slate-100" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">{t('cropManagement')}</span>
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics?.total_crops || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">{t('pestRulesEditor')}</span>
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics?.total_pests || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Bug className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">{t('totalScans')}</span>
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics?.total_detections || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-sky-700 dark:text-sky-400" />
          </div>
        </div>
      </div>

      {/* Navigation Modules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title={t('userDirectory')} 
          subtitle={lang === 'tl' ? 'Pamahalaan ang mga account at tungkulin' : 'Manage accounts & role permissions'}
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">
            {lang === 'tl' 
              ? 'Tingnan ang profile ng mga gumagamit, magtakda ng tungkulin, o ihinto ang access ng account.' 
              : 'View user profiles, assign administrative roles, or deactivate accounts.'}
          </p>
          <Link to="/admin/users" className="block">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowRight}>
              {lang === 'tl' ? 'Buksan ang Pamamahala ng Gumagamit' : 'Open User Manager'}
            </Button>
          </Link>
        </Card>

        <Card 
          title={t('cropManagement')} 
          subtitle={lang === 'tl' ? 'Magdagdag o magbago ng target na pananim' : 'Add or change host crops'}
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">
            {lang === 'tl' 
              ? 'Pamahalaan ang mga aktibong pananim nang hindi binabago ang system code.' 
              : 'Manage active crops dynamically without changing code.'}
          </p>
          <Link to="/admin/crops" className="block">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowRight}>
              {lang === 'tl' ? 'Buksan ang Pamamahala ng Pananim' : 'Open Crop Manager'}
            </Button>
          </Link>
        </Card>

        <Card 
          title={t('pestRulesEditor')} 
          subtitle={lang === 'tl' ? 'Panatilihin ang impormasyon ng mga peste' : 'Maintain pest species'}
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">
            {lang === 'tl' 
              ? 'Magdagdag ng mga bagong uri ng peste, sintomas, at inirerekomendang hakbang sa pagsugpo.' 
              : 'Add new pest species, symptoms, host crop links, and remediation advice.'}
          </p>
          <Link to="/admin/pests" className="block">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowRight}>
              {lang === 'tl' ? 'Buksan ang Pamamahala ng Peste' : 'Open Pest Manager'}
            </Button>
          </Link>
        </Card>

        <Card 
          title={t('diseaseRulesEditor')} 
          subtitle={lang === 'tl' ? 'Pamahalaan ang mga sakit sa pananim' : 'Maintain disease catalog'}
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">
            {lang === 'tl' 
              ? 'Magdagdag ng uri ng sakit, taxonomy ng pathogen, sintomas, at mga pamamaraan sa paggamot.' 
              : 'Add plant disease species, pathogen taxonomy, symptoms, and treatment protocols.'}
          </p>
          <Link to="/admin/diseases" className="block">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowRight}>
              {lang === 'tl' ? 'Buksan ang Pamamahala ng Sakit' : 'Open Disease Manager'}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Active-Learning Queue: Farmer-Flagged Inaccurate Scans */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'tl' ? 'Mga Flagged Scan para sa Active Learning' : 'Active-Learning Queue (Flagged Inaccurate Scans)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'tl'
                  ? 'Mga scan na minarkahan ng mga magsasaka para sa pagpapabuti at retraining ng AI model.'
                  : 'Farmer-flagged scans with field correction notes ready for review and model retraining.'}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportFlagged}
            disabled={exportingFlagged || flaggedScans.length === 0}
          >
            {exportingFlagged
              ? (lang === 'tl' ? 'Ina-export...' : 'Exporting...')
              : (lang === 'tl' ? `I-export (${metrics?.flagged_detections ?? flaggedScans.length})` : `Export Retraining JSON (${metrics?.flagged_detections ?? flaggedScans.length})`)}
          </Button>
        </div>

        {flaggedScans.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            {lang === 'tl'
              ? 'Walang naka-flag na scan sa ngayon. Kapag minarkahan ng magsasaka ang resulta bilang hindi wasto, lalabas ito rito.'
              : 'No flagged inaccurate scans yet. When farmers mark a report as Inaccurate, it appears here for retraining review.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Crop</th>
                  <th className="py-2 pr-3">AI Prediction</th>
                  <th className="py-2 pr-3">Farmer Correction Notes</th>
                  <th className="py-2">Farmer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {flaggedScans.map((item) => (
                  <tr key={item.id} className="text-slate-800 dark:text-slate-200">
                    <td className="py-2 pr-3 font-mono font-bold">#{item.id}</td>
                    <td className="py-2 pr-3 font-semibold">{item.crop_name}</td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{item.predicted_pest || item.predicted_disease}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({Math.round((item.confidence_score || 0) * 100)}%)</span>
                    </td>
                    <td className="py-2 pr-3 text-amber-800 dark:text-amber-300">{item.feedback_notes || '—'}</td>
                    <td className="py-2 text-slate-500">{item.farmer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};


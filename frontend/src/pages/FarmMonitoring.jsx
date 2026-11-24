import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { cropService } from '../services/cropService';
import { detectionService } from '../services/detectionService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DownloadReportDropdown } from '../components/common/DownloadReportDropdown';
import { downloadCsv } from '../utils/csvExport';
import '../components/common/ChartConfig';
import { STITCH_COLORS } from '../components/common/ChartConfig';

export const FarmMonitoring = () => {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [crops, setCrops] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cropsData, statsData] = await Promise.all([
          cropService.getCrops(),
          detectionService.getDashboardStats()
        ]);
        setCrops(cropsData || []);
        setStats(statsData || {});
      } catch (err) {
        console.error("Error loading farm monitoring data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const criticalRecords = (stats?.recent_records || []).filter(
    r => r.severity === 'Critical' || r.severity === 'High'
  );

  // Health Trend Chart.js configuration backed by real backend daily_health_trend
  const dailyTrend = stats?.daily_health_trend || [];
  const healthTrendData = useMemo(() => {
    const labels = dailyTrend.length > 0
      ? dailyTrend.map((d) => new Date(d.date).toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' }))
      : [lang === 'tl' ? 'Walang Datos' : 'No Data'];
    const values = dailyTrend.length > 0
      ? dailyTrend.map((d) => d.health_score)
      : [stats?.overall_health_score ?? 100];
    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Kalusugan ng Bukid (%)' : 'Farm Health (%)',
          data: values,
          borderColor: isDark ? '#62df7d' : STITCH_COLORS.secondary,
          backgroundColor: isDark ? 'rgba(98, 223, 125, 0.15)' : 'rgba(0, 110, 45, 0.12)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: isDark ? '#62df7d' : STITCH_COLORS.secondary,
          pointBorderColor: isDark ? '#1e293b' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    };
  }, [dailyTrend, stats, lang, isDark]);

  const healthTrendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        min: 50,
        max: 100,
        grid: {
          color: isDark ? '#334155' : '#e5eeff'
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 },
          callback: (value) => `${value}%`
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 }
        }
      }
    }
  }), [isDark]);

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang telemetry ng bukid..." : "Aggregating farm zone metrics..."} size="lg" />;

  const cropSummary = stats?.crop_health_summary || [];
  const zonesData = cropSummary.length > 0
    ? cropSummary.map((item, idx) => ({
        name: `${lang === 'tl' ? 'Sektor' : 'Sector'} ${idx + 1}: ${lang === 'tl' ? item.crop_name_tl : item.crop_name}`,
        crop: lang === 'tl' ? item.crop_name_tl : item.crop_name,
        icon: idx === 0 ? 'eco' : idx === 1 ? 'grass' : 'local_florist',
        health: item.health_score,
        isHealthy: item.health_score >= 75 && item.active_alerts === 0,
        lastMonitored: item.last_monitored
          ? new Date(item.last_monitored).toLocaleString(lang === 'tl' ? 'fil-PH' : undefined, { dateStyle: 'medium', timeStyle: 'short' })
          : (lang === 'tl' ? 'Wala pang pagsusuri' : 'No scans yet'),
        alerts: item.active_alerts,
        scanCount: item.scan_count,
      }))
    : crops.map((c, idx) => ({
        name: `${lang === 'tl' ? 'Sektor' : 'Sector'} ${idx + 1}: ${lang === 'tl' && c.name_tl ? c.name_tl : c.name}`,
        crop: lang === 'tl' && c.name_tl ? c.name_tl : c.name,
        icon: 'eco',
        health: 100,
        isHealthy: true,
        lastMonitored: lang === 'tl' ? 'Wala pang pagsusuri' : 'No scans yet',
        alerts: 0,
        scanCount: 0,
      }));

  const overallHealth = stats?.overall_health_score ?? 100;
  const totalAlertsCount = zonesData.reduce((acc, z) => acc + (z.alerts || 0), 0);
  const totalScansCount = stats?.total_detections ?? 0;

  const handleExportCSV = () => {
    const headers = ["Zone_Name", "Host_Crop", "Total_Scans", "Health_Percentage", "Status", "Active_Alerts", "Last_Monitored"];
    const rows = zonesData.map(z => [
      z.name,
      z.crop,
      z.scanCount ?? 0,
      `${z.health}%`,
      z.isHealthy ? 'Healthy' : 'Needs Attention',
      z.alerts,
      z.lastMonitored
    ]);
    downloadCsv(`farm_zone_monitoring_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Printable Report Header */}
      <div className="print-header">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('farmMonitoringReportTitle')}</h1>
          <p className="text-xs text-on-surface-variant">Costales Nature Farms · Brgy. Gagalot, Majayjay, Laguna</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('printDate')}: {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs font-bold text-secondary">8.0 ha Certified Organic Farm · 4 Zones</p>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-[32px] font-bold text-on-surface dark:text-inverse-on-surface">
            {t('farmMonitoring')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {lang === 'tl' ? 'Real-time na pangkalahatang-ideya ng mga aktibong sona at sukat ng kalusugan.' : 'Real-time overview of active zones and health metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Consolidated Download Report Dropdown (PDF & CSV) */}
          <DownloadReportDropdown
            onDownloadPdf={() => window.print()}
            onDownloadCsv={handleExportCSV}
          />

          <Link
            to="/detect"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant hover:bg-surface-container-low text-on-surface dark:text-inverse-on-surface rounded-full font-label-md text-xs font-semibold transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            <span>{lang === 'tl' ? 'Magsuri ng Sona' : 'New Zone Scan'}</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid (Bento Style from Stitch) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Scans */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{lang === 'tl' ? 'Kabuuang Pagsusuri' : 'Total Scans'}</p>
            <span className="material-symbols-outlined text-outline text-[20px]">landscape</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {totalScansCount} <span className="font-body-md text-xs font-normal text-on-surface-variant font-sans">{lang === 'tl' ? 'naitala' : 'logged'}</span>
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>

        {/* Monitored Zones */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('monitoredZones')}</p>
            <span className="material-symbols-outlined text-outline text-[20px]">my_location</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {zonesData.length} <span className="font-body-md text-xs font-normal text-on-surface-variant font-sans">{lang === 'tl' ? 'Aktibo' : 'Active'}</span>
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>

        {/* Overall Health */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('overallHealth')}</p>
            <span className="material-symbols-outlined text-secondary text-[20px]">health_and_safety</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-secondary dark:text-secondary-fixed">{overallHealth}%</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>

        {/* Active Alerts */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-error/40 rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-error transition-colors bg-error-container/10">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-bold text-error uppercase tracking-wider">{t('activeAlerts')}</p>
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-error">
            {totalAlertsCount} <span className="font-body-md text-xs font-medium text-error/70 font-sans">{t('requiresAction')}</span>
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-error transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Visualization Panels (Charts) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Chart 1: Zone Health Distribution (Stitch Progress Bars) */}
          <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant dark:border-outline flex justify-between items-center bg-surface-bright dark:bg-surface-container">
              <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                {t('zoneHealthDistribution')}
              </h3>
              <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
            </div>
            <div className="p-5 flex flex-col gap-4 bg-surface dark:bg-surface-container-lowest">
              {zonesData.map((z) => (
                <div key={z.name}>
                  <div className="flex justify-between font-label-sm text-xs font-semibold mb-1 text-on-surface dark:text-inverse-on-surface">
                    <span>{z.name} ({z.crop})</span>
                    <span className={z.isHealthy ? 'text-secondary font-bold' : 'text-error font-bold'}>{z.health}%</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container-high dark:bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${z.isHealthy ? 'bg-secondary' : 'bg-error'}`}
                      style={{ width: `${z.health}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Farm Health Trend (Last 30 Days) */}
          <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant dark:border-outline flex justify-between items-center bg-surface-bright dark:bg-surface-container">
              <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                {t('farmHealthTrend')}
              </h3>
              <span className="material-symbols-outlined text-primary text-[20px]">more_vert</span>
            </div>
            <div className="p-5 h-56 relative bg-surface dark:bg-surface-container-lowest">
              <Line data={healthTrendData} options={healthTrendOptions} />
            </div>
          </div>

        </div>

        {/* Right Column: Live Sector Details Cards */}
        <div className="flex flex-col gap-4">
          <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {lang === 'tl' ? 'Mga Detalye ng Sona' : 'Zone Details'}
          </h3>

          {zonesData.map((z) => (
            <div
              key={z.name}
              className={`bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-sm transition-colors flex flex-col gap-2 ${
                z.isHealthy ? 'hover:border-primary' : 'border-l-4 border-l-error'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-outline text-[20px]">{z.icon}</span>
                  <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface truncate">{z.name}</h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold border flex items-center gap-1 shrink-0 ${
                  z.isHealthy
                    ? 'bg-secondary/10 text-secondary border-secondary/20'
                    : 'bg-error/10 text-error border-error/20'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">{z.isHealthy ? 'check' : 'error'}</span>
                  {z.isHealthy ? t('healthy') : t('needsAttention')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant dark:border-outline-variant/40">
                <div>
                  <p className="font-label-sm text-[10px] text-outline">{t('crops')}</p>
                  <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">{z.crop} ({z.scanCount ?? 0} {lang === 'tl' ? 'suri' : 'scans'})</p>
                </div>
                <div>
                  <p className="font-label-sm text-[10px] text-outline">{lang === 'tl' ? 'Huling Sinuri' : 'Last Monitored'}</p>
                  <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">{z.lastMonitored}</p>
                </div>
              </div>
              {z.alerts > 0 && (
                <div className="mt-1 bg-error-container/30 p-2.5 rounded-lg border border-error-container flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">bug_report</span>
                  <div>
                    <p className="font-label-md text-xs font-bold text-error">{z.alerts} {t('alertsDetected')}</p>
                    <p className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">{t('pestThresholdExceeded')}</p>
                  </div>
                </div>
              )}
              <Link to="/history" className="mt-1 text-primary font-label-md text-xs font-bold hover:underline self-start">
                {z.alerts > 0 ? t('reviewAlerts') : (lang === 'tl' ? 'Tingnan ang Kasaysayan' : 'View History')} →
              </Link>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

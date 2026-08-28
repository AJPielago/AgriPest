import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { cropService } from '../services/cropService';
import { detectionService } from '../services/detectionService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DownloadReportDropdown } from '../components/common/DownloadReportDropdown';
import '../components/common/ChartConfig';
import { STITCH_COLORS } from '../components/common/ChartConfig';

export const FarmMonitoring = () => {
  const { lang, t } = useLanguage();
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

  // Health Trend 30-day Chart.js configuration
  const healthTrendData = useMemo(() => {
    const labels = [
      'Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Today'
    ];
    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Kalusugan ng Bukid (%)' : 'Farm Health (%)',
          data: [72, 75, 78, 82, 80, 88, 85],
          borderColor: STITCH_COLORS.secondary,
          backgroundColor: 'rgba(0, 110, 45, 0.12)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: STITCH_COLORS.secondary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    };
  }, [lang]);

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
          color: '#e5eeff'
        },
        ticks: {
          color: STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 },
          callback: (value) => `${value}%`
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 }
        }
      }
    }
  }), []);

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang telemetry ng bukid..." : "Aggregating farm zone metrics..."} size="lg" />;

  const zonesData = [
    {
      name: lang === 'tl' ? 'Sona A' : 'Zone A',
      crop: lang === 'tl' ? 'Repolyo' : 'Cabbage',
      icon: 'eco',
      health: 95,
      isHealthy: true,
      lastMonitored: lang === 'tl' ? 'Ngayong Araw, 08:30 AM' : 'Today, 08:30 AM',
      alerts: 0
    },
    {
      name: lang === 'tl' ? 'Sona B' : 'Zone B',
      crop: lang === 'tl' ? 'Mais' : 'Corn',
      icon: 'grass',
      health: 60,
      isHealthy: false,
      lastMonitored: lang === 'tl' ? 'Ngayong Araw, 11:15 AM' : 'Today, 11:15 AM',
      alerts: criticalRecords.length > 0 ? criticalRecords.length : 2
    },
    {
      name: lang === 'tl' ? 'Sona C' : 'Zone C',
      crop: lang === 'tl' ? 'Soybean' : 'Soybean',
      icon: 'psychology',
      health: 88,
      isHealthy: true,
      lastMonitored: lang === 'tl' ? 'Kahapon, 02:40 PM' : 'Yesterday, 02:40 PM',
      alerts: 0
    },
    {
      name: lang === 'tl' ? 'Sona D' : 'Zone D',
      crop: lang === 'tl' ? 'Kamatis' : 'Tomato',
      icon: 'local_florist',
      health: 92,
      isHealthy: true,
      lastMonitored: lang === 'tl' ? 'Kahapon, 04:10 PM' : 'Yesterday, 04:10 PM',
      alerts: 0
    }
  ];

  const handleExportCSV = () => {
    const headers = ["Zone_Name", "Host_Crop", "Health_Percentage", "Status", "Active_Alerts", "Last_Monitored"];
    const rows = zonesData.map(z => [
      `"${z.name}"`,
      `"${z.crop}"`,
      `${z.health}%`,
      `"${z.isHealthy ? 'Healthy' : 'Needs Attention'}"`,
      z.alerts,
      `"${z.lastMonitored}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `farm_zone_monitoring_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Printable Report Header */}
      <div className="print-header">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('farmMonitoringReportTitle')}</h1>
          <p className="text-xs text-on-surface-variant">AgriMonitor · Precision Agricultural Management</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('printDate')}: {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs font-bold text-secondary">4 Monitored Sectors</p>
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
        {/* Total Area */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('totalFarmArea') || 'Total Area'}</p>
            <span className="material-symbols-outlined text-outline text-[20px]">landscape</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            1,250 <span className="font-body-md text-xs font-normal text-on-surface-variant font-sans">ha</span>
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
            4 <span className="font-body-md text-xs font-normal text-on-surface-variant font-sans">{lang === 'tl' ? 'Aktibo' : 'Active'}</span>
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>

        {/* Overall Health */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('overallHealth')}</p>
            <span className="material-symbols-outlined text-secondary text-[20px]">health_and_safety</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-secondary dark:text-secondary-fixed">85%</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>

        {/* Active Alerts */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-error/40 rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-error transition-colors bg-error-container/10">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-xs font-bold text-error uppercase tracking-wider">{t('activeAlerts')}</p>
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
          </div>
          <p className="font-headline-md text-2xl sm:text-3xl font-bold text-error">
            2 <span className="font-body-md text-xs font-medium text-error/70 font-sans">{t('requiresAction')}</span>
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

        {/* Right Column: Zone Details Cards */}
        <div className="flex flex-col gap-4">
          <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {lang === 'tl' ? 'Mga Detalye ng Sona' : 'Zone Details'}
          </h3>

          {/* Card Zone A (Healthy) */}
          <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-sm hover:border-primary transition-colors flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[20px]">eco</span>
                <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">{t('zoneA')}</h4>
              </div>
              <span className="bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold border border-secondary/20 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span> {t('healthy')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant dark:border-outline-variant/40">
              <div>
                <p className="font-label-sm text-[10px] text-outline">{t('crops')}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">{t('cabbage')}</p>
              </div>
              <div>
                <p className="font-label-sm text-[10px] text-outline">{lang === 'tl' ? 'Huling Sinuri' : 'Last Monitored'}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">Today, 08:30 AM</p>
              </div>
            </div>
            <Link to="/history" className="mt-2 text-primary font-label-md text-xs font-bold hover:underline self-start">
              {lang === 'tl' ? 'Tingnan ang Kasaysayan' : 'View History'} →
            </Link>
          </div>

          {/* Card Zone B (Needs Attention / Alert State) */}
          <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline border-l-4 border-l-error rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-error/5 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[20px]">grass</span>
                <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">{t('zoneB')}</h4>
              </div>
              <span className="bg-error/10 text-error px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold border border-error/20 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span> {t('needsAttention')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant dark:border-outline-variant/40">
              <div>
                <p className="font-label-sm text-[10px] text-outline">{t('crops')}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">{t('corn')}</p>
              </div>
              <div>
                <p className="font-label-sm text-[10px] text-outline">{lang === 'tl' ? 'Huling Sinuri' : 'Last Monitored'}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">Today, 11:15 AM</p>
              </div>
            </div>
            <div className="mt-2 bg-error-container/30 p-2.5 rounded-lg border border-error-container flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">bug_report</span>
              <div>
                <p className="font-label-md text-xs font-bold text-error">2 {t('alertsDetected')}</p>
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">{t('pestThresholdExceeded')}</p>
              </div>
            </div>
            <Link
              to="/history?severity=high"
              className="mt-2 bg-primary text-on-primary font-label-md text-xs font-bold py-2 px-3.5 rounded-lg hover:bg-primary/90 transition-colors self-start text-center shadow-xs"
            >
              {t('reviewAlerts')}
            </Link>
          </div>

          {/* Card Zone C */}
          <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-sm hover:border-primary transition-colors flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[20px]">psychology</span>
                <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">{t('zoneC')}</h4>
              </div>
              <span className="bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold border border-secondary/20 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span> {t('healthy')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant dark:border-outline-variant/40">
              <div>
                <p className="font-label-sm text-[10px] text-outline">{t('crops')}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">Soybean</p>
              </div>
              <div>
                <p className="font-label-sm text-[10px] text-outline">{lang === 'tl' ? 'Huling Sinuri' : 'Last Monitored'}</p>
                <p className="font-body-md text-xs font-semibold text-on-surface dark:text-inverse-on-surface">Yesterday</p>
              </div>
            </div>
            <Link to="/history" className="mt-2 text-primary font-label-md text-xs font-bold hover:underline self-start">
              {lang === 'tl' ? 'Tingnan ang Kasaysayan' : 'View History'} →
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};

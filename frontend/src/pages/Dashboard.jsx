import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { detectionService } from '../services/detectionService';
import { cropService } from '../services/cropService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import '../components/common/ChartConfig';
import { STITCH_COLORS } from '../components/common/ChartConfig';

export const Dashboard = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, cropsData] = await Promise.all([
          detectionService.getDashboardStats(),
          cropService.getCrops()
        ]);
        setStats(statsData);
        setCrops(cropsData || []);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const totalCropsCount = crops.length > 0 ? crops.length : 12;
  const activeAreasCount = 8;
  const pestDetectionsCount = stats?.total_detections !== undefined ? stats.total_detections : 3;
  const criticalRecords = (stats?.recent_records || []).filter(
    r => r.severity === 'Critical' || r.severity === 'High'
  );
  const alertsCount = criticalRecords.length > 0 ? criticalRecords.length : 2;

  // Chart 1: Pest Detection Summary (Donut Chart)
  const pestSummaryData = useMemo(() => {
    const high = criticalRecords.length || 3;
    const medium = (stats?.recent_records || []).filter(r => r.severity === 'Moderate').length || 5;
    const low = Math.max(1, (stats?.total_detections || 16) - high - medium);

    return {
      labels: [
        lang === 'tl' ? 'Mataas na Banta' : 'High Risk',
        lang === 'tl' ? 'Katamtamang Banta' : 'Medium Risk',
        lang === 'tl' ? 'Mababang Banta' : 'Low Risk'
      ],
      datasets: [
        {
          data: [high, medium, low],
          backgroundColor: isDark
            ? ['#fb7185', '#10b981', '#34d399']
            : [STITCH_COLORS.error, STITCH_COLORS.secondary, STITCH_COLORS.primary],
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    };
  }, [criticalRecords, stats, lang, isDark]);

  const pestSummaryOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#f8fafc' : STITCH_COLORS.onSurface,
          boxWidth: 10,
          padding: 14,
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '600'
          }
        }
      }
    },
    cutout: '72%'
  }), [isDark]);

  // Chart 2: Detection Trends (Line Chart - Last 7 Days)
  const detectionTrendsData = useMemo(() => {
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysTl = ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'];
    const labels = lang === 'tl' ? daysTl : daysEn;

    // Use daily_trends from backend if present, else standard trajectory
    const trendValues = stats?.daily_trends && stats.daily_trends.length === 7
      ? stats.daily_trends
      : [2, 5, 3, 7, 4, 6, 3];

    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Mga Pagtukoy' : 'Detections',
          data: trendValues,
          borderColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          backgroundColor: isDark ? 'rgba(123, 216, 177, 0.15)' : 'rgba(0, 93, 66, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          pointBorderColor: isDark ? '#1e293b' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [stats, lang, isDark]);

  const detectionTrendsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: isDark ? '#334155' : STITCH_COLORS.outlineVariant,
          borderDash: [5, 5]
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          },
          stepSize: 2
        },
        beginAtZero: true
      }
    }
  }), [isDark]);

  const translateSeverity = (sev) => {
    if (!sev) return t('lowRisk');
    const lower = sev.toLowerCase();
    if (lower === 'critical') return t('criticalRisk');
    if (lower === 'high') return t('highRisk');
    if (lower === 'moderate') return t('moderateRisk');
    return t('lowRisk');
  };

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang dashboard..." : "Loading dashboard..."} size="lg" />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Welcome Header */}
      <div>
        <h2 className="font-display-lg text-2xl sm:text-[32px] font-bold text-on-surface dark:text-inverse-on-surface mb-1 tracking-tight">
          {t('goodMorning')}, {user?.full_name?.split(' ')[0] || 'Alex'}
        </h2>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            cloud
          </span>
          <span>{t('optimalConditions')} {alertsCount} {t('actionItemsPending')}</span>
        </p>
      </div>

      {/* 2. Summary KPI Cards (Bento Grid Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        
        {/* Card 1: TOTAL CROPS */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-colors flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              {t('totalCrops')}
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">grass</span>
          </div>
          <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {totalCropsCount}
          </span>
        </div>

        {/* Card 2: ACTIVE AREAS */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-colors flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              {t('activeAreas')}
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">map</span>
          </div>
          <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {activeAreasCount}
          </span>
        </div>

        {/* Card 3: PEST DETECTIONS (High Priority Accent) */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline border-l-[4px] border-l-error rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-colors flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-error/5 z-0 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              {t('pestDetections')}
            </span>
            <span className="material-symbols-outlined text-error text-[20px]">bug_report</span>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
              {pestDetectionsCount}
            </span>
            <span className="font-label-sm text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full mb-1">
              {t('highRisk')}
            </span>
          </div>
        </div>

        {/* Card 4: ALERTS */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-colors flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              {t('alertsLabel')}
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">warning</span>
          </div>
          <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {alertsCount}
          </span>
        </div>

      </div>

      {/* 3. Charts Section (Pest Summary Donut & Detection Trends Line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Pest Detection Summary (Donut Chart) */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-4">
          <h3 className="font-title-lg text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {t('pestDetectionSummary')}
          </h3>
          <div className="relative w-full h-64 flex items-center justify-center">
            <Doughnut data={pestSummaryData} options={pestSummaryOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-2xl sm:text-3xl font-bold font-display-lg text-on-surface">64%</span>
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{lang === 'tl' ? 'Malusog' : 'Healthy'}</span>
            </div>
          </div>
        </div>

        {/* Detection Trends (Last 7 Days) */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-4">
          <h3 className="font-title-lg text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {t('detectionTrends')}
          </h3>
          <div className="relative w-full h-64 flex items-center justify-center">
            <Line data={detectionTrendsData} options={detectionTrendsOptions} />
          </div>
        </div>

      </div>

      {/* 4. Bento Grid Layout for Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (lg:col-span-2): RECENT PEST DETECTIONS */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[22px]">bug_report</span>
            <span>{t('recentPestDetections')}</span>
          </h3>

          {stats?.recent_records && stats.recent_records.length > 0 ? (
            stats.recent_records.map((rec) => {
              const isHigh = rec.severity === 'Critical' || rec.severity === 'High';
              return (
                <div
                  key={rec.id}
                  className={`bg-surface-container-lowest dark:bg-surface-container-low border rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col sm:flex-row gap-4 items-start sm:items-center ${
                    isHigh
                      ? 'border-outline-variant dark:border-outline border-l-[4px] border-l-error'
                      : 'border-outline-variant dark:border-outline'
                  }`}
                >
                  <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container border border-outline-variant">
                    <img
                      src={rec.image_path || 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=300&q=80'}
                      alt={rec.pest_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface truncate">
                        {rec.pest_name} {t('onCrop')} {rec.crop_name || (lang === 'tl' ? 'Repolyo' : 'Cabbage')}
                      </span>
                      <span
                        className={`font-label-sm text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                          isHigh
                            ? 'text-error bg-error/10 border-error/20'
                            : 'text-outline bg-surface-variant dark:bg-surface-container border-outline-variant'
                        }`}
                      >
                        {t('severityLabel')}: {translateSeverity(rec.severity)}
                      </span>
                    </div>
                    <span className="font-body-md text-xs text-on-surface-variant">
                      {rec.field_location || (lang === 'tl' ? 'Hilagang Sona, Plot A2' : 'North Sector, Plot A2')}
                    </span>
                    <span className="font-label-md text-[11px] text-outline mt-0.5">
                      {t('detected')}: {new Date(rec.created_at || Date.now()).toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' })}, {new Date(rec.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <Link
                    to={`/history?id=${rec.id}`}
                    className="w-full sm:w-auto bg-surface-container dark:bg-surface-container-high border border-outline-variant text-on-surface dark:text-inverse-on-surface font-label-md text-xs px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors whitespace-nowrap text-center font-semibold"
                  >
                    {t('viewDetails')}
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center text-xs text-on-surface-variant">
              {t('noRecentDetections')}
            </div>
          )}
        </div>

        {/* Right Column: Crop Health Overview & Recent Activity */}
        <div className="flex flex-col gap-6">
          
          {/* Crop Health Overview */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {t('cropHealthOverview')}
            </h3>

            {/* Cabbage Card */}
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
              <div className="flex justify-between items-center pb-2 border-b border-surface-variant dark:border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">local_florist</span>
                  <span className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">{t('cabbage')}</span>
                </div>
                <span className="font-label-sm text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">
                  {t('needsAttention')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-outline">{t('areas')}</span>
                  <span className="font-body-md text-xs text-on-surface dark:text-inverse-on-surface font-semibold">4 {t('plots')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-outline">{t('riskLevel')}</span>
                  <span className="font-body-md text-xs text-error font-semibold">{t('elevated')}</span>
                </div>
              </div>
            </div>

            {/* Corn Card */}
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
              <div className="flex justify-between items-center pb-2 border-b border-surface-variant dark:border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">grass</span>
                  <span className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface">{t('corn')}</span>
                </div>
                <span className="font-label-sm text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  {t('healthy')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-outline">{t('areas')}</span>
                  <span className="font-body-md text-xs text-on-surface dark:text-inverse-on-surface font-semibold">6 {t('plots')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-outline">{t('riskLevel')}</span>
                  <span className="font-body-md text-xs text-secondary font-semibold">{t('lowRisk')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {t('recentActivity')}
            </h3>
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-[0px_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-4">
              
              {/* Activity Item 1 */}
              <div className="flex gap-3 relative">
                <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 z-10 relative">
                  <span className="material-symbols-outlined text-error text-sm">my_location</span>
                </div>
                <div className="absolute left-4 top-8 bottom-[-16px] w-[2px] bg-surface-variant dark:bg-outline-variant/40"></div>
                <div className="flex flex-col">
                  <span className="font-body-md text-xs text-on-surface dark:text-inverse-on-surface font-medium">
                    {t('actNewDetection')}
                  </span>
                  <span className="font-label-sm text-[10px] text-outline">2 {t('hoursAgo')}</span>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="flex gap-3 relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10 relative">
                  <span className="material-symbols-outlined text-primary text-sm">water_drop</span>
                </div>
                <div className="absolute left-4 top-8 bottom-[-16px] w-[2px] bg-surface-variant dark:bg-outline-variant/40"></div>
                <div className="flex flex-col">
                  <span className="font-body-md text-xs text-on-surface dark:text-inverse-on-surface font-medium">
                    {t('actIrrigation')}
                  </span>
                  <span className="font-label-sm text-[10px] text-outline">5 {t('hoursAgo')}</span>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div className="flex gap-3 relative">
                <div className="w-8 h-8 rounded-full bg-surface-variant dark:bg-surface-container-high flex items-center justify-center shrink-0 z-10 relative">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">sync</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-xs text-on-surface dark:text-inverse-on-surface font-medium">
                    {t('actModelsActive')}
                  </span>
                  <span className="font-label-sm text-[10px] text-outline">{t('today')}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

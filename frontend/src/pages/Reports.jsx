import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import { detectionService } from '../services/detectionService';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DownloadReportDropdown } from '../components/common/DownloadReportDropdown';
import { downloadCsv } from '../utils/csvExport';
import { getDetectionSummary } from '../utils/detectionUtils';
import '../components/common/ChartConfig';
import { STITCH_COLORS } from '../components/common/ChartConfig';

export const Reports = () => {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [statsData, cropsData, historyData] = await Promise.all([
          detectionService.getDashboardStats(),
          cropService.getCrops(),
          detectionService.getHistory()
        ]);
        setStats(statsData || {});
        setCrops(cropsData || []);
        setHistory(historyData?.items || []);
      } catch (err) {
        console.error("Error fetching reports data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const handleExportFullCSV = () => {
    if (history.length === 0) {
      alert(lang === 'tl' ? "Walang mga talaan ng pagsusuri upang makabuo ng ulat." : "No diagnostic records available to generate report.");
      return;
    }

    const headers = ["Inspection_ID", "Detected_Pest", "Detected_Disease", "Host_Crop", "Confidence_Score", "Disease_Confidence", "Severity_Level", "Disease_Severity", "Weather_Condition", "Location", "Timestamp"];
    const rows = history.map(d => [
      d.id,
      d.detected_pest_name,
      d.detected_disease_name || 'N/A',
      d.crop_name || 'N/A',
      `${Math.round((d.confidence_score || 0) * 100)}%`,
      d.disease_confidence_score ? `${Math.round(d.disease_confidence_score * 100)}%` : 'N/A',
      d.severity,
      d.disease_severity || 'N/A',
      d.weather_condition || 'Unspecified',
      d.field_location || 'Unspecified',
      new Date(d.created_at).toLocaleString()
    ]);

    downloadCsv(`agri_analytical_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleDownloadSamplePdf = () => {
    window.print();
  };

  // Chart 1: Monthly Pest Detections (Live backend monthly_trends)
  const monthlyTrends = stats?.monthly_trends || [];
  const monthlyPestData = useMemo(() => {
    const labels = monthlyTrends.length > 0
      ? monthlyTrends.map((m) => m.month)
      : [new Date().toISOString().slice(0, 7)];
    const counts = monthlyTrends.length > 0
      ? monthlyTrends.map((m) => m.count)
      : [0];

    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Pagtukoy' : 'Detections',
          data: counts,
          backgroundColor: STITCH_COLORS.error + 'B3',
          borderColor: STITCH_COLORS.error,
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    };
  }, [monthlyTrends, lang]);

  const monthlyPestOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: isDark ? '#334155' : '#e5eeff' },
        ticks: { color: isDark ? '#cbd5e1' : '#0b1c30', font: { family: 'Inter, sans-serif', size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#cbd5e1' : '#0b1c30', font: { family: 'Inter, sans-serif', size: 11 } }
      }
    }
  }), [isDark]);

  // Chart 2: Crop Health Comparison (Backed by real backend crop_health_summary)
  const cropHealthSummary = stats?.crop_health_summary || [];
  const healthComparisonData = useMemo(() => {
    const palette = [
      { bg: STITCH_COLORS.primary + '40', border: isDark ? '#7bd8b1' : STITCH_COLORS.primary },
      { bg: STITCH_COLORS.secondary + '40', border: isDark ? '#62df7d' : STITCH_COLORS.secondary },
      { bg: '#f59e0b40', border: '#f59e0b' },
    ];
    const datasets = cropHealthSummary.slice(0, 3).map((crop, idx) => {
      const color = palette[idx % palette.length];
      const confPct = Math.round((crop.avg_confidence || 0) * 100);
      const alertFreePct = crop.scan_count > 0 ? Math.max(20, Math.round(((crop.scan_count - crop.active_alerts) / crop.scan_count) * 100)) : 100;
      return {
        label: lang === 'tl' ? crop.crop_name_tl : crop.crop_name,
        data: [
          crop.health_score,
          alertFreePct,
          confPct || crop.health_score,
          Math.min(100, crop.scan_count * 10 + 50),
          crop.health_score,
        ],
        backgroundColor: color.bg,
        borderColor: color.border,
        pointBackgroundColor: color.border,
        pointBorderColor: isDark ? '#1e293b' : '#ffffff',
        borderWidth: 2,
        pointRadius: 3,
      };
    });

    return {
      labels: [
        t('vigor'),
        t('diseaseResistance'),
        t('confidence'),
        lang === 'tl' ? 'Saklaw ng Pagsusuri' : 'Scan Coverage',
        t('overallHealth')
      ],
      datasets,
    };
  }, [cropHealthSummary, lang, isDark, t]);

  const healthComparisonOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#f8f9ff' : '#0b1c30',
          boxWidth: 12,
          padding: 12,
          font: { family: 'Inter, sans-serif', size: 11, weight: '500' }
        }
      }
    },
    scales: {
      r: {
        angleLines: { display: true, color: isDark ? '#334155' : '#e5eeff' },
        grid: { color: isDark ? '#334155' : '#e5eeff' },
        pointLabels: {
          color: isDark ? '#f8f9ff' : '#0b1c30',
          font: { family: 'Inter, sans-serif', size: 10, weight: '500' }
        },
        suggestedMin: 50,
        suggestedMax: 100
      }
    }
  }), [isDark]);

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Binubuo ang datos ng mga ulat..." : "Compiling analytical telemetry..."} size="lg" />;

  const totalDetections = stats?.total_detections ?? history.length;
  const avgHealthPercent = stats?.overall_health_score ?? 100;
  const avgConfidencePercent = Math.round((stats?.avg_confidence || 0) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Printable Report Header */}
      <div className="print-header">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('reportsAnalyticsReportTitle')}</h1>
          <p className="text-xs text-on-surface-variant">Costales Nature Farms · Precision Organic Agriculture</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('printDate')}: {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs font-bold text-primary">Certified Organic Farm Summary · Majayjay, Laguna</p>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-[32px] font-bold text-on-surface dark:text-inverse-on-surface">
            {t('reports')}
          </h1>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-1">
            {lang === 'tl' ? 'Bumuo at mag-export ng mga ulat sa pamamahala ng bukid.' : 'Generate and export farm management reports.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Consolidated Download Report Dropdown (PDF & CSV) */}
          <DownloadReportDropdown
            onDownloadPdf={() => window.print()}
            onDownloadCsv={handleExportFullCSV}
          />

          {/* Generate Report Button (Stitch Primary Action) */}
          <button
            onClick={handleExportFullCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-title-lg text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{t('generateReport')}</span>
          </button>
        </div>
      </div>

      {/* Dashboard Grid Summary Cards (Bento Style from Stitch) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Summary Card 1: Pest Detections */}
        <div className="md:col-span-6 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors flex flex-col relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
          <div className="flex justify-between items-start mb-4 pl-2">
            <div>
              <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">{t('pestDetections')}</h3>
              <span className="font-label-md text-xs text-on-surface-variant">{lang === 'tl' ? 'Buwanang Kabuuan' : 'Monthly Total'}</span>
            </div>
            <div className="p-2.5 bg-error-container rounded-full text-on-error-container">
              <span className="material-symbols-outlined text-[20px]">bug_report</span>
            </div>
          </div>
          <div className="flex items-end gap-3 pl-2 mt-auto">
            <span className="text-3xl sm:text-4xl font-display-lg text-on-surface dark:text-inverse-on-surface font-bold">
              {totalDetections}
            </span>
            <span className="font-label-md text-xs font-bold text-on-surface-variant flex items-center mb-1">
              {lang === 'tl' ? `Karaniwang Katiyakan: ${avgConfidencePercent}%` : `Avg Confidence: ${avgConfidencePercent}%`}
            </span>
          </div>
        </div>

        {/* Summary Card 2: Crop Health Avg */}
        <div className="md:col-span-6 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors flex flex-col relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary"></div>
          <div className="flex justify-between items-start mb-4 pl-2">
            <div>
              <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">{lang === 'tl' ? 'Karaniwang Kalusugan ng Pananim' : 'Crop Health Avg.'}</h3>
              <span className="font-label-md text-xs text-on-surface-variant">{lang === 'tl' ? 'Sa lahat ng sektor' : 'Across all sectors'}</span>
            </div>
            <div className="p-2.5 bg-secondary-container/30 rounded-full text-secondary">
              <span className="material-symbols-outlined text-[20px]">energy_savings_leaf</span>
            </div>
          </div>
          <div className="flex items-end gap-3 pl-2 mt-auto">
            <span className="text-3xl sm:text-4xl font-display-lg text-on-surface dark:text-inverse-on-surface font-bold">
              {avgHealthPercent}%
            </span>
            <span className="font-label-md text-xs font-bold text-secondary flex items-center mb-1">
              <span className="material-symbols-outlined text-[16px] mr-1">check_circle</span>
              {lang === 'tl' ? 'Pinakamainam na Kalagayan' : 'Optimal Condition'}
            </span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Monthly Pest Detections Chart */}
        <div className="md:col-span-6 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
          <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface mb-3">
            {t('monthlyPestDetections')}
          </h3>
          <div className="w-full h-64 flex-1">
            <Bar data={monthlyPestData} options={monthlyPestOptions} />
          </div>
        </div>

        {/* Crop Health Comparison Radar Chart */}
        <div className="md:col-span-6 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
          <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface mb-3">
            {t('cropHealthComparison')}
          </h3>
          <div className="w-full h-64 flex-1">
            <Radar data={healthComparisonData} options={healthComparisonOptions} />
          </div>
        </div>

      </div>

      {/* Recent Reports Document Section (Stitch Style) */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant dark:border-outline flex justify-between items-center bg-surface-bright dark:bg-surface-container">
          <h2 className="font-headline-md text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
            {t('recentReports')}
          </h2>
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
        </div>

        <div className="divide-y divide-outline-variant dark:divide-outline-variant/30">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-on-surface-variant">
              {lang === 'tl' ? 'Wala pang naitalang ulat ng pagsusuri.' : 'No diagnostic reports generated yet. Run a scan to populate reports.'}
            </div>
          ) : (
            history.slice(0, 5).map((rec) => (
              <div key={rec.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${
                    rec.severity === 'Critical' || rec.severity === 'High'
                      ? 'bg-error-container/20 text-error'
                      : 'bg-secondary-container/20 text-secondary'
                  }`}>
                    <span className="material-symbols-outlined text-[22px]">
                      {rec.severity === 'Critical' || rec.severity === 'High' ? 'picture_as_pdf' : 'analytics'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                      #{rec.id} · {getDetectionSummary(rec).primaryTitle} {rec.crop_name ? `(${rec.crop_name})` : ''}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {new Date(rec.created_at).toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                      <span>{Math.round((rec.confidence_score || 0) * 100)}% {lang === 'tl' ? 'katiyakan' : 'confidence'}</span>
                      <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[11px] font-bold ${
                        rec.severity === 'Critical' || rec.severity === 'High'
                          ? 'bg-error/10 text-error'
                          : 'bg-secondary/10 text-secondary'
                      }`}>
                        {rec.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto print:hidden">
                  <DownloadReportDropdown
                    variant="compact"
                    onDownloadPdf={handleDownloadSamplePdf}
                    onDownloadCsv={handleExportFullCSV}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3.5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container text-center print:hidden">
          <button
            onClick={handleExportFullCSV}
            className="text-primary dark:text-primary-fixed font-label-md text-xs font-bold hover:underline cursor-pointer"
          >
            {t('viewAllReports')} →
          </button>
        </div>
      </div>

    </div>
  );
};

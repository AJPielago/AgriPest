import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import { detectionService } from '../services/detectionService';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DownloadReportDropdown } from '../components/common/DownloadReportDropdown';
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

    const headers = ["Inspection_ID", "Detected_Pest", "Host_Crop", "Confidence_Score", "Severity_Level", "Weather_Condition", "Location", "Timestamp"];
    const rows = history.map(d => [
      d.id,
      `"${d.detected_pest_name}"`,
      `"${d.crop_name || 'N/A'}"`,
      `${Math.round(d.confidence_score * 100)}%`,
      `"${d.severity}"`,
      `"${d.weather_condition || 'Sunny'}"`,
      `"${d.field_location || 'Field #1'}"`,
      `"${new Date(d.created_at).toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agri_analytical_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSamplePdf = (reportTitle) => {
    window.print();
  };

  // Chart 1: Monthly Pest Detections (Bar Chart)
  const monthlyPestData = useMemo(() => {
    const monthsEn = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const monthsTl = ['May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt'];
    const labels = lang === 'tl' ? monthsTl : monthsEn;

    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Pagtukoy' : 'Detections',
          data: [85, 110, 135, 95, 125, 142],
          backgroundColor: STITCH_COLORS.error + 'B3', // ~70% opacity
          borderColor: STITCH_COLORS.error,
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    };
  }, [lang]);

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

  // Chart 2: Crop Health Comparison (Radar Chart)
  const healthComparisonData = useMemo(() => {
    return {
      labels: [
        t('vigor'),
        t('yieldPotential'),
        t('diseaseResistance'),
        t('waterStress'),
        t('nutrientLevel')
      ],
      datasets: [
        {
          label: t('cabbage'),
          data: [90, 85, 88, 92, 86],
          backgroundColor: STITCH_COLORS.primary + '40', // 25% opacity
          borderColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          pointBackgroundColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          pointBorderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: t('corn'),
          data: [82, 95, 75, 88, 90],
          backgroundColor: STITCH_COLORS.secondary + '40', // 25% opacity
          borderColor: isDark ? '#62df7d' : STITCH_COLORS.secondary,
          pointBackgroundColor: isDark ? '#62df7d' : STITCH_COLORS.secondary,
          pointBorderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    };
  }, [lang, isDark, t]);

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

  const totalDetections = history.length > 0 ? history.length : 142;
  const avgHealthPercent = 94;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Printable Report Header */}
      <div className="print-header">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('reportsAnalyticsReportTitle')}</h1>
          <p className="text-xs text-on-surface-variant">AgriMonitor · Precision Agricultural Management</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('printDate')}: {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs font-bold text-primary">Comprehensive Farm Summary</p>
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
            <span className="font-label-md text-xs font-bold text-error flex items-center mb-1">
              <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
              +12% vs {lang === 'tl' ? 'nakaraang buwan' : 'last month'}
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
          
          {/* Report Item 1 */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-lg bg-error-container/20 flex items-center justify-center text-error shrink-0 mt-1 sm:mt-0">
                <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
              </div>
              <div>
                <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Buod ng Peste - Oktubre 2024' : 'Oct 2024 Pest Summary'}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span> Oct 31, 2024
                  </span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                  <span>2.4 MB</span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                  <span className="px-2 py-0.5 bg-error/10 text-error rounded font-label-sm text-[11px] font-bold">
                    {lang === 'tl' ? 'Mataas na Priyoridad' : 'High Priority Alerts'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto print:hidden">
              <DownloadReportDropdown
                variant="compact"
                onDownloadPdf={() => handleDownloadSamplePdf('Oct 2024 Pest Summary')}
                onDownloadCsv={handleExportFullCSV}
              />
            </div>
          </div>

          {/* Report Item 2 */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0 mt-1 sm:mt-0">
                <span className="material-symbols-outlined text-[22px]">analytics</span>
              </div>
              <div>
                <h4 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Ulat sa Kalusugan ng Pananim - Q3' : 'Q3 Crop Health Report'}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span> Sep 30, 2024
                  </span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                  <span>5.1 MB</span>
                  <span className="w-1 h-1 bg-outline-variant rounded-full hidden sm:block"></span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded font-label-sm text-[11px] font-bold">
                    {lang === 'tl' ? 'Komprehensibo' : 'Comprehensive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto print:hidden">
              <DownloadReportDropdown
                variant="compact"
                onDownloadPdf={() => handleDownloadSamplePdf('Q3 Crop Health Report')}
                onDownloadCsv={handleExportFullCSV}
              />
            </div>
          </div>

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

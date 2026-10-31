import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { detectionService } from '../services/detectionService';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { DetectionReportCard } from '../components/detection/DetectionReportCard';
import { DetectionCompareModal } from '../components/detection/DetectionCompareModal';
import { DownloadReportDropdown } from '../components/common/DownloadReportDropdown';
import '../components/common/ChartConfig';
import { STITCH_COLORS } from '../components/common/ChartConfig';

export const DetectionHistory = () => {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const detailIdParam = searchParams.get('id');

  const [detections, setDetections] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);
  
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [compareList, setCompareList] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [historyData, cropsData] = await Promise.all([
          detectionService.getHistory(selectedCropFilter ? parseInt(selectedCropFilter) : null),
          cropService.getCrops()
        ]);
        setDetections(historyData.items || []);
        setCrops(cropsData || []);

        if (detailIdParam) {
          const target = (historyData.items || []).find(d => d.id === parseInt(detailIdParam));
          if (target) {
            setSelectedDetection(target);
            setIsModalOpen(true);
          }
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCropFilter, detailIdParam]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'tl' ? "Permanenteng burahin ang tala ng pagsusuri na ito?" : "Delete this detection record permanently?")) return;

    try {
      await detectionService.deleteDetection(id);
      setDetections(prev => prev.filter(d => d.id !== id));
      if (selectedDetection?.id === id) {
        setIsModalOpen(false);
        setSelectedDetection(null);
      }
    } catch (err) {
      alert(lang === 'tl' ? "Nabigong burahin ang tala." : "Failed to delete record.");
    }
  };

  const handleToggleCompare = (rec, e) => {
    e.stopPropagation();
    if (compareList.some(item => item.id === rec.id)) {
      setCompareList(prev => prev.filter(item => item.id !== rec.id));
    } else {
      if (compareList.length >= 2) {
        setCompareList([compareList[1], rec]);
      } else {
        setCompareList(prev => [...prev, rec]);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredDetections.length === 0) return;

    const headers = ["ID", "Pest Name", "Crop Name", "Confidence Score", "Severity", "Logged Date"];
    const rows = filteredDetections.map(d => [
      d.id,
      `"${d.detected_pest_name}"`,
      `"${d.crop_name || 'N/A'}"`,
      `${Math.round(d.confidence_score * 100)}%`,
      `"${d.severity}"`,
      `"${new Date(d.created_at).toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agripest_detections_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDetections = useMemo(() => {
    return detections.filter(rec => {
      const matchesQuery = rec.detected_pest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.crop_name && rec.crop_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSeverity = !selectedSeverityFilter || rec.severity?.toLowerCase() === selectedSeverityFilter.toLowerCase();
      return matchesQuery && matchesSeverity;
    });
  }, [detections, searchQuery, selectedSeverityFilter]);

  // Chart 1: Pests by Type (Bar Chart)
  const pestsByTypeData = useMemo(() => {
    const counts = {};
    detections.forEach(d => {
      const name = d.detected_pest_name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const labels = entries.length > 0
      ? entries.map(e => e[0])
      : ['Diamondback Moth', 'Aphids', 'Corn Earworm', 'Spider Mites'];
    const dataValues = entries.length > 0
      ? entries.map(e => e[1])
      : [45, 82, 29, 15];

    const bgColors = [
      STITCH_COLORS.error,
      STITCH_COLORS.amber,
      STITCH_COLORS.primary,
      STITCH_COLORS.surfaceVariant,
      STITCH_COLORS.secondary,
      STITCH_COLORS.tertiary
    ];

    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Bilang ng Pagtukoy' : 'Detections',
          data: dataValues,
          backgroundColor: labels.map((_, i) => bgColors[i % bgColors.length]),
          borderWidth: 0,
          borderRadius: 4
        }
      ]
    };
  }, [detections, lang]);

  const pestsByTypeOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? '#334155' : '#e5eeff'
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 },
          maxRotation: 45,
          minRotation: 0
        }
      }
    }
  }), [isDark]);

  // Chart 2: Detection Frequency (Line Chart)
  const frequencyData = useMemo(() => {
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysTl = ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'];
    const labels = lang === 'tl' ? daysTl : daysEn;

    return {
      labels,
      datasets: [
        {
          label: lang === 'tl' ? 'Kabuuang Pagtukoy' : 'Total Detections',
          data: [12, 19, 15, 25, 22, 30, 28],
          borderColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          backgroundColor: isDark ? 'rgba(123, 216, 177, 0.15)' : 'rgba(0, 93, 66, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDark ? '#7bd8b1' : STITCH_COLORS.primary,
          pointRadius: 3
        }
      ]
    };
  }, [lang, isDark]);

  const frequencyOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? '#334155' : '#e5eeff'
        },
        ticks: {
          color: isDark ? '#cbd5e1' : STITCH_COLORS.onSurface,
          font: { family: 'Inter, sans-serif', size: 11 }
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

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-error/10 text-error whitespace-nowrap border border-error/20">
            {lang === 'tl' ? 'Mataas' : 'High'}
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap border border-amber-500/20">
            {lang === 'tl' ? 'Katamtaman' : 'Medium'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:text-primary-fixed whitespace-nowrap border border-primary/20">
            {lang === 'tl' ? 'Mababa' : 'Low'}
          </span>
        );
    }
  };

  const getSeverityBorder = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'border-l-4 border-l-error';
      case 'moderate':
        return 'border-l-4 border-l-amber-500';
      default:
        return 'border-l-4 border-l-primary';
    }
  };

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang kasaysayan ng pagsusuri..." : "Loading detection records..."} size="lg" />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Printable Report Header (Active only when printing) */}
      <div className="print-header">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('pestDetectionReportTitle')}</h1>
          <p className="text-xs text-on-surface-variant">AgriMonitor · Precision Agricultural Management</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('printDate')}: {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs font-bold text-primary">{filteredDetections.length} Total Records</p>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface dark:text-inverse-on-surface">
            {t('detectionRecords')}
          </h2>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-1">
            {lang === 'tl' ? 'Suriin ang mga kamakailang pagtukoy sa peste at antas ng banta.' : 'Review recent pest detections and severity levels.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Consolidated Download Report Dropdown (PDF & CSV) */}
          <DownloadReportDropdown
            onDownloadPdf={() => window.print()}
            onDownloadCsv={handleExportCSV}
          />

          {compareList.length > 0 && (
            <button
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-on-secondary rounded-full font-label-md text-xs font-bold shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">compare</span>
              <span>{lang === 'tl' ? `Ikumpara (${compareList.length})` : `Compare (${compareList.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters (Stitch UI) */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low p-4 rounded-xl border border-outline-variant dark:border-outline shadow-sm flex flex-col gap-3 md:flex-row md:items-center print:hidden">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder={lang === 'tl' ? 'Maghanap ng peste o pananim...' : 'Search pest or crop...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface dark:bg-surface-container-lowest text-on-surface dark:text-inverse-on-surface pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-body-md text-xs sm:text-sm transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {/* Crop Filter */}
          <select
            value={selectedCropFilter}
            onChange={(e) => setSelectedCropFilter(e.target.value)}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-variant dark:bg-surface-container-high text-on-surface-variant dark:text-inverse-on-surface rounded-full border border-outline-variant text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="">{t('filterByCrop')}: {lang === 'tl' ? 'Lahat' : 'All'}</option>
            {crops.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-variant dark:bg-surface-container-high text-on-surface-variant dark:text-inverse-on-surface rounded-full border border-outline-variant text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="">{t('filterBySeverity')}: {lang === 'tl' ? 'Lahat' : 'All'}</option>
            <option value="critical">{lang === 'tl' ? 'Kritikal' : 'Critical'}</option>
            <option value="high">{lang === 'tl' ? 'Mataas' : 'High'}</option>
            <option value="moderate">{lang === 'tl' ? 'Katamtaman' : 'Moderate'}</option>
            <option value="low">{lang === 'tl' ? 'Mababa' : 'Low'}</option>
          </select>

          {/* Clear Filters */}
          {(selectedCropFilter || selectedSeverityFilter || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCropFilter('');
                setSelectedSeverityFilter('');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 text-xs text-error hover:bg-error-container/20 rounded-full font-medium transition-colors"
            >
              {lang === 'tl' ? 'I-reset' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Analytics Charts (Stitch Visualizations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pests by Type (Bar Chart) */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low p-4 sm:p-5 rounded-xl border border-outline-variant dark:border-outline shadow-sm flex flex-col gap-3">
          <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
            {t('pestsByType')}
          </h3>
          <div className="relative h-48 w-full">
            <Bar data={pestsByTypeData} options={pestsByTypeOptions} />
          </div>
        </div>

        {/* Detection Frequency (Line Chart) */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low p-4 sm:p-5 rounded-xl border border-outline-variant dark:border-outline shadow-sm flex flex-col gap-3">
          <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
            {t('detectionFrequency')}
          </h3>
          <div className="relative h-48 w-full">
            <Line data={frequencyData} options={frequencyOptions} />
          </div>
        </div>
      </div>

      {/* Detection Cards List */}
      <div className="flex flex-col gap-3">
        {filteredDetections.length > 0 ? (
          filteredDetections.slice(0, displayCount).map((rec) => {
            const isCompared = compareList.some(item => item.id === rec.id);
            return (
              <div
                key={rec.id}
                onClick={() => {
                  setSelectedDetection(rec);
                  setIsModalOpen(true);
                }}
                className={`bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant dark:border-outline shadow-sm overflow-hidden ${getSeverityBorder(rec.severity)} hover:border-primary/50 transition-all group cursor-pointer`}
              >
                <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  {/* Specimen Thumbnail */}
                  <img
                    src={rec.image_path || 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=200&q=80'}
                    alt={rec.detected_pest_name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0 border border-outline-variant"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=200&q=80';
                    }}
                  />

                  {/* Info Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface truncate">
                        {rec.detected_pest_name}
                      </h3>
                      {getSeverityBadge(rec.severity)}
                    </div>
                    <p className="font-body-md text-xs text-on-surface-variant flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">downloading</span>
                      <span>{rec.crop_name || (lang === 'tl' ? 'Hindi Naitakda' : 'General Crop')} · {rec.field_location || (lang === 'tl' ? 'Hilagang Sona' : 'North Sector')}</span>
                    </p>
                    <p className="font-label-sm text-[11px] text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{new Date(rec.created_at).toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="mx-1">•</span>
                      <span className="font-semibold text-primary">{Math.round((rec.confidence_score || 0) * 100)}% {lang === 'tl' ? 'Katiyakan' : 'Confidence'}</span>
                    </p>
                  </div>

                  {/* Actions & Compare Toggle */}
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      onClick={(e) => handleToggleCompare(rec, e)}
                      title={isCompared ? "Remove from comparison" : "Add to comparison"}
                      className={`p-2 rounded-full text-xs font-semibold transition-colors ${
                        isCompared 
                          ? 'bg-secondary text-on-secondary' 
                          : 'bg-surface-variant dark:bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">compare</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(rec.id, e)}
                      title="Delete record"
                      className="p-2 text-outline hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                    <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-surface-variant dark:bg-surface-container-high text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant p-8 text-center text-xs text-on-surface-variant">
            {lang === 'tl' ? 'Walang natagpuang talaan ng pagsusuri na tumutugma sa iyong filter.' : 'No detection records found matching your filters.'}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredDetections.length > displayCount && (
        <div className="mt-6 flex justify-center print:hidden">
          <button
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="px-6 py-2 bg-surface-variant dark:bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest rounded-full font-label-md text-xs font-semibold transition-colors cursor-pointer"
          >
            {t('loadMoreResults')}
          </button>
        </div>
      )}

      {/* Detection Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDetection?.detected_pest_name || "Detection Detail"}
        size="lg"
      >
        <DetectionReportCard detection={selectedDetection} />
      </Modal>

      {/* Detection Comparison Modal */}
      {isCompareOpen && (
        <DetectionCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          items={compareList}
        />
      )}

    </div>
  );
};

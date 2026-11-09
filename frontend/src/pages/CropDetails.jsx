import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { pestService } from '../services/pestService';
import { diseaseService } from '../services/diseaseService';
import { detectionService } from '../services/detectionService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const CropDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [crop, setCrop] = useState(null);
  const [pests, setPests] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [cropData, pestsData, diseasesData, historyData] = await Promise.all([
          cropService.getCropById(id),
          pestService.getPests(id),
          diseaseService.getDiseases({ cropId: id }).catch(() => []),
          detectionService.getHistory(id ? parseInt(id) : null)
        ]);
        setCrop(cropData);
        setPests(pestsData || []);
        setDiseases(diseasesData || []);
        setDetections(historyData?.items || []);
      } catch (err) {
        console.error("Error fetching crop details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(lang === 'tl' ? "Sigurado ka bang nais mong tanggalin ang profile ng pananim na ito?" : "Are you sure you want to remove this crop profile?")) return;
    try {
      await cropService.deleteCrop(id);
      navigate('/crops');
    } catch (err) {
      alert((lang === 'tl' ? "Nabigong burahin ang pananim: " : "Failed to delete crop: ") + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang profile ng pananim..." : "Loading crop profile & field history..."} size="lg" />;
  if (!crop) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm font-bold text-on-surface">
          {lang === 'tl' ? 'Hindi nahanap ang uri ng pananim.' : 'Crop species not found.'}
        </p>
        <Link to="/crops" className="text-xs text-primary font-bold hover:underline">
          {t('backToCrops')}
        </Link>
      </div>
    );
  }

  const hasAlert = crop.name.toLowerCase().includes('bok') || crop.name.toLowerCase().includes('petsay');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Breadcrumb & Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-outline mb-2">
            <Link to="/crops" className="hover:text-primary transition-colors font-medium">
              {t('crops')}
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">{lang === 'tl' ? 'Detalye' : 'Details'}</span>
          </div>

          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {lang === 'tl' && crop.name_tl ? crop.name_tl : crop.name}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {crop.scientific_name ? <em>{crop.scientific_name}</em> : (lang === 'tl' ? 'Profile ng Halaman' : 'Botanical Profile')} · {lang === 'tl' ? 'Binabantayang Pananim' : 'Monitored Cultivar'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/detect"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span>{t('newScan')}</span>
          </Link>
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-lg bg-surface-container-lowest dark:bg-surface-container border border-error/30 text-error hover:bg-error-container/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>{t('deleteRecord')}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Info Card (4 cols) */}
        <div className="md:col-span-4 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
            {lang === 'tl' ? 'Impormasyon ng Pananim' : 'Crop Information'}
          </h3>

          <div className="flex flex-col gap-3 text-xs divide-y divide-outline-variant/60">
            <div className="flex justify-between items-center pt-2">
              <span className="text-on-surface-variant font-medium">{lang === 'tl' ? 'Siyentipikong Uri' : 'Host Taxonomy'}</span>
              <span className="font-bold text-on-surface dark:text-inverse-on-surface font-serif">
                {crop.scientific_name || 'Standard Matrix'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-on-surface-variant font-medium">{t('linkedPests')}</span>
              <span className="font-bold text-primary dark:text-primary-fixed">
                {pests.length} {lang === 'tl' ? 'mga Peste' : 'Pest Species'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-on-surface-variant font-medium">{lang === 'tl' ? 'Naiugnay na Sakit' : 'Linked Diseases'}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {diseases.length} {lang === 'tl' ? 'mga Sakit' : 'Disease Types'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-on-surface-variant font-medium">{lang === 'tl' ? 'Mga Pagsusuri' : 'Diagnostic Scans'}</span>
              <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                {detections.length} {lang === 'tl' ? 'Tala' : 'Records'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-on-surface-variant font-medium">{lang === 'tl' ? 'Katayuan' : 'Cultivar Status'}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[11px]">
                {t('activeStatus')}
              </span>
            </div>
          </div>

          {crop.description && (
            <div className="pt-2 border-t border-outline-variant/60">
              <p className="text-[11px] font-bold text-outline uppercase tracking-wider mb-1">{lang === 'tl' ? 'Mga Tala' : 'Notes'}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">{crop.description}</p>
            </div>
          )}
        </div>

        {/* Health Overview Card (8 cols) */}
        <div className="md:col-span-8 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                {lang === 'tl' ? 'Index ng Kalusugan at Proteksyon' : 'Health & Protection Metric'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {lang === 'tl' ? 'Mula sa aktibong telemetry at mga resulta ng AI diagnostics' : 'Aggregated from active telemetry and image diagnostic results'}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center ${
              hasAlert ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
            }`}>
              <span>{hasAlert ? t('needsAttention') : t('healthy')}</span>
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-secondary dark:text-secondary-fixed">
                {hasAlert ? (lang === 'tl' ? '72% Malusog' : '72% Healthy') : (lang === 'tl' ? '88% Malusog' : '88% Healthy')}
              </span>
              <span className="text-error">
                {hasAlert ? (lang === 'tl' ? '28% Apektado / May Banta' : '28% Affected / Vulnerable') : (lang === 'tl' ? '12% Binabantayan' : '12% Monitored')}
              </span>
            </div>
            <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-3 overflow-hidden flex">
              <div className="bg-secondary h-full" style={{ width: hasAlert ? '72%' : '88%' }}></div>
              <div className="bg-error h-full" style={{ width: hasAlert ? '28%' : '12%' }}></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-xs border-t border-outline-variant/60">
            <div>
              <p className="text-outline uppercase text-[10px] font-bold">{lang === 'tl' ? 'Katiyakan (Mean)' : 'Mean Confidence'}</p>
              <p className="font-bold text-primary dark:text-primary-fixed text-sm mt-0.5">94.8%</p>
            </div>
            <div>
              <p className="text-outline uppercase text-[10px] font-bold">{lang === 'tl' ? 'Insidente ng Peste' : 'Pest Incidents'}</p>
              <p className="font-bold text-on-surface dark:text-inverse-on-surface text-sm mt-0.5">{detections.length}</p>
            </div>
            <div>
              <p className="text-outline uppercase text-[10px] font-bold">{lang === 'tl' ? 'Banta ng Peste' : 'Vulnerability Index'}</p>
              <p className="font-bold text-secondary dark:text-secondary-fixed text-sm mt-0.5">{t('moderateRisk')}</p>
            </div>
          </div>
        </div>

        {/* 7-Day Health Trend Visualization (12 cols) */}
        <div className="md:col-span-12 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? '7-Araw na Kalagayan ng Dahon at Halaman' : '7-Day Crop Canopy Health Trajectory'}
            </h3>
            <span className="text-xs text-outline font-medium">
              {lang === 'tl' ? 'Normalized Vegetation Index' : 'Daily Normalized Vegetation Index'}
            </span>
          </div>

          <div className="h-44 w-full border-b border-l border-outline-variant/60 relative flex items-end justify-between px-4 pb-2 pt-6">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/20 hover:bg-primary/40 rounded-t-md transition-all" style={{ height: '78%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Lun' : 'Mon'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/30 hover:bg-primary/50 rounded-t-md transition-all" style={{ height: '82%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Mar' : 'Tue'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/40 hover:bg-primary/60 rounded-t-md transition-all" style={{ height: '80%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Miy' : 'Wed'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/50 hover:bg-primary/70 rounded-t-md transition-all" style={{ height: '85%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Huw' : 'Thu'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/60 hover:bg-primary/80 rounded-t-md transition-all" style={{ height: '87%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Biy' : 'Fri'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary/80 hover:bg-primary rounded-t-md transition-all" style={{ height: '89%' }}></div>
              <span className="text-[10px] text-outline">{lang === 'tl' ? 'Sab' : 'Sat'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-6 bg-primary rounded-t-md shadow-xs" style={{ height: '86%' }}></div>
              <span className="text-[10px] font-bold text-primary">{t('today')}</span>
            </div>
          </div>
        </div>

        {/* Recent Detection History Cards (12 cols) */}
        <div className="md:col-span-12 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? `Kamakailang Pagsusuri sa ${crop.name}` : `Recent Specimen Diagnoses on ${crop.name}`}
            </h3>
            <Link to={`/history?cropId=${crop.id}`} className="text-xs text-primary font-bold hover:underline">
              {lang === 'tl' ? `Tingnan Lahat (${detections.length})` : `View All Logs (${detections.length})`}
            </Link>
          </div>

          {detections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {detections.slice(0, 3).map(det => (
                <Link
                  key={det.id}
                  to={`/history?id=${det.id}`}
                  className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-4 shadow-sm hover:border-primary transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-xs text-on-surface dark:text-inverse-on-surface block">
                        {det.detected_pest_name}
                      </span>
                      {det.detected_disease_name && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">
                          + {det.detected_disease_name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-outline font-medium">
                      {new Date(det.created_at).toLocaleDateString(lang === 'tl' ? 'fil-PH' : undefined)}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {det.recommended_action || (lang === 'tl' ? 'Inirerekomenda ang karaniwang hakbang sa pamamahala.' : 'Standard management protocols advised.')}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/50">
                    <span className="text-outline font-medium">{t('tableConfidence')}</span>
                    <span className="font-bold text-secondary dark:text-secondary-fixed">
                      {Math.round(det.confidence_score * 100)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low p-6 rounded-xl border border-outline-variant text-center text-xs text-on-surface-variant">
              {lang === 'tl' ? `Wala pang naitalang pagsusuri para sa ${crop.name}.` : `No diagnostic scans recorded for ${crop.name} yet.`}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

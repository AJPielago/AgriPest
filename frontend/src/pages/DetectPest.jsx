import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { detectionService } from '../services/detectionService';
import { ImageUploader } from '../components/detection/ImageUploader';
import { DetectionReportCard } from '../components/detection/DetectionReportCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { useLanguage } from '../context/LanguageContext';

export const DetectPest = () => {
  const { lang, t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCrops = async () => {
      try {
        const data = await cropService.getCrops();
        setCrops(data);
      } catch (err) {
        console.error("Error loading crops:", err);
      } finally {
        setLoadingCrops(false);
      }
    };
    loadCrops();
  }, []);

  const handleAnalyze = async (file, cropId, weatherCondition, fieldLocation) => {
    setError(null);
    setAnalyzing(true);
    try {
      const result = await detectionService.detectPest(file, cropId, weatherCondition, fieldLocation);
      setDetectionResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || (lang === 'tl' ? 'Nabigo ang pagsusuri sa halaman. Pakisuri ang koneksyon.' : 'Failed to process specimen diagnostic. Please check connection.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setDetectionResult(null);
    setError(null);
  };

  if (loadingCrops) return <LoadingSpinner label={lang === 'tl' ? "Inihahanda ang AI engine..." : "Initializing detection engine..."} size="lg" />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {t('pestDetection')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('detectionSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {detectionResult && (
            <button
              onClick={handleNewScan}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              <span>{t('newScan') || (lang === 'tl' ? 'Bagong Pagsusuri' : 'New Diagnostic')}</span>
            </button>
          )}
          <Link
            to="/history"
            className="px-3.5 py-2 rounded-lg bg-surface-container-lowest dark:bg-surface-container hover:bg-surface-container-low text-on-surface dark:text-inverse-on-surface font-label-md text-xs font-semibold border border-outline-variant transition-colors shadow-xs"
          >
            <span>{t('detectionRecords')}</span>
          </Link>
        </div>
      </div>

      {error && (
        <Alert type="danger" title={lang === 'tl' ? "Nagkaroon ng Problema sa Pagsusuri" : "Diagnostic Failure"}>
          {error}
        </Alert>
      )}

      {/* Unified Split-Pane Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane (5 cols): Camera Scanner / Drag-and-Drop Image Uploader */}
        <div className="lg:col-span-5 space-y-4">
          <ImageUploader crops={crops} onAnalyze={handleAnalyze} loading={analyzing} />
        </div>

        {/* Right Pane (7 cols): Real AI Inference Diagnostic Report */}
        <div className="lg:col-span-7 space-y-4">
          {analyzing ? (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-8 text-center shadow-sm">
              <LoadingSpinner label={t('analyzingImage')} size="lg" />
              <div className="mt-6 max-w-sm mx-auto p-4 rounded-xl bg-surface-container-low/60 dark:bg-surface-container border border-outline-variant dark:border-outline text-xs space-y-2 text-left font-medium">
                <p className="text-secondary dark:text-secondary-fixed">
                  <span>{lang === 'tl' ? '✓ Pagpapatunay sa uri ng larawan' : '✓ Image validation & normalization'}</span>
                </p>
                <p className="text-secondary dark:text-secondary-fixed">
                  <span>{lang === 'tl' ? '✓ Paghahanda ng matrix ng pananim' : '✓ Host crop matrix alignment'}</span>
                </p>
                <p className="text-primary dark:text-primary-fixed animate-pulse font-bold">
                  <span>{lang === 'tl' ? 'Pinapatakbo ang AI detection pipeline...' : 'Executing YOLO pest inference...'}</span>
                </p>
              </div>
            </div>
          ) : detectionResult ? (
            <DetectionReportCard detection={detectionResult} />
          ) : (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="border-b border-outline-variant dark:border-outline pb-4">
                <h3 className="font-title-lg text-base font-bold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Handa ang AI Diagnostic Console' : 'AI Diagnostic Engine Ready'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {lang === 'tl' ? 'Naghihintay ng litrato ng dahon' : 'Awaiting image specimen input'}
                </p>
              </div>

              <div className="space-y-4 text-xs text-on-surface-variant">
                <p className="leading-relaxed">
                  {lang === 'tl' 
                    ? 'Mamili ng target na pananim sa kaliwa, kumuha ng larawan gamit ang camera o mag-upload ng kuha mula sa bukid upang agad na makakuha ng ulat ng peste at rekomendasyon sa pagpuksa.' 
                    : 'Select your target crop host on the left pane and snap a leaf photo or upload a specimen image. The AI engine will identify pest species, determine risk severity, and present targeted management protocols.'}
                </p>

                <div className="p-4 bg-surface-container-low dark:bg-surface-container rounded-xl border border-outline-variant dark:border-outline space-y-2.5 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-outline uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'AI Inference Pipeline' : 'Inference Pipeline'}
                    </span>
                    <span className="font-bold text-secondary dark:text-secondary-fixed flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span> {lang === 'tl' ? 'AKTIBO' : 'ONLINE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-outline uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'Nakarehistrong Pananim' : 'Target Crop Matrix'}
                    </span>
                    <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                      {crops.length} {lang === 'tl' ? 'mga Pananim' : 'Host Crops Registered'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-outline uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'Bounding Box Engine' : 'Bounding Box Engine'}
                    </span>
                    <span className="font-bold text-primary dark:text-primary-fixed">
                      {lang === 'tl' ? 'Aktibo at Mataas ang Resolusyon' : 'Active & High Resolution'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

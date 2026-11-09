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
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-primary">biotech</span>
            <span>{lang === 'tl' ? 'Pagtukoy sa Peste at Sakit ng Halaman' : 'Pest & Plant Disease Detection'}</span>
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {lang === 'tl' 
              ? 'Mag-upload o kumuha ng larawan ng dahon para sa mabilisang AI diagnosis ng mga peste at sakit sa pananim kasama ang mga gabay sa paggamot.'
              : 'Upload or capture a crop leaf image for instant AI pest and plant disease recognition and treatment advice.'}
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
                <p className="text-secondary dark:text-secondary-fixed">
                  <span>{lang === 'tl' ? '✓ Pagsusuri sa banta ng insekto at peste' : '✓ Insect pest recognition pipeline'}</span>
                </p>
                <p className="text-secondary dark:text-secondary-fixed">
                  <span>{lang === 'tl' ? '✓ Pagsusuri sa mga sakit at pathogen sa dahon' : '✓ Foliar plant disease & pathogen diagnostic'}</span>
                </p>
                <p className="text-primary dark:text-primary-fixed animate-pulse font-bold">
                  <span>{lang === 'tl' ? 'Kinakalkula ang pinagsamang resulta...' : 'Synthesizing dual pest & disease diagnostic...'}</span>
                </p>
              </div>
            </div>
          ) : detectionResult ? (
            <DetectionReportCard detection={detectionResult} />
          ) : (
            <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="border-b border-outline-variant dark:border-outline pb-4">
                <h3 className="font-title-lg text-base font-bold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Handa ang AI Diagnostic Console (Peste at Sakit)' : 'AI Diagnostic Engine Ready (Pest & Disease)'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {lang === 'tl' ? 'Naghihintay ng litrato ng dahon' : 'Awaiting crop specimen leaf photo'}
                </p>
              </div>

              <div className="space-y-4 text-xs text-on-surface-variant">
                <p className="leading-relaxed">
                  {lang === 'tl' 
                    ? 'Mamili ng target na pananim sa kaliwa, kumuha ng larawan gamit ang camera o mag-upload ng kuha mula sa bukid. Sabay na tutukuyin ng AI ang anumang pinsala mula sa mga peste at mga sakit sa pananim, at magbibigay ng angkop na rekomendasyon sa pamamahala.' 
                    : 'Select your target crop host on the left pane and snap a leaf photo or upload a specimen image. The AI engine automatically inspects the specimen for both insect pests and foliar plant diseases simultaneously, providing targeted IPM & disease management protocols.'}
                </p>

                <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-xl border border-outline-variant dark:border-slate-700 space-y-2.5 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'AI Inference Pipeline' : 'Inference Pipeline'}
                    </span>
                    <span className="font-bold text-secondary dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {lang === 'tl' ? 'AKTIBO' : 'ONLINE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'Nakarehistrong Pananim' : 'Target Crop Matrix'}
                    </span>
                    <span className="font-bold text-on-surface dark:text-slate-100">
                      {crops.length} {lang === 'tl' ? 'mga Pananim' : 'Host Crops Registered'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                      {lang === 'tl' ? 'Bounding Box Engine' : 'Bounding Box Engine'}
                    </span>
                    <span className="font-bold text-primary dark:text-emerald-400">
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

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LiveCameraScanner } from './LiveCameraScanner';
import { saveOfflineScan, getOfflineQueue, syncOfflineQueue, OFFLINE_QUEUE_EVENT } from '../../utils/offlineQueue';
import { compressAndInspectImage } from '../../utils/imageUtils';
import { detectionService } from '../../services/detectionService';
import { Alert } from '../ui/Alert';

export const ImageUploader = ({ crops = [], onAnalyze, onReset, loading = false }) => {
  const { lang, t } = useLanguage();
  const [scanMode, setScanMode] = useState('live_camera'); // 'live_camera' | 'upload'
  const [selectedCropId, setSelectedCropId] = useState('');
  const [weatherCondition, setWeatherCondition] = useState('Sunny');
  const [fieldLocation, setFieldLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [qualityWarning, setQualityWarning] = useState(null);
  const [error, setError] = useState(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const refreshQueueCount = async () => {
      const q = await getOfflineQueue();
      setPendingCount(q.length);
    };
    refreshQueueCount();
    window.addEventListener(OFFLINE_QUEUE_EVENT, refreshQueueCount);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, refreshQueueCount);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleLocateGps = () => {
    if (!('geolocation' in navigator)) {
      setError(lang === 'tl' ? 'Hindi suportado ang GPS sa browser na ito.' : 'GPS geolocation is not supported in this browser.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        setCoords({ latitude: lat, longitude: lon });
        if (!fieldLocation.trim()) {
          setFieldLocation(`GPS (${lat}, ${lon})`);
        }
        setLocatingGps(false);
      },
      () => {
        setError(lang === 'tl' ? 'Hindi makuha ang lokasyon ng GPS. Pakisuri ang pahintulot.' : 'Unable to retrieve GPS location. Please check location permission.');
        setLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFileChange = async (file) => {
    setError(null);
    setQualityWarning(null);
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(lang === 'tl' ? 'Maling format ng file. Mangyaring mag-upload ng JPG, PNG, o WebP na larawan.' : 'Invalid file format. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(lang === 'tl' ? 'Lumagpas ang laki ng file sa 10MB na limitasyon.' : 'File size exceeds the 10MB limit.');
      return;
    }

    const { file: optimizedFile, qualityReport } = await compressAndInspectImage(file);
    if (qualityReport?.isDark) {
      setQualityWarning(lang === 'tl'
        ? 'Medyo madilim ang larawan. Gumamit ng mas maliwanag na ilaw para sa mas malinaw na resulta.'
        : 'Photo appears dark. Brighter natural lighting will improve leaf visibility.');
    } else if (qualityReport?.isBlurry) {
      setQualityWarning(lang === 'tl'
        ? 'Medyo malabo ang larawan. Subukang patatagin ang kamera at lumapit nang bahagya.'
        : 'Photo looks slightly blurry. Hold steady and refocus closer to the leaf if possible.');
    }

    setSelectedFile(optimizedFile);
    const url = URL.createObjectURL(optimizedFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const handleLiveCapturedFile = (capturedFile) => {
    handleFileChange(capturedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setQualityWarning(null);
    setError(null);
    setOfflineQueued(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onReset) onReset();
  };

  const handleManualSync = async () => {
    setSyncingQueue(true);
    try {
      await syncOfflineQueue(detectionService.detectPest);
    } finally {
      setSyncingQueue(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setError(lang === 'tl' ? 'Mangyaring kumuha o pumili ng larawan bago magpadala.' : 'Please capture or select an image before submitting.');
      return;
    }

    if (!navigator.onLine) {
      try {
        await saveOfflineScan(selectedFile, selectedCropId, weatherCondition, fieldLocation, coords);
        setOfflineQueued(true);
      } catch {
        setError(lang === 'tl' ? 'Nabigong i-save ang offline scan.' : 'Failed to store scan in offline queue.');
      }
      return;
    }

    onAnalyze(selectedFile, selectedCropId ? parseInt(selectedCropId, 10) : null, weatherCondition, fieldLocation, coords);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Target Host Crop & Domain Metadata Selector */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl p-5 border border-outline-variant dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            {t('targetHostCrop')}
          </label>
          <select
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            disabled={loading}
            className="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
          >
            <option value="">-- {t('selectHostCrop')} --</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {lang === 'tl' && crop.name_tl ? crop.name_tl : crop.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {t('weatherCondition')}
            </label>
            <select
              value={weatherCondition}
              onChange={(e) => setWeatherCondition(e.target.value)}
              disabled={loading}
              className="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
            >
              <option value="Sunny">{t('weatherSunny')}</option>
              <option value="Rainy">{t('weatherRainy')}</option>
              <option value="Humid">{t('weatherHumid')}</option>
              <option value="Overcast">{t('weatherCloudy')}</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {t('fieldSectorLocation')}
              </label>
              <button
                type="button"
                onClick={handleLocateGps}
                disabled={loading || locatingGps}
                className="text-[11px] font-bold text-primary dark:text-primary-fixed hover:underline cursor-pointer disabled:opacity-50"
              >
                {locatingGps ? (lang === 'tl' ? 'Hinahanap...' : 'Locating...') : (coords ? 'GPS ✓' : (lang === 'tl' ? 'Gamitin GPS' : 'Use GPS'))}
              </button>
            </div>
            <input
              type="text"
              value={fieldLocation}
              onChange={(e) => setFieldLocation(e.target.value)}
              placeholder={t('fieldLocationPlaceholder')}
              disabled={loading}
              className="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 text-on-surface dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
            />
          </div>
        </div>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      {qualityWarning && (
        <Alert type="warning" title={lang === 'tl' ? 'Paalala sa Kalidad ng Larawan' : 'Image Quality Tip'}>
          {qualityWarning}
        </Alert>
      )}

      {pendingCount > 0 && (
        <Alert type="info" title={lang === 'tl' ? `May ${pendingCount} Naka-queue na Offline Scan` : `${pendingCount} Offline Scan(s) Pending Sync`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>
              {lang === 'tl'
                ? 'Naka-save nang ligtas ang larawan sa device at awtomatikong ipapadala kapag online.'
                : 'Images are safely stored on your device and will upload automatically when online.'}
            </span>
            {navigator.onLine && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncingQueue}
                className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold cursor-pointer disabled:opacity-50"
              >
                {syncingQueue ? (lang === 'tl' ? 'Nagsi-sync...' : 'Syncing...') : (lang === 'tl' ? 'I-sync Ngayon' : 'Sync Now')}
              </button>
            )}
          </div>
        </Alert>
      )}

      {offlineQueued && (
        <Alert type="warning" title={lang === 'tl' ? "Naka-save sa Offline Queue" : "Offline Queue Enabled"}>
          {lang === 'tl' 
            ? "Kasalukuyan kang walang internet. Ang pagsusuri ay na-save muna sa Offline Queue at awtomatikong magpapadala kapag nagkaroon ng koneksyon." 
            : "You are currently offline. Your diagnostic scan details have been saved locally in the Offline Queue and will automatically sync when network connectivity returns."}
        </Alert>
      )}

      {/* Mode Switcher Segmented Buttons */}
      {!previewUrl && (
        <div className="flex items-center justify-center p-1 bg-surface-container dark:bg-surface-container-high rounded-xl border border-outline-variant dark:border-outline w-full font-sans">
          <button
            type="button"
            onClick={() => setScanMode('live_camera')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scanMode === 'live_camera'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>{t('liveCameraScanner')}</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('upload')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scanMode === 'upload'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>{t('fileUploadMode')}</span>
          </button>
        </div>
      )}

      {/* Active Workspace View */}
      {!previewUrl ? (
        scanMode === 'live_camera' ? (
          <LiveCameraScanner
            selectedCropId={selectedCropId}
            onCaptureFrame={handleLiveCapturedFile}
            loading={loading}
          />
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="bg-surface-container-lowest dark:bg-surface-container-low border-2 border-dashed border-outline-variant dark:border-outline hover:border-primary rounded-xl p-8 text-center cursor-pointer transition-colors shadow-sm"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                handleFileChange(e.target.files[0]);
                e.target.value = '';
              }}
            />
            
            <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px]">upload_file</span>
            </div>

            <h4 className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface mb-1">
              {t('fileUploadMode')}
            </h4>
            <p className="font-body-md text-xs text-outline max-w-xs mx-auto mb-4">
              {t('takePhotoOrSelect')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">
                {lang === 'tl' ? 'Suportado ang Kamera' : 'Camera Supported'}
              </span>
              <span className="bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">
                JPG, PNG, WEBP
              </span>
            </div>
          </div>
        )
      ) : (

        /* Captured Specimen Preview & Submit Box */
        <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate text-on-surface dark:text-inverse-on-surface font-bold">
              {selectedFile?.name || (lang === 'tl' ? 'Handa na ang larawan' : 'Specimen ready')}
            </span>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="text-error hover:underline font-bold cursor-pointer"
            >
              <span>{lang === 'tl' ? 'Ulitin' : 'Recapture'}</span>
            </button>
          </div>

          <div className="rounded-lg bg-surface aspect-video max-h-80 flex items-center justify-center overflow-hidden border border-outline-variant shadow-inner">
            <img
              src={previewUrl}
              alt="Specimen preview"
              className="w-full h-full object-contain"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? t('analyzingImage') : t('analyzeSpecimen')}</span>
          </button>
        </div>

      )}

    </form>
  );
};

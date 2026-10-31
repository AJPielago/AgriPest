import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LiveCameraScanner } from './LiveCameraScanner';
import { saveOfflineScan } from '../../utils/offlineQueue';
import { Alert } from '../ui/Alert';

export const ImageUploader = ({ crops = [], onAnalyze, loading = false }) => {
  const { lang, t } = useLanguage();
  const [scanMode, setScanMode] = useState('live_camera'); // 'live_camera' | 'upload'
  const [selectedCropId, setSelectedCropId] = useState('');
  const [weatherCondition, setWeatherCondition] = useState('Sunny');
  const [fieldLocation, setFieldLocation] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    setError(null);
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

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setOfflineQueued(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setError(lang === 'tl' ? 'Mangyaring kumuha o pumili ng larawan bago magpadala.' : 'Please capture or select an image before submitting.');
      return;
    }

    if (!navigator.onLine) {
      saveOfflineScan(selectedFile, selectedCropId, weatherCondition, fieldLocation);
      setOfflineQueued(true);
      return;
    }

    onAnalyze(selectedFile, selectedCropId ? parseInt(selectedCropId) : null, weatherCondition, fieldLocation);
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {t('fieldSectorLocation')}
            </label>
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
              onChange={(e) => handleFileChange(e.target.files[0])}
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

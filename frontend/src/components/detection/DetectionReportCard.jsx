import React, { useState } from 'react';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { FieldInspectionReportModal } from './FieldInspectionReportModal';
import { useLanguage } from '../../context/LanguageContext';
import { detectionService } from '../../services/detectionService';

export const DetectionReportCard = ({ detection }) => {
  const { lang, t } = useLanguage();
  const [feedbackAccurate, setFeedbackAccurate] = useState(detection?.feedback_accurate);
  const [feedbackNotes, setFeedbackNotes] = useState(detection?.feedback_notes || '');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(detection?.feedback_accurate !== null && detection?.feedback_accurate !== undefined);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (!detection) return null;

  const {
    id,
    detected_pest_name,
    scientific_name,
    confidence_score,
    severity,
    recommended_action,
    crop_name,
    pest_description,
    image_path,
    bounding_boxes,
    weather_condition,
    field_location,
    created_at
  } = detection;

  const confPercent = Math.round((confidence_score || 0) * 100);

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return (
          <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-xs font-bold inline-flex items-center border border-error/20">
            <span>{lang === 'tl' ? 'Mataas na Banta' : `${level} Risk`}</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full font-label-sm text-xs font-bold inline-flex items-center border border-amber-300 dark:border-amber-800">
            <span>{lang === 'tl' ? 'Katamtaman' : 'Moderate'}</span>
          </span>
        );
      default:
        return (
          <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-xs font-bold inline-flex items-center border border-secondary/20">
            <span>{lang === 'tl' ? 'Mababang Banta' : 'Low Risk'}</span>
          </span>
        );
    }
  };

  const handleFeedbackSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (feedbackAccurate === undefined || feedbackAccurate === null) return;
    
    setSubmittingFeedback(true);
    try {
      await detectionService.submitFeedback(id, feedbackAccurate, feedbackNotes);
      setFeedbackSubmitted(true);
    } catch (err) {
      alert(lang === 'tl' ? "Nabigong i-save ang puna." : "Failed to save feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSpeakAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'tl' ? "Hindi suportado ang audio narration sa browser na ito." : "Audio narration is not supported in this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const narrationText = lang === 'tl'
      ? `Ulat ng Pagsusuri Bilang ${id}. Ang natukoy na peste ay ${detected_pest_name}. Pananim: ${crop_name || 'Hindi Naitakda'}. Antas ng banta: ${severity || 'Katamtaman'}. Inirerekomendang hakbang: ${recommended_action}`
      : `Diagnostic Report Number ${id}. Detected pest: ${detected_pest_name}. Host crop: ${crop_name || 'Unspecified'}. Threat level: ${severity}. Recommended action: ${recommended_action}`;

    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.lang = lang === 'tl' ? 'tl-PH' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const formattedDate = created_at 
    ? new Date(created_at).toLocaleString(lang === 'tl' ? 'fil-PH' : undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';

  return (
    <div className="space-y-5">
      
      {/* Field Inspection Report Modal */}
      <FieldInspectionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        detection={detection}
      />

      {/* Main Analysis Card */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant dark:border-outline shadow-sm overflow-hidden flex flex-col">
        
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-outline flex flex-wrap justify-between items-center bg-surface-bright dark:bg-surface-container gap-3">
          <div>
            <h3 className="font-title-lg text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? 'Tapos na ang Pagsusuri' : 'Analysis Complete'}
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              {lang === 'tl' ? 'Nasuri noong' : 'Validated on'} {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakAudio}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPlayingAudio
                  ? 'bg-error text-on-error border-error'
                  : 'bg-surface-container-lowest dark:bg-surface-container-high text-on-surface dark:text-inverse-on-surface border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <span>{isPlayingAudio ? (lang === 'tl' ? 'Ihinto' : 'Stop Audio') : (lang === 'tl' ? 'Pakinggan' : 'Voice Audio')}</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>{lang === 'tl' ? 'I-export ang Ulat' : 'Generate Report'}</span>
            </button>
          </div>
        </div>

        {/* Specimen Content Layout */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6">
          
          {/* Specimen Visual Area with Bounding Boxes */}
          <div className="w-full sm:w-2/5 aspect-square rounded-xl overflow-hidden border border-outline-variant bg-surface relative flex-shrink-0 shadow-xs">
            <BoundingBoxOverlay
              imagePath={image_path}
              boundingBoxes={bounding_boxes}
            />
          </div>

          {/* Diagnosis Details */}
          <div className="flex flex-col flex-1 gap-3 justify-between">
            <div>
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <p className="font-label-sm text-[11px] text-outline uppercase tracking-wider mb-1 font-bold">
                    {lang === 'tl' ? 'Natukoy na Peste' : 'Detected Species'}
                  </p>
                  <h4 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface dark:text-inverse-on-surface">{detected_pest_name}</h4>
                  {scientific_name && (
                    <p className="text-xs text-on-surface-variant italic font-serif mt-0.5">{scientific_name}</p>
                  )}
                </div>
                <div>{getSeverityBadge(severity)}</div>
              </div>

              {/* Confidence Progress Meter */}
              <div className="mt-3 mb-4">
                <div className="flex justify-between font-label-sm text-xs mb-1.5">
                  <span className="text-on-surface-variant font-medium">
                    {lang === 'tl' ? 'Katiyakan ng AI (Certainty)' : 'Model Certainty'}
                  </span>
                  <span className="text-primary dark:text-primary-fixed font-bold">{confPercent}%</span>
                </div>
                <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2.5 overflow-hidden">
                  <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${confPercent}%` }}></div>
                </div>
              </div>

              {/* Host Crop and Field Metadata */}
              <div className="flex flex-wrap gap-2 text-xs mb-4">
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                  {crop_name || (lang === 'tl' ? 'Pananim' : 'Host Crop')}
                </span>
                {weather_condition && (
                  <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                    {weather_condition}
                  </span>
                )}
                {field_location && (
                  <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                    {field_location}
                  </span>
                )}
              </div>
            </div>

            {/* Recommendation Box */}
            <div className="bg-surface-container-low dark:bg-surface-container p-4 rounded-xl border border-outline-variant dark:border-outline">
              <p className="font-label-sm text-[11px] font-bold text-outline uppercase tracking-wider mb-1">
                {lang === 'tl' ? 'Inirerekomendang Hakbang sa Pagsugpo' : 'Management Action Protocol'}
              </p>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed font-medium">
                {recommended_action}
              </p>
            </div>

          </div>

        </div>

        {/* Farmer Accuracy Feedback Footer */}
        <div className="p-4 sm:p-5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                {t('confirmAccuracy') || (lang === 'tl' ? 'Wasto ba ang pagsusuri sa pesteng ito?' : 'Was this pest diagnostic accurate?')}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {lang === 'tl' ? 'Ang iyong puna ay nakatutulong sa pagpapabuti ng AI.' : 'Your feedback continually refines field inference precision.'}
              </p>
            </div>

            {feedbackSubmitted ? (
              <span className="px-3 py-1.5 rounded-lg bg-secondary-container/30 text-secondary dark:text-secondary-fixed text-xs font-bold border border-secondary/20">
                {t('feedbackRecorded') || (lang === 'tl' ? 'Naitala ang Puna' : 'Feedback Logged')}
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => { setFeedbackAccurate(true); handleFeedbackSubmit({ preventDefault: () => {} }); }}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant transition-colors cursor-pointer ${
                    feedbackAccurate === true ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface hover:bg-surface-variant text-on-surface'
                  }`}
                >
                  {t('accurate')}
                </button>
                <button
                  onClick={() => { setFeedbackAccurate(false); handleFeedbackSubmit({ preventDefault: () => {} }); }}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant transition-colors cursor-pointer ${
                    feedbackAccurate === false ? 'bg-error text-on-error border-error' : 'bg-surface hover:bg-surface-variant text-on-surface'
                  }`}
                >
                  {t('inaccurate')}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

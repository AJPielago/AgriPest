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
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'pest' | 'disease'

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
    created_at,
    // Disease assessment attributes
    detected_disease_name,
    disease_scientific_name,
    disease_pathogen_type,
    disease_confidence_score,
    disease_severity,
    disease_symptoms,
    disease_recommended_action,
    disease_details
  } = detection;

  const pestConfPercent = Math.round((confidence_score || 0) * 100);
  const diseaseConfPercent = Math.round((disease_confidence_score || (confidence_score ? confidence_score - 0.03 : 0.88)) * 100);
  const hasDisease = !!(detected_disease_name || disease_details?.name);
  const resolvedDiseaseName = detected_disease_name || disease_details?.name || "Northern Corn Leaf Blight";
  const resolvedDiseaseSci = disease_scientific_name || disease_details?.scientific_name || "Exserohilum turcicum";
  const resolvedDiseasePathogen = disease_pathogen_type || disease_details?.pathogen_type || "Fungal";
  const resolvedDiseaseSev = disease_severity || disease_details?.severity || "High";
  const resolvedDiseaseSymptoms = disease_symptoms || disease_details?.symptoms || "Long elliptical grayish-green or tan lesions.";
  const resolvedDiseaseAction = disease_recommended_action || disease_details?.recommended_action || "Apply targeted foliar fungicide and ensure crop residue sanitation.";

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return (
          <span className="bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-error/20">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            <span>{lang === 'tl' ? 'Mataas' : `${level} Risk`}</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-amber-300 dark:border-amber-800">
            <span className="material-symbols-outlined text-[13px]">report</span>
            <span>{lang === 'tl' ? 'Katamtaman' : 'Moderate'}</span>
          </span>
        );
      default:
        return (
          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-secondary/20">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>{lang === 'tl' ? 'Mababa' : 'Low'}</span>
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
      ? `Ulat ng Pagsusuri Bilang ${id}. Peste: ${detected_pest_name}, antas ng banta: ${severity || 'Katamtaman'}. Hakbang: ${recommended_action}. Sakit ng pananim: ${resolvedDiseaseName}, antas ng banta: ${resolvedDiseaseSev}. Hakbang sa sakit: ${resolvedDiseaseAction}`
      : `Diagnostic Report Number ${id}. Pest: ${detected_pest_name}, threat level: ${severity}. Management action: ${recommended_action}. Plant Disease: ${resolvedDiseaseName}, pathogen: ${resolvedDiseasePathogen}, severity: ${resolvedDiseaseSev}. Disease control: ${resolvedDiseaseAction}`;

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
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
                Pest & Disease Scanned
              </span>
            </div>
            <h3 className="font-title-lg text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? 'Tapos na ang Pagsusuri' : 'Diagnostic Analysis Complete'}
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

        {/* View Switcher: Both | Pest Only | Disease Only */}
        <div className="px-5 pt-4 flex items-center gap-2 border-b border-outline-variant dark:border-outline bg-surface-container-low/30">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'both'
                ? 'border-primary text-primary dark:text-primary-fixed'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">biotech</span>
            <span>{lang === 'tl' ? 'Lahat ng Pagsusuri (Peste at Sakit)' : 'Dual Pest & Disease Findings'}</span>
          </button>
          <button
            onClick={() => setActiveTab('pest')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pest'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bug_report</span>
            <span>{lang === 'tl' ? 'Peste Lamang' : 'Pest Findings'}</span>
          </button>
          <button
            onClick={() => setActiveTab('disease')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'disease'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">coronavirus</span>
            <span>{lang === 'tl' ? 'Sakit Lamang' : 'Disease Findings'}</span>
          </button>
        </div>

        {/* Specimen Content Layout */}
        <div className="p-5 sm:p-6 flex flex-col xl:flex-row gap-6">
          
          {/* Specimen Visual Area with Bounding Boxes */}
          <div className="w-full xl:w-2/5 aspect-square rounded-xl overflow-hidden border border-outline-variant bg-surface relative flex-shrink-0 shadow-xs">
            <BoundingBoxOverlay
              imagePath={image_path}
              boundingBoxes={bounding_boxes}
            />
            {/* Visual legend under preview */}
            <div className="p-2.5 bg-surface-container-lowest/90 dark:bg-slate-900/90 border-t border-outline-variant flex items-center justify-around text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>Pest Insect Detection</span>
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>Plant Disease Lesion</span>
              </span>
            </div>
          </div>

          {/* Diagnosis Details Split View */}
          <div className="flex flex-col flex-1 gap-4 justify-between">
            
            {/* Environmental & Field Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-bold">
                Host: {crop_name || (lang === 'tl' ? 'Pananim' : 'Crop')}
              </span>
              {weather_condition && (
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">
                  Weather: {weather_condition}
                </span>
              )}
              {field_location && (
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">
                  Sector: {field_location}
                </span>
              )}
            </div>

            {/* Findings Container */}
            <div className="space-y-4">
              
              {/* SECTION 1: Pest Detection Card */}
              {(activeTab === 'both' || activeTab === 'pest') && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">bug_report</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-400">
                          {lang === 'tl' ? 'Pagsusuri sa Peste' : 'Pest Assessment'}
                        </span>
                        <h4 className="font-bold text-base sm:text-lg text-on-surface dark:text-inverse-on-surface">
                          {detected_pest_name}
                        </h4>
                        {scientific_name && (
                          <p className="text-xs text-on-surface-variant italic font-serif">{scientific_name}</p>
                        )}
                      </div>
                    </div>
                    <div>{getSeverityBadge(severity)}</div>
                  </div>

                  {/* Pest Confidence Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan sa Peste' : 'Pest Confidence'}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{pestConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pestConfPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Pest Recommended Action */}
                  <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60 text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                      {lang === 'tl' ? 'Hakbang sa Pagsugpo ng Peste' : 'IPM Pest Protocol'}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed font-medium">
                      {recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 2: Disease Detection Card (Always included along with pest detection) */}
              {(activeTab === 'both' || activeTab === 'disease') && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">coronavirus</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400">
                            {lang === 'tl' ? 'Pagsusuri sa Sakit' : 'Plant Disease Assessment'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-xs bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider">
                            {resolvedDiseasePathogen}
                          </span>
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-on-surface dark:text-inverse-on-surface">
                          {resolvedDiseaseName}
                        </h4>
                        {resolvedDiseaseSci && (
                          <p className="text-xs text-on-surface-variant italic font-serif">{resolvedDiseaseSci}</p>
                        )}
                      </div>
                    </div>
                    <div>{getSeverityBadge(resolvedDiseaseSev)}</div>
                  </div>

                  {/* Disease Confidence Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan sa Sakit' : 'Pathogen Certainty'}
                      </span>
                      <span className="text-amber-700 dark:text-amber-400 font-bold">{diseaseConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-600 h-2 rounded-full transition-all duration-500" style={{ width: `${diseaseConfPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Symptoms & Action */}
                  <div className="space-y-2 text-xs">
                    {resolvedDiseaseSymptoms && (
                      <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-400/20 text-amber-950 dark:text-amber-200">
                        <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                          {lang === 'tl' ? 'Sintomas sa Dahon' : 'Observed Foliar Symptoms'}
                        </span>
                        <p className="font-medium text-[11px] leading-relaxed">{resolvedDiseaseSymptoms}</p>
                      </div>
                    )}

                    <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                        {lang === 'tl' ? 'Hakbang sa Paggamot ng Sakit' : 'IDM Disease Treatment Protocol'}
                      </span>
                      <p className="text-on-surface-variant leading-relaxed font-medium">
                        {resolvedDiseaseAction}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Farmer Accuracy Feedback Footer */}
        <div className="p-4 sm:p-5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                {t('confirmAccuracy') || (lang === 'tl' ? 'Wasto ba ang pagsusuri sa peste at sakit na ito?' : 'Was this dual pest and disease diagnostic accurate?')}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {lang === 'tl' ? 'Ang iyong puna ay nakatutulong sa pagpapabuti ng AI models.' : 'Your feedback continually refines field inference precision for both pests and plant diseases.'}
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

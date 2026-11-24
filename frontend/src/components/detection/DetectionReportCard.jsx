import React, { useState, useEffect } from 'react';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { FieldInspectionReportModal } from './FieldInspectionReportModal';
import { useLanguage } from '../../context/LanguageContext';
import { detectionService } from '../../services/detectionService';
import { getDetectionSummary, getScreenedTargetsForCrop } from '../../utils/detectionUtils';

export const DetectionReportCard = ({ detection }) => {
  const { lang, t } = useLanguage();
  const [feedbackAccurate, setFeedbackAccurate] = useState(detection?.feedback_accurate);
  const [feedbackNotes, setFeedbackNotes] = useState(detection?.feedback_notes || '');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(
    detection?.feedback_accurate !== null && detection?.feedback_accurate !== undefined
  );
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pest' | 'disease'

  useEffect(() => {
    setActiveTab('all');
    setFeedbackAccurate(detection?.feedback_accurate);
    setFeedbackNotes(detection?.feedback_notes || '');
    setFeedbackSubmitted(
      detection?.feedback_accurate !== null && detection?.feedback_accurate !== undefined
    );
  }, [detection?.id]);

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
    detected_disease_name,
    disease_scientific_name,
    disease_pathogen_type,
    disease_confidence_score,
    disease_severity,
    disease_symptoms,
    disease_recommended_action,
    disease_details,
  } = detection;

  const summary = getDetectionSummary(detection);
  const {
    outcome,
    isHealthy,
    hasPest,
    hasPestDamage,
    hasDisease,
    hasNutrientDeficiency,
    primaryTitle,
    conditionAssessment,
  } = summary;

  const pestConfPercent = hasPest ? Math.round((confidence_score || 0) * 100) : 0;
  const healthyConfPercent = isHealthy ? Math.round((confidence_score || 0) * 100) : 0;
  const primaryConfPercent = Math.round((summary.primaryConfidence || confidence_score || 0) * 100);
  const diseaseConfPercent = hasDisease
    ? Math.round((disease_confidence_score ?? disease_details?.confidence ?? 0) * 100)
    : 0;

  const resolvedDiseaseName = detected_disease_name || disease_details?.name || null;
  const resolvedDiseaseSci = disease_scientific_name || disease_details?.scientific_name || null;
  const resolvedDiseasePathogen = disease_pathogen_type || disease_details?.pathogen_type || null;
  const resolvedDiseaseSev = disease_severity || disease_details?.severity || severity || 'Moderate';
  const resolvedDiseaseSymptoms = disease_symptoms || disease_details?.symptoms || null;
  const resolvedDiseaseAction = disease_recommended_action || disease_details?.recommended_action || recommended_action || null;

  const probablePests = conditionAssessment?.probable_pests || [];
  const pestDamageInfo = conditionAssessment?.pest_damage || null;
  const nutrientInfo = conditionAssessment?.nutrient_deficiency || null;
  const visualSignals = conditionAssessment?.visual_signals || null;

  const getOutcomeBadge = () => {
    if (outcome === 'healthy') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold text-[10px] uppercase tracking-wider border border-teal-500/20">
          {lang === 'tl' ? 'Malusog na Pananim' : 'Healthy Leafy Green'}
        </span>
      );
    }
    if (outcome === 'pest_damage') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-800 dark:text-orange-300 font-bold text-[10px] uppercase tracking-wider border border-orange-500/20">
          {lang === 'tl' ? 'Pinsala ng Peste sa Dahon' : 'Pest-Damaged Foliage'}
        </span>
      );
    }
    if (outcome === 'nutrient_deficiency') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-800 dark:text-sky-300 font-bold text-[10px] uppercase tracking-wider border border-sky-500/20">
          {lang === 'tl' ? 'Kakulangan sa Sustansya' : 'Nutrient Deficiency / Abiotic'}
        </span>
      );
    }
    if (outcome === 'pest') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase tracking-wider border border-rose-500/20">
          {lang === 'tl' ? 'Peste Lamang ang Natukoy' : 'Pest Detected (No Disease)'}
        </span>
      );
    }
    if (outcome === 'disease') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/20">
          {lang === 'tl' ? 'Sakit Lamang ang Natukoy' : 'Disease Detected (No Pest)'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-error/10 text-error font-bold text-[10px] uppercase tracking-wider border border-error/20">
        {lang === 'tl' ? 'Peste at Sakit Natukoy' : 'Pest & Disease Detected'}
      </span>
    );
  };

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

  const handleFeedbackSubmit = async (isAccurateOverride = undefined) => {
    const accurateValue = isAccurateOverride !== undefined ? isAccurateOverride : feedbackAccurate;
    if (accurateValue === undefined || accurateValue === null) return;

    setFeedbackAccurate(accurateValue);
    setSubmittingFeedback(true);
    try {
      await detectionService.submitFeedback(id, accurateValue, feedbackNotes);
      setFeedbackSubmitted(true);
    } catch (err) {
      alert(lang === 'tl' ? 'Nabigong i-save ang puna.' : 'Failed to save feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSpeakAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'tl' ? 'Hindi suportado ang audio narration sa browser na ito.' : 'Audio narration is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    let narrationText = '';
    if (isHealthy) {
      narrationText = lang === 'tl'
        ? `Ulat Bilang ${id}. ${primaryTitle}. Walang natukoy na peste o sakit sa dahon. Payo: ${recommended_action}`
        : `Diagnostic Report Number ${id}. ${primaryTitle}. No active insect pest or foliar plant disease was detected. Recommendation: ${recommended_action}`;
    } else if (hasPest && !hasDisease) {
      narrationText = lang === 'tl'
        ? `Ulat Bilang ${id}. Natukoy na peste: ${detected_pest_name}, antas ng banta: ${severity}. Walang natukoy na sakit sa dahon. Hakbang: ${recommended_action}`
        : `Diagnostic Report Number ${id}. Insect pest detected: ${detected_pest_name}, threat level: ${severity}. No foliar plant disease was detected. Management action: ${recommended_action}`;
    } else if (!hasPest && hasDisease) {
      narrationText = lang === 'tl'
        ? `Ulat Bilang ${id}. Walang natukoy na insektong peste. Natukoy na sakit sa dahon: ${resolvedDiseaseName}, antas ng banta: ${resolvedDiseaseSev}. Hakbang sa paggamot: ${resolvedDiseaseAction || ''}`
        : `Diagnostic Report Number ${id}. No insect pest detected. Plant disease detected: ${resolvedDiseaseName}${resolvedDiseasePathogen ? `, pathogen: ${resolvedDiseasePathogen}` : ''}, severity: ${resolvedDiseaseSev}. Disease treatment: ${resolvedDiseaseAction || ''}`;
    } else {
      narrationText = lang === 'tl'
        ? `Ulat Bilang ${id}. Peste: ${detected_pest_name}, banta: ${severity}. Hakbang sa peste: ${recommended_action}. Sakit sa dahon: ${resolvedDiseaseName}, banta: ${resolvedDiseaseSev}. Hakbang sa sakit: ${resolvedDiseaseAction || ''}`
        : `Diagnostic Report Number ${id}. Pest detected: ${detected_pest_name}, threat level: ${severity}. Pest action: ${recommended_action}. Plant disease detected: ${resolvedDiseaseName}, severity: ${resolvedDiseaseSev}. Disease control: ${resolvedDiseaseAction || ''}`;
    }

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

  const hasPestBoxes = (bounding_boxes || []).some((b) => (b.type || '').toLowerCase() === 'pest');
  const hasDiseaseBoxes = (bounding_boxes || []).some((b) => (b.type || '').toLowerCase() === 'disease');
  const hasHealthyBoxes = (bounding_boxes || []).some((b) => (b.type || '').toLowerCase() === 'healthy');

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
            <div className="flex items-center gap-2 mb-0.5">{getOutcomeBadge()}</div>
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

        {/* View Switcher: Only show Pest/Disease tabs when BOTH are detected */}
        {hasPest && hasDisease && (
          <div className="px-5 pt-4 flex items-center gap-2 border-b border-outline-variant dark:border-outline bg-surface-container-low/30">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'border-primary text-primary dark:text-primary-fixed'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">biotech</span>
              <span>{lang === 'tl' ? 'Lahat (Peste at Sakit)' : 'All Findings'}</span>
            </button>
            <button
              onClick={() => setActiveTab('pest')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pest'
                  ? 'border-rose-600 text-rose-700 dark:text-rose-400'
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
        )}

        {/* Specimen Content Layout */}
        <div className="p-5 sm:p-6 flex flex-col xl:flex-row gap-6">
          {/* Specimen Visual Area with Bounding Boxes */}
          <div className="w-full xl:w-2/5 rounded-xl overflow-hidden border border-outline-variant bg-surface relative flex-shrink-0 shadow-xs flex flex-col justify-between">
            <BoundingBoxOverlay imagePath={image_path} boundingBoxes={bounding_boxes} />
            {/* Dynamic visual legend matching actual drawn box types */}
            <div className="p-2.5 bg-surface-container-lowest/90 dark:bg-slate-900/90 border-t border-outline-variant flex items-center justify-around flex-wrap gap-2 text-[10px] font-bold">
              {hasHealthyBoxes && (
                <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-500"></span>
                  <span>{lang === 'tl' ? 'Malusog na Pananim' : 'Healthy Leafy Crop'}</span>
                </span>
              )}
              {hasPestBoxes && (
                <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                  <span>{lang === 'tl' ? 'Insektong Peste' : 'Insect Pest'}</span>
                </span>
              )}
              {hasDiseaseBoxes && (
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                  <span>{lang === 'tl' ? 'Sakit sa Dahon' : 'Plant Disease'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Diagnosis Details View */}
          <div className="flex flex-col flex-1 gap-4 justify-between">
            {/* Environmental & Field Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-bold">
                Host: {crop_name || (lang === 'tl' ? 'Pananim' : 'Leafy Green')}
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

              {/* TOTAL PLANT CONDITION OVERVIEW BANNER (Always shown when condition_assessment is present) */}
              {conditionAssessment?.overall_condition && (
                <div className="p-3.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-low/60 dark:bg-surface-container space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">monitoring</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                          {lang === 'tl' ? 'Kabuuang Kondisyon ng Halaman' : 'Total Plant Condition'}
                        </span>
                        <span className="font-bold text-sm text-on-surface dark:text-inverse-on-surface">
                          {conditionAssessment.overall_condition}
                        </span>
                      </div>
                    </div>
                    {typeof conditionAssessment.health_score === 'number' && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant text-xs font-bold">
                        <span className="text-on-surface-variant text-[10px] uppercase">
                          {lang === 'tl' ? 'Kalusugan' : 'Health Score'}
                        </span>
                        <span className={
                          conditionAssessment.health_score >= 80
                            ? 'text-teal-700 dark:text-teal-400'
                            : conditionAssessment.health_score >= 55
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-error'
                        }>
                          {conditionAssessment.health_score}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {conditionAssessment.condition_summary && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {conditionAssessment.condition_summary}
                    </p>
                  )}

                  {visualSignals && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-semibold">
                      <div className="px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span>{lang === 'tl' ? 'Berdeng Dahon' : 'Green Leaf'}</span>
                        <span className="font-bold">{visualSignals.green_foliage_pct}%</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>{lang === 'tl' ? 'Paninilaw' : 'Chlorosis'}</span>
                        <span className="font-bold">{visualSignals.yellow_chlorosis_pct}%</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-orange-500/10 text-orange-900 dark:text-orange-300 flex items-center justify-between">
                        <span>{lang === 'tl' ? 'Pagkatuyot' : 'Necrosis'}</span>
                        <span className="font-bold">{visualSignals.brown_necrosis_pct}%</span>
                      </div>
                      {visualSignals.leaf_hole_count >= 4 && visualSignals.hole_area_pct >= 0.8 && (
                        <div className="col-span-3 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-800 dark:text-rose-300 flex items-center justify-between border border-rose-500/20">
                          <span>{lang === 'tl' ? 'Mga Butas sa Dahon (Kagat ng Peste)' : 'Leaf Perforations (Insect Chew Holes)'}</span>
                          <span className="font-bold">
                            {visualSignals.leaf_hole_count} holes ({visualSignals.hole_area_pct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {conditionAssessment.two_angle_scan?.enabled && (
                    <div className="px-2.5 py-2 rounded-lg bg-primary/10 border border-primary/25 text-[11px] text-on-surface dark:text-inverse-on-surface flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">flip</span>
                      <div>
                        <span className="font-bold text-primary block text-[10px] uppercase tracking-wider">
                          {lang === 'tl' ? '2-Angle Scan (Ibabaw + Ilalim ng Dahon)' : '2-Angle Scan (Top + Leaf Underside)'}
                        </span>
                        <span className="text-on-surface-variant">{conditionAssessment.two_angle_scan.underside_summary}</span>
                      </div>
                    </div>
                  )}

                  {conditionAssessment.image_quality?.quality_hint && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                      <span>{conditionAssessment.image_quality.quality_hint}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STATE: Indirect Pest-Damaged Foliage (Pest not directly visible -> lists Probable Culprits) */}
              {hasPestDamage && (
                <div className="p-4 rounded-xl border border-orange-500/35 bg-orange-500/5 dark:bg-orange-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">pest_control</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-800 dark:text-orange-300">
                          {lang === 'tl' ? 'Pinsala ng Peste (Walang Nakitang Insekto)' : 'Indirect Pest Damage Assessment'}
                        </span>
                        <h4 className="font-bold text-base sm:text-lg text-on-surface dark:text-inverse-on-surface">
                          {pestDamageInfo?.damage_type || primaryTitle}
                        </h4>
                      </div>
                    </div>
                    <div>{getSeverityBadge(pestDamageInfo?.severity || severity)}</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan ng Pinsala' : 'Damage Signature Confidence'}
                      </span>
                      <span className="text-orange-700 dark:text-orange-300 font-bold">{primaryConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-orange-600 h-2 rounded-full transition-all duration-500" style={{ width: `${primaryConfPercent}%` }}></div>
                    </div>
                  </div>

                  {probablePests.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-orange-900 dark:text-orange-300 block">
                        {lang === 'tl' ? 'Posibleng Pesteng Gumawa ng Pinsala' : 'Probable Causal Pest(s)'}
                      </span>
                      <div className="space-y-1.5">
                        {probablePests.map((culprit, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-surface-container-lowest dark:bg-surface-container border border-orange-400/25 flex items-start justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-on-surface dark:text-inverse-on-surface">{culprit.name}</span>
                              {culprit.scientific_name && (
                                <span className="ml-1.5 text-[11px] italic text-on-surface-variant font-serif">({culprit.scientific_name})</span>
                              )}
                              {culprit.evidence && (
                                <p className="text-[11px] text-on-surface-variant mt-0.5">{culprit.evidence}</p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-800 dark:text-orange-300 whitespace-nowrap">
                              {culprit.likelihood}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60 text-xs">
                    <span className="font-bold text-orange-800 dark:text-orange-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                      {lang === 'tl' ? 'Hakbang sa Pagsugpo at Pag-inspeksyon' : 'Scouting & IPM Protocol'}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed font-medium">
                      {pestDamageInfo?.recommended_action || recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* STATE: Nutrient Deficiency / Abiotic Stress (Non-infectious) */}
              {hasNutrientDeficiency && (
                <div className="p-4 rounded-xl border border-sky-500/35 bg-sky-500/5 dark:bg-sky-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">science</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-sky-800 dark:text-sky-300">
                          {lang === 'tl' ? 'Kakulangan sa Sustansya (Hindi Nakakahawa)' : 'Nutrient Deficiency / Abiotic Assessment'}
                        </span>
                        <h4 className="font-bold text-base sm:text-lg text-on-surface dark:text-inverse-on-surface">
                          {nutrientInfo?.name || primaryTitle}
                        </h4>
                        {nutrientInfo?.nutrient && (
                          <p className="text-xs text-sky-700 dark:text-sky-300 font-semibold">{nutrientInfo.nutrient}</p>
                        )}
                      </div>
                    </div>
                    <div>{getSeverityBadge(nutrientInfo?.severity || severity)}</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan ng Pagsusuri' : 'Assessment Confidence'}
                      </span>
                      <span className="text-sky-700 dark:text-sky-300 font-bold">{primaryConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-600 h-2 rounded-full transition-all duration-500" style={{ width: `${primaryConfPercent}%` }}></div>
                    </div>
                  </div>

                  {nutrientInfo?.symptoms && (
                    <div className="p-2.5 bg-sky-500/10 rounded-lg border border-sky-400/20 text-xs text-sky-950 dark:text-sky-200">
                      <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                        {lang === 'tl' ? 'Mga Palatandaan' : 'Observed Deficiency Symptoms'}
                      </span>
                      <p className="font-medium text-[11px] leading-relaxed">{nutrientInfo.symptoms}</p>
                      {nutrientInfo.causes && (
                        <p className="text-[11px] mt-1 opacity-90">
                          <strong>{lang === 'tl' ? 'Karaniwang Sanhi: ' : 'Common Causes: '}</strong>
                          {nutrientInfo.causes}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60 text-xs">
                    <span className="font-bold text-sky-800 dark:text-sky-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                      {lang === 'tl' ? 'Gabay sa Abono at Patubig' : 'Fertilization & Correction Protocol'}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed font-medium">
                      {nutrientInfo?.recommended_action || recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* STATE 1: Healthy Leafy Green (No Pest, No Disease) */}
              {isHealthy && (
                <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">eco</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 dark:text-teal-300">
                          {lang === 'tl' ? 'Kalusugan ng Pananim' : 'Crop Health Assessment'}
                        </span>
                        <h4 className="font-bold text-base sm:text-lg text-on-surface dark:text-inverse-on-surface">
                          {primaryTitle}
                        </h4>
                        {scientific_name && (
                          <p className="text-xs text-on-surface-variant italic font-serif">{scientific_name}</p>
                        )}
                      </div>
                    </div>
                    <div>{getSeverityBadge('Low')}</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan ng Pagsusuri' : 'Crop Recognition Confidence'}
                      </span>
                      <span className="text-teal-700 dark:text-teal-300 font-bold">{healthyConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: `${healthyConfPercent}%` }}></div>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {pest_description || (lang === 'tl'
                      ? 'Walang nakitang insektong peste o sakit sa dahon sa specimen na ito.'
                      : 'No active insect pest or foliar plant disease was detected on this specimen.')}
                  </p>

                  <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60 text-xs">
                    <span className="font-bold text-teal-800 dark:text-teal-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                      {lang === 'tl' ? 'Gabay sa Pangangalaga' : 'Preventive Crop Care'}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed font-medium">{recommended_action}</p>
                  </div>
                </div>
              )}

              {/* STATE 2: Pest Detection Card (Rendered ONLY when an insect pest was actually detected) */}
              {hasPest && (activeTab === 'all' || activeTab === 'pest') && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">bug_report</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800 dark:text-rose-300">
                          {lang === 'tl' ? 'Pagsusuri sa Peste' : 'Insect Pest Assessment'}
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

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Katiyakan sa Peste' : 'Pest Confidence'}
                      </span>
                      <span className="text-rose-700 dark:text-rose-300 font-bold">{pestConfPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-variant dark:bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-rose-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pestConfPercent}%` }}></div>
                    </div>
                  </div>

                  {pest_description && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">{pest_description}</p>
                  )}

                  <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60 text-xs">
                    <span className="font-bold text-rose-800 dark:text-rose-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                      {lang === 'tl' ? 'Hakbang sa Pagsugpo ng Peste' : 'IPM Pest Protocol'}
                    </span>
                    <p className="text-on-surface-variant leading-relaxed font-medium">{recommended_action}</p>
                  </div>
                </div>
              )}

              {/* STATE 3: Plant Disease Detection Card (Rendered ONLY when a foliar disease was actually detected) */}
              {hasDisease && (activeTab === 'all' || activeTab === 'disease') && (
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
                          {resolvedDiseasePathogen && (
                            <span className="px-1.5 py-0.2 rounded-xs bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider">
                              {resolvedDiseasePathogen}
                            </span>
                          )}
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

                  <div className="space-y-2 text-xs">
                    {resolvedDiseaseSymptoms && (
                      <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-400/20 text-amber-950 dark:text-amber-200">
                        <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                          {lang === 'tl' ? 'Sintomas sa Dahon' : 'Observed Foliar Symptoms'}
                        </span>
                        <p className="font-medium text-[11px] leading-relaxed">{resolvedDiseaseSymptoms}</p>
                      </div>
                    )}

                    {resolvedDiseaseAction && (
                      <div className="p-3 bg-surface-container-lowest dark:bg-surface-container rounded-lg border border-outline-variant/60">
                        <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5 text-[11px] uppercase tracking-wider">
                          {lang === 'tl' ? 'Hakbang sa Paggamot ng Sakit' : 'IDM Disease Treatment Protocol'}
                        </span>
                        <p className="text-on-surface-variant leading-relaxed font-medium">{resolvedDiseaseAction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compact Reassurance Note when only ONE category (pest OR disease) was detected */}
              {hasPest && !hasDisease && (
                <div className="p-3 rounded-xl border border-secondary/30 bg-secondary/5 text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>
                    {lang === 'tl'
                      ? 'Walang natukoy na sakit sa dahon para sa pagsusuring ito.'
                      : 'No foliar plant disease was detected on this specimen.'}
                  </span>
                </div>
              )}
              {!hasPest && hasDisease && (
                <div className="p-3 rounded-xl border border-secondary/30 bg-secondary/5 text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span>
                    {lang === 'tl'
                      ? 'Walang natukoy na insektong peste para sa pagsusuring ito.'
                      : 'No active insect pest was detected on this specimen.'}
                  </span>
                </div>
              )}

              {/* FULL SCREENED PEST, DISEASE & NUTRIENT BREAKDOWN */}
              {(() => {
                const screened = getScreenedTargetsForCrop(crop_name, conditionAssessment);
                const detectedPestLower = hasPest && detected_pest_name ? detected_pest_name.trim().toLowerCase() : '';
                const detectedDiseaseLower = hasDisease && resolvedDiseaseName ? resolvedDiseaseName.trim().toLowerCase() : '';
                const detectedNutLower = nutrientInfo?.name ? nutrientInfo.name.trim().toLowerCase() : '';
                const probableSet = new Set(
                  probablePests.map((c) => (c?.name || '').trim().toLowerCase()).filter(Boolean)
                );
                const pestsList = [...screened.pests];
                probablePests.forEach((c) => {
                  if (c?.name && !pestsList.some((p) => p.toLowerCase() === c.name.toLowerCase())) {
                    pestsList.unshift(c.name);
                  }
                });

                return (
                  <div className="p-3.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-low/40 dark:bg-surface-container/60 space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
                        {lang === 'tl' ? 'Breakdown ng Peste at Sakit na Sinusuri' : 'Pest & Disease Screening Breakdown'}
                      </span>
                      <p className="text-[11px] text-on-surface-variant">
                        {lang === 'tl'
                          ? `Sinuri para sa ${crop_name || 'Pananim'}: ${pestsList.length} peste, ${screened.diseases.length} sakit, at ${screened.nutrients.length} kakulangan sa sustansya`
                          : `Screened for ${crop_name || 'Leafy Green'}: ${pestsList.length} pests, ${screened.diseases.length} plant diseases, and ${screened.nutrients.length} nutrient/abiotic conditions`}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {/* Detectable Pests */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                          {lang === 'tl' ? `Mga Peste (${pestsList.length})` : `Detectable Pests (${pestsList.length})`}
                        </span>
                        <div className="space-y-1">
                          {pestsList.map((pest) => {
                            const lower = pest.toLowerCase();
                            const isMatched = Boolean(detectedPestLower && lower === detectedPestLower);
                            const isProbable = !isMatched && probableSet.has(lower);
                            return (
                              <div
                                key={pest}
                                className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md ${
                                  isMatched
                                    ? 'bg-rose-500/15 border border-rose-500/30 font-bold text-on-surface dark:text-inverse-on-surface'
                                    : isProbable
                                      ? 'bg-orange-500/15 border border-orange-500/30 font-bold text-on-surface dark:text-inverse-on-surface'
                                      : 'bg-surface-container-lowest/70 dark:bg-slate-900/50 text-on-surface-variant'
                                }`}
                              >
                                <span className="truncate">{pest}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${
                                    isMatched
                                      ? 'bg-rose-600 text-white'
                                      : isProbable
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                  }`}
                                >
                                  {isMatched ? 'Detected' : isProbable ? 'Probable' : 'Clear'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detectable Diseases + Nutrients */}
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                            {lang === 'tl' ? `Mga Sakit (${screened.diseases.length})` : `Detectable Diseases (${screened.diseases.length})`}
                          </span>
                          <div className="space-y-1">
                            {screened.diseases.map((dis) => {
                              const isMatched = Boolean(detectedDiseaseLower && dis.toLowerCase() === detectedDiseaseLower);
                              return (
                                <div
                                  key={dis}
                                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md ${
                                    isMatched
                                      ? 'bg-amber-500/15 border border-amber-500/30 font-bold text-on-surface dark:text-inverse-on-surface'
                                      : 'bg-surface-container-lowest/70 dark:bg-slate-900/50 text-on-surface-variant'
                                  }`}
                                >
                                  <span className="truncate">{dis}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${
                                      isMatched
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                    }`}
                                  >
                                    {isMatched ? 'Detected' : 'Clear'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                            {lang === 'tl' ? `Sustansya / Abiotic (${screened.nutrients.length})` : `Nutrient & Abiotic (${screened.nutrients.length})`}
                          </span>
                          <div className="space-y-1">
                            {screened.nutrients.map((nut) => {
                              const isMatched = Boolean(detectedNutLower && nut.toLowerCase() === detectedNutLower);
                              return (
                                <div
                                  key={nut}
                                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md ${
                                    isMatched
                                      ? 'bg-sky-500/15 border border-sky-500/30 font-bold text-on-surface dark:text-inverse-on-surface'
                                      : 'bg-surface-container-lowest/70 dark:bg-slate-900/50 text-on-surface-variant'
                                  }`}
                                >
                                  <span className="truncate">{nut}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${
                                      isMatched
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                    }`}
                                  >
                                    {isMatched ? 'Detected' : 'Clear'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Farmer Accuracy Feedback Footer */}
        <div className="p-4 sm:p-5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-label-sm text-xs font-bold text-on-surface dark:text-inverse-on-surface">
                {t('confirmAccuracy') || (lang === 'tl' ? 'Wasto ba ang pagsusuring ito?' : 'Was this diagnostic accurate?')}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {lang === 'tl' ? 'Ang iyong puna ay nakatutulong sa pagpapabuti ng AI models.' : 'Your feedback continually refines field inference precision.'}
              </p>
            </div>

            {feedbackSubmitted ? (
              <span className="px-3 py-1.5 rounded-lg bg-secondary-container/30 text-secondary dark:text-secondary-fixed text-xs font-bold border border-secondary/20">
                {t('feedbackRecorded') || (lang === 'tl' ? 'Naitala ang Puna' : 'Feedback Logged')}
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={submittingFeedback}
                  onClick={() => handleFeedbackSubmit(true)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant transition-colors cursor-pointer disabled:opacity-50 ${
                    feedbackAccurate === true ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface hover:bg-surface-variant text-on-surface'
                  }`}
                >
                  {t('accurate')}
                </button>
                <button
                  type="button"
                  disabled={submittingFeedback}
                  onClick={() => handleFeedbackSubmit(false)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant transition-colors cursor-pointer disabled:opacity-50 ${
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

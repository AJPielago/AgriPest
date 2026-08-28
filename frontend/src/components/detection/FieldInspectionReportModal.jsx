import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sprout, Bug, ShieldCheck, FileText, UserCheck, PenTool, Printer } from 'lucide-react';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { SignaturePad } from '../ui/SignaturePad';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const FieldInspectionReportModal = ({ isOpen, onClose, detection }) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

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
    feedback_accurate,
    feedback_notes
  } = detection;

  const confPercent = Math.round((confidence_score || 0) * 100);

  const formattedDate = created_at 
    ? new Date(created_at).toLocaleString(lang === 'tl' ? 'fil-PH' : undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : 'N/A';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'tl' ? `Ulat ng Pagsusuri sa Sakahan #${id}` : `Field Diagnostic Report #${id}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 font-sans">
        
        {/* Modal Action Bar (Hidden on Print) */}
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md border border-slate-300 dark:border-slate-700 no-print space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {lang === 'tl' 
                ? 'Bumuo at lagdaan ang ulat bago i-save bilang A4 PDF document.' 
                : 'Sign and inspect document before saving as an official 1-page A4 PDF field report.'}
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button 
                variant={showSignaturePad ? "primary" : "secondary"} 
                size="sm" 
                icon={PenTool} 
                onClick={() => setShowSignaturePad(!showSignaturePad)}
              >
                {signatureDataUrl 
                  ? (lang === 'tl' ? 'Baguhin ang Lagda' : 'Edit Signature') 
                  : (lang === 'tl' ? 'Magdagdag ng Lagda' : 'Add Officer Signature')}
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
                {lang === 'tl' ? 'I-print / I-save bilang PDF' : 'Print / Save PDF'}
              </Button>
            </div>
          </div>

          {/* Collapsible Digital Signature Pad Toolbar */}
          {showSignaturePad && (
            <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
              <SignaturePad
                onSaveSignature={(dataUrl) => {
                  setSignatureDataUrl(dataUrl);
                  setShowSignaturePad(false);
                }}
                onClearSignature={() => {
                  setSignatureDataUrl(null);
                }}
              />
            </div>
          )}
        </div>

        {/* Printable A4 Report Container */}
        <div className="printable-field-report bg-white text-slate-900 border border-slate-900 p-6 sm:p-8 space-y-5 rounded-sm font-sans">
          
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Sprout className="w-4 h-4" />
                </div>
                <span className="font-extrabold uppercase tracking-wider text-xs text-slate-900 font-mono">
                  AGRIPEST DIAGNOSTIC WORKSTATION
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase">
                {lang === 'tl' ? 'ULAT NG PAGSUSURI SA SAKAHAN' : 'FIELD DIAGNOSTIC INSPECTION REPORT'}
              </h1>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                {lang === 'tl' ? 'Opisyal na Dokumento sa Pagsusuri ng Peste at Kalusugan ng Halaman' : 'Official Agricultural Pest Surveillance & Plant Health Assessment Document'}
              </p>
            </div>

            <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-slate-900 pl-3 sm:pl-0 font-mono text-xs space-y-0.5">
              <div><span className="font-bold text-slate-600">{lang === 'tl' ? 'SERYE BLG:' : 'SERIAL NO:'}</span> <strong className="text-slate-950 font-bold">REPORT-AGRI-00{id}</strong></div>
              <div><span className="font-bold text-slate-600">{lang === 'tl' ? 'PETSA AT ORAS:' : 'DATE & TIME:'}</span> <strong className="text-slate-950">{formattedDate}</strong></div>
              <div><span className="font-bold text-slate-600">{lang === 'tl' ? 'KATAYUAN:' : 'STATUS:'}</span> <strong className="text-slate-950 uppercase">{severity || (lang === 'tl' ? 'TAPOS NA' : 'COMPLETED')}</strong></div>
            </div>
          </div>

          {/* Target Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 border border-slate-900 rounded-sm text-xs font-mono">
            <div>
              <span className="text-slate-600 block text-[10px] font-bold uppercase">{t('hostCrop')}</span>
              <strong className="text-slate-950 font-bold text-xs block truncate">{crop_name || (lang === 'tl' ? 'Hindi Naitakda' : 'Unspecified Host')}</strong>
            </div>

            <div>
              <span className="text-slate-600 block text-[10px] font-bold uppercase">{t('weatherCondition')}</span>
              <strong className="text-slate-950 font-bold text-xs block truncate">{weather_condition || 'N/A'}</strong>
            </div>

            <div>
              <span className="text-slate-600 block text-[10px] font-bold uppercase">{t('fieldLocation')}</span>
              <strong className="text-slate-950 font-bold text-xs block truncate">{field_location || (lang === 'tl' ? 'Sona ng Bukid' : 'Unrecorded Site')}</strong>
            </div>

            <div>
              <span className="text-slate-600 block text-[10px] font-bold uppercase">{lang === 'tl' ? 'KATIYAKAN NG AI' : 'AI CONFIDENCE'}</span>
              <strong className="text-slate-950 font-bold text-xs block">{confPercent}% {lang === 'tl' ? 'Katiyakan' : 'Certainty'}</strong>
            </div>
          </div>

          {/* Main Inspection Grid: Specimen Visual + Species Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border-t border-b border-slate-300 py-4">
            
            {/* Left Column: Bounding Box Specimen Image */}
            <div className="md:col-span-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block flex items-center gap-1.5 font-mono">
                <Bug className="w-4 h-4 text-slate-900" />
                {lang === 'tl' ? 'Larawan ng Specimen & Bounding Box:' : 'Specimen Image & Bounding Box:'}
              </span>
              <div className="border-2 border-slate-900 rounded-sm overflow-hidden bg-slate-950 p-1">
                <BoundingBoxOverlay
                  imagePath={image_path}
                  boundingBoxes={bounding_boxes}
                />
              </div>
              <p className="text-[10px] text-slate-600 italic font-mono text-center">
                {lang === 'tl' ? 'Larawan 1: Sinuring dahon na nagpapakita ng natukoy na rehiyon ng peste.' : 'Figure 1: Analyzed crop specimen showing detected bounding region.'}
              </p>
            </div>

            {/* Right Column: Diagnostic Findings & Evaluation */}
            <div className="md:col-span-7 space-y-3 text-xs">
              
              {/* Species Box */}
              <div className="p-3 bg-slate-100 border border-slate-900 rounded-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                    {detected_pest_name}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-slate-900 font-mono font-bold text-xs uppercase bg-white">
                    {t('severity')}: {severity}
                  </span>
                </div>
                {scientific_name && (
                  <p className="text-xs text-slate-700 italic font-mono font-bold">
                    {lang === 'tl' ? 'Siyentipikong Pangalan:' : 'Scientific Name:'} {scientific_name}
                  </p>
                )}
              </div>

              {/* Field Symptoms */}
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-900 block flex items-center gap-1 font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-800" />
                  {lang === 'tl' ? 'Paglalarawan at Sintomas sa Bukid:' : 'Field Description & Symptoms:'}
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-2.5 border border-slate-300 rounded-sm">
                  {pest_description || (lang === 'tl' ? 'Walang nakatalang paglalarawan ng peste sa database.' : 'No species description recorded in database.')}
                </p>
              </div>

              {/* Farmer Feedback Ground Truth (If Recorded) */}
              {feedback_accurate !== null && feedback_accurate !== undefined && (
                <div className="p-2.5 bg-slate-100 border border-slate-400 rounded-sm flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-slate-800" /> {lang === 'tl' ? 'Pagpapatunay ng Magsasaka:' : 'Field Ground Truth Validation:'}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded border ${feedback_accurate ? 'bg-emerald-100 border-emerald-700 text-emerald-900' : 'bg-red-100 border-red-700 text-red-900'}`}>
                    {feedback_accurate ? (lang === 'tl' ? 'KUMPIRMADONG WASTO' : 'CONFIRMED ACCURATE') : (lang === 'tl' ? 'MINARKAHANG MALI' : 'MARKED INACCURATE')}
                    {feedback_notes ? ` (${feedback_notes})` : ''}
                  </span>
                </div>
              )}

            </div>

          </div>

          {/* Department of Agriculture Recommended Protocol */}
          <div className="space-y-1.5">
            <span className="font-bold uppercase tracking-wider text-xs text-slate-950 block flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              {lang === 'tl' ? 'Inirerekomendang Aksyon at Paraan ng Pagsugpo:' : 'Recommended Action / Treatment Protocol:'}
            </span>
            <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-sm text-xs text-slate-950 space-y-1">
              <p className="leading-relaxed font-bold">
                {recommended_action}
              </p>
              <p className="text-[11px] text-slate-600 font-medium italic pt-1 border-t border-slate-300">
                {lang === 'tl'
                  ? 'Paalala: Magsagawa ng biological control measures bago gumamit ng kemikal alinsunod sa DA Good Agricultural Practices (GAP).'
                  : 'Note: Execute biological control measures prior to chemical intervention in compliance with DA Good Agricultural Practices (GAP).'}
              </p>
            </div>
          </div>

          {/* Official Sign-off & Inspection Verification Block */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-mono">
            
            {/* Extension Officer Signature Section */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-600 block uppercase font-bold">
                {lang === 'tl' ? 'OPISYAL NG AGRIKULTURA / INSPEKTOR:' : 'AGRICULTURAL EXTENSION OFFICER / INSPECTOR:'}
              </span>
              <div className="border-b border-slate-900 pb-1 h-14 flex items-end justify-center">
                {signatureDataUrl ? (
                  <img 
                    src={signatureDataUrl} 
                    alt="Extension Officer Signature" 
                    className="max-h-12 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 italic mb-1">{lang === 'tl' ? '(Digital Draft)' : '(Unsigned Digital Draft)'}</span>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-700 font-bold">
                <span>{user?.full_name || (lang === 'tl' ? 'Opisyal ng Bukid' : 'Extension Officer')}</span>
                <span>{lang === 'tl' ? 'Petsa:' : 'Date:'} {new Date().toLocaleDateString(lang === 'tl' ? 'fil-PH' : undefined)}</span>
              </div>
            </div>

            {/* Farm Representative Section */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-600 block uppercase font-bold">
                {lang === 'tl' ? 'MAY-ARI NG BUKID / KINATAWAN:' : 'FARM OWNER / ACKNOWLEDGED REPRESENTATIVE:'}
              </span>
              <div className="border-b border-slate-900 pb-1 h-14 flex items-end justify-center">
                <span className="text-[10px] text-slate-400 italic mb-1">{lang === 'tl' ? '(Pagkilala ng Kinatawan)' : '(Representative Acknowledgment)'}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700 font-bold">
                <span>{lang === 'tl' ? 'Lagda sa Ibabaw ng Pangalan' : 'Signature over Printed Name'}</span>
                <span>{lang === 'tl' ? 'Petsa:' : 'Date:'} ____ / ____ / 2026</span>
              </div>
            </div>

          </div>

          {/* System Footer Verification Watermark */}
          <div className="pt-2 text-center text-[10px] font-mono text-slate-500 border-t border-slate-200 flex items-center justify-between">
            <span>AgriPest Diagnostic Workstation &copy; 2026</span>
            <span>Document Integrity Hash: {id}-SECURE-VERIFIED</span>
          </div>

        </div>

      </div>
    </Modal>
  );
};

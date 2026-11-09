import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Bug, ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const DetectionCompareModal = ({ isOpen, onClose, rec1, rec2 }) => {
  const { lang, t } = useLanguage();
  if (!isOpen || !rec1 || !rec2) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('detectionRecords')}>
      <div className="space-y-4">
        
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
          <span>{t('realtimeMonitoring')}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          
          {/* Specimen 1 */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <Badge variant="info" className="text-[10px] font-mono">
              Report #{rec1.id} • {new Date(rec1.created_at).toLocaleDateString()}
            </Badge>
            <div className="h-36 bg-slate-900 rounded overflow-hidden">
              <img src={rec1.image_path} alt={rec1.detected_pest_name} className="w-full h-full object-cover" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              {rec1.detected_pest_name}
            </h4>
            {rec1.detected_disease_name && (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                {rec1.detected_disease_name}
              </p>
            )}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p>{t('hostCrop')}: <strong className="text-slate-900 dark:text-slate-100">{rec1.crop_name || 'Unspecified'}</strong></p>
              <p>{t('confidence')}: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{Math.round(rec1.confidence_score * 100)}%</strong></p>
              {rec1.disease_confidence_score && (
                <p>{lang === 'tl' ? 'Katiyakan sa Sakit' : 'Disease Conf'}: <strong className="font-mono text-amber-700 dark:text-amber-400">{Math.round(rec1.disease_confidence_score * 100)}%</strong></p>
              )}
              <p>{t('severity')}: <strong className="text-slate-900 dark:text-slate-100">{t(rec1.severity?.toLowerCase() || 'moderate')}</strong></p>
            </div>
          </div>

          {/* Specimen 2 */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <Badge variant="info" className="text-[10px] font-mono">
              Report #{rec2.id} • {new Date(rec2.created_at).toLocaleDateString()}
            </Badge>
            <div className="h-36 bg-slate-900 rounded overflow-hidden">
              <img src={rec2.image_path} alt={rec2.detected_pest_name} className="w-full h-full object-cover" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              {rec2.detected_pest_name}
            </h4>
            {rec2.detected_disease_name && (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                {rec2.detected_disease_name}
              </p>
            )}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p>{t('hostCrop')}: <strong className="text-slate-900 dark:text-slate-100">{rec2.crop_name || 'Unspecified'}</strong></p>
              <p>{t('confidence')}: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{Math.round(rec2.confidence_score * 100)}%</strong></p>
              {rec2.disease_confidence_score && (
                <p>{lang === 'tl' ? 'Katiyakan sa Sakit' : 'Disease Conf'}: <strong className="font-mono text-amber-700 dark:text-amber-400">{Math.round(rec2.disease_confidence_score * 100)}%</strong></p>
              )}
              <p>{t('severity')}: <strong className="text-slate-900 dark:text-slate-100">{t(rec2.severity?.toLowerCase() || 'moderate')}</strong></p>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  );
};

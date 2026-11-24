import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { resolveImageUrl } from '../../services/api';
import { getDetectionSummary } from '../../utils/detectionUtils';

export const DetectionCompareModal = ({ isOpen, onClose, rec1, rec2, items }) => {
  const { lang, t } = useLanguage();
  const left = rec1 || items?.[0];
  const right = rec2 || items?.[1];
  if (!isOpen || !left || !right) return null;

  const leftSummary = getDetectionSummary(left);
  const rightSummary = getDetectionSummary(right);
  const confDelta = Math.round(((rightSummary.primaryConfidence || 0) - (leftSummary.primaryConfidence || 0)) * 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('detectionRecords')}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
            <span>{lang === 'tl' ? 'Paghahambing ng Dalawang Pagsusuri' : 'Side-by-Side Specimen Comparison'}</span>
          </span>
          <Badge variant={confDelta === 0 ? 'neutral' : confDelta > 0 ? 'success' : 'warning'} className="text-[10px] font-mono">
            {lang === 'tl' ? 'Pagbabago sa Katiyakan' : 'Conf Δ'}: {confDelta >= 0 ? `+${confDelta}%` : `${confDelta}%`}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { rec: left, summary: leftSummary },
            { rec: right, summary: rightSummary },
          ].map(({ rec, summary }) => (
            <div key={rec.id} className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
              <Badge variant="info" className="text-[10px] font-mono">
                Report #{rec.id} • {new Date(rec.created_at).toLocaleDateString()}
              </Badge>
              <div className="h-36 bg-slate-900 rounded overflow-hidden">
                <img src={resolveImageUrl(rec.image_path)} alt={summary.primaryTitle} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${summary.isHealthy ? 'bg-teal-600' : summary.hasPest ? 'bg-rose-600' : 'bg-amber-600'}`}></span>
                {summary.primaryTitle}
              </h4>
              {summary.hasPest && summary.hasDisease && (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  {summary.diseaseName}
                </p>
              )}
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p>{t('hostCrop')}: <strong className="text-slate-900 dark:text-slate-100">{rec.crop_name || 'Leafy Green'}</strong></p>
                <p>{t('confidence')}: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{Math.round((summary.primaryConfidence || 0) * 100)}%</strong></p>
                {summary.hasPest && summary.hasDisease && rec.disease_confidence_score && (
                  <p>{lang === 'tl' ? 'Katiyakan sa Sakit' : 'Disease Conf'}: <strong className="font-mono text-amber-700 dark:text-amber-400">{Math.round(rec.disease_confidence_score * 100)}%</strong></p>
                )}
                <p>{t('severity')}: <strong className="text-slate-900 dark:text-slate-100">{t(rec.severity?.toLowerCase() || 'moderate')}</strong></p>
                {rec.weather_condition && (
                  <p>{t('weatherCondition')}: <strong className="text-slate-900 dark:text-slate-100">{rec.weather_condition}</strong></p>
                )}
                {rec.field_location && (
                  <p>{t('fieldSectorLocation')}: <strong className="text-slate-900 dark:text-slate-100">{rec.field_location}</strong></p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

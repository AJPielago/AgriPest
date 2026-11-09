import React from 'react';
import { resolveImageUrl } from '../../services/api';

export const BoundingBoxOverlay = ({ imagePath, boundingBoxes = [] }) => {
  if (!imagePath) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
      <img
        src={resolveImageUrl(imagePath)}
        alt="Specimen output"
        className="w-full h-auto max-h-[400px] object-contain block"
      />

      {/* Render Object Detection Bounding Box Overlays */}
      {boundingBoxes && boundingBoxes.length > 0 && boundingBoxes.map((box, index) => {
        // Calculate percentages
        let left = 0;
        let top = 0;
        let width = 0;
        let height = 0;

        if (box.x_min !== undefined && box.x_max !== undefined) {
          left = `${box.x_min * 100}%`;
          top = `${box.y_min * 100}%`;
          width = `${(box.x_max - box.x_min) * 100}%`;
          height = `${(box.y_max - box.y_min) * 100}%`;
        } else if (box.x !== undefined && box.width !== undefined) {
          left = `${(box.x / 640) * 100}%`;
          top = `${(box.y / 640) * 100}%`;
          width = `${(box.width / 640) * 100}%`;
          height = `${(box.height / 640) * 100}%`;
        }

        const isDisease = box.type === 'disease' || (box.label && box.label.toLowerCase().includes('disease'));
        const borderColor = isDisease ? 'border-amber-500 bg-amber-500/15' : 'border-emerald-500 bg-emerald-500/15';
        const badgeBg = isDisease ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white';

        return (
          <div
            key={index}
            style={{ left, top, width, height }}
            className={`absolute border-2 ${borderColor} rounded-xs transition-all pointer-events-none`}
          >
            <div className={`absolute -top-6 left-0 ${badgeBg} text-[10px] font-bold px-1.5 py-0.5 rounded-xs shadow-sm whitespace-nowrap flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[11px]">
                {isDisease ? 'coronavirus' : 'bug_report'}
              </span>
              <span>{box.label || (isDisease ? 'Disease Lesion' : 'Pest Specimen')}</span>
              {box.confidence && <span>({Math.round(box.confidence * 100)}%)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

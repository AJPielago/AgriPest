import React from 'react';

export const BoundingBoxOverlay = ({ imagePath, boundingBoxes = [] }) => {
  if (!imagePath) return null;

  return (
    <div className="relative rounded overflow-hidden bg-slate-900 border border-slate-300 flex items-center justify-center">
      <img
        src={imagePath}
        alt="Specimen output"
        className="w-full h-auto max-h-[400px] object-contain block"
      />

      {/* Render Object Detection Bounding Box Overlays */}
      {boundingBoxes && boundingBoxes.length > 0 && boundingBoxes.map((box, index) => {
        const left = `${box.x_min * 100}%`;
        const top = `${box.y_min * 100}%`;
        const width = `${(box.x_max - box.x_min) * 100}%`;
        const height = `${(box.y_max - box.y_min) * 100}%`;

        return (
          <div
            key={index}
            style={{ left, top, width, height }}
            className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-sm transition-all pointer-events-none"
          >
            <div className="absolute -top-6 left-0 bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm whitespace-nowrap">
              {box.label || 'Specimen'} ({Math.round(box.confidence * 100)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};

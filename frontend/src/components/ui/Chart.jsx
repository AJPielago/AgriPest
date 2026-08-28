import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

// Lightweight pure SVG Bar Chart Component
export const SimpleBarChart = ({ data = [], xKey = 'month', yKey = 'count', title }) => {
  const { lang, t } = useLanguage();
  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400 text-center py-6">{lang === 'tl' ? 'Walang nahanap na nakaraang datos ng pagsusuri.' : 'No time series data available.'}</div>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);

  return (
    <div className="w-full">
      {title && <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">{title}</h4>}
      <div className="flex items-end gap-3 h-32 pt-4 px-2 border-b border-l border-slate-200 dark:border-slate-800">
        {data.map((item, idx) => {
          const val = item[yKey] || 0;
          const heightPercent = Math.max((val / maxValue) * 100, 8);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
              <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                {val}
              </span>
              <div
                style={{ height: `${heightPercent}%` }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-t transition-all"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate w-full text-center mt-1">
                {item[xKey]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Lightweight pure SVG Donut / Pie Chart Component for Severity Breakdown
export const SimpleDonutChart = ({ data = {} }) => {
  const { lang, t } = useLanguage();
  const categories = [
    { label: t('critical'), value: data.Critical || 0, color: '#f43f5e' },
    { label: t('high'), value: data.High || 0, color: '#ef4444' },
    { label: t('moderate'), value: data.Moderate || 0, color: '#f59e0b' },
    { label: t('low'), value: data.Low || 0, color: '#10b981' }
  ];

  const total = categories.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="space-y-3">
      {total > 0 ? (
        <>
          <div className="h-3 w-full rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            {categories.map((c, i) => {
              if (c.value === 0) return null;
              const pct = (c.value / total) * 100;
              return (
                <div
                  key={i}
                  style={{ width: `${pct}%`, backgroundColor: c.color }}
                  title={`${c.label}: ${c.value} (${Math.round(pct)}%)`}
                  className="h-full transition-all"
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-slate-700 dark:text-slate-300 font-medium">{c.label}:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{c.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
          {lang === 'tl' ? 'Walang naitalang antas ng pinsala.' : 'No severity classification data recorded yet.'}
        </p>
      )}
    </div>
  );
};

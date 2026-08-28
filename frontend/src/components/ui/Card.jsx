import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action, noPadding = false }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md transition-colors ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-300 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950/80 rounded-t-md">
          <div>
            {title && <h3 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
};






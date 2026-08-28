import React from 'react';

export const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    neutral: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 font-bold",
    success: "bg-emerald-700 dark:bg-emerald-800 text-white border-emerald-800 dark:border-emerald-900 font-extrabold",
    warning: "bg-amber-400 dark:bg-amber-500 text-slate-950 border-amber-500 dark:border-amber-600 font-extrabold",
    danger: "bg-amber-700 dark:bg-amber-800 text-white border-amber-800 dark:border-amber-900 font-extrabold",
    critical: "bg-red-700 dark:bg-red-800 text-white border-red-900 font-black uppercase tracking-wider",
    info: "bg-sky-700 dark:bg-sky-800 text-white border-sky-900 font-extrabold"
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
};




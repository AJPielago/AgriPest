import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export const Alert = ({ children, type = 'info', title, className = '' }) => {
  const styles = {
    info: { border: 'border-l-4 border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-r border-t border-b border-sky-200 dark:border-sky-900', icon: Info, iconColor: 'text-sky-600 dark:text-sky-400' },
    success: { border: 'border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-r border-t border-b border-emerald-200 dark:border-emerald-900', icon: CheckCircle, iconColor: 'text-emerald-600 dark:text-emerald-400' },
    warning: { border: 'border-l-4 border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-r border-t border-b border-amber-200 dark:border-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600 dark:text-amber-400' },
    danger: { border: 'border-l-4 border-red-600 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-r border-t border-b border-red-200 dark:border-red-900', icon: XCircle, iconColor: 'text-red-600 dark:text-red-400' }
  };

  const current = styles[type];
  const IconComp = current.icon;

  return (
    <div className={`p-4 rounded-r-md ${current.border} flex items-start gap-3 ${className}`}>
      <IconComp className={`w-5 h-5 mt-0.5 flex-shrink-0 ${current.iconColor}`} />
      <div>
        {title && <h4 className="font-bold text-sm mb-0.5">{title}</h4>}
        <div className="text-sm leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  );
};

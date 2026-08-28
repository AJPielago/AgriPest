import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading...', size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-slate-500 gap-2">
      <Loader2 className={`${sizes[size]} animate-spin text-emerald-700`} />
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
    </div>
  );
};

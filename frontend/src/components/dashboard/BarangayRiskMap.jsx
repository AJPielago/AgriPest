import React from 'react';
import { MapPin, ShieldAlert, Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const BarangayRiskMap = ({ locationData = [] }) => {
  const { lang } = useLanguage();

  const maxCount = Math.max(...locationData.map(d => d.count || 1), 1);

  return (
    <Card 
      title={lang === 'tl' ? 'Pagsusuri sa Banta ng Peste Bawat Barangay' : 'Barangay Infestation Outbreak Heatmap'}
      subtitle={lang === 'tl' ? 'Pamamahagi ng mga kaso sa mga lokal na lugar' : 'Geospatial density of detected field pests'}
    >
      {locationData.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
          {lang === 'tl'
            ? 'Wala pang naitalang lokasyon ng bukid. Magdagdag ng lokasyon sa pagsusuri upang makita ang mapa ng banta.'
            : 'No tagged field locations yet. Add a field location when scanning to populate sector density.'}
        </p>
      ) : (
        <div className="space-y-3">
          {locationData.map((item, idx) => {
            const pct = Math.max((item.count / maxCount) * 100, 15);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {item.location}
                  </span>
                  <Badge variant={idx === 0 ? 'danger' : 'neutral'} className="text-[10px] font-mono">
                    {item.count} {lang === 'tl' ? 'kaso' : 'scans'}
                  </Badge>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

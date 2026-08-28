import React from 'react';
import { MapPin, ShieldAlert, Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const BarangayRiskMap = ({ locationData = [] }) => {
  const { lang } = useLanguage();

  const sampleData = locationData.length > 0 ? locationData : [
    { location: 'Brgy. San Jose', count: 5 },
    { location: 'Brgy. Poblacion', count: 3 },
    { location: 'Brgy. Sta. Maria', count: 2 },
    { location: 'Brgy. Maligaya', count: 1 }
  ];

  const maxCount = Math.max(...sampleData.map(d => d.count || 1), 1);

  return (
    <Card 
      title={lang === 'tl' ? 'Pagsusuri sa Banta ng Peste Bawat Barangay' : 'Barangay Infestation Outbreak Heatmap'}
      subtitle={lang === 'tl' ? 'Pamamahagi ng mga kaso sa mga lokal na lugar' : 'Geospatial density of detected field pests'}
    >
      <div className="space-y-3">
        {sampleData.map((item, idx) => {
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
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { detectionService } from '../services/detectionService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Notifications = () => {
  const { lang, t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await detectionService.getHistory();
        const items = data?.items || [];
        setHistory(items);
        setUnreadCount(items.filter(i => i.severity === 'Critical' || i.severity === 'High').length);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  if (loading) return <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang mga abiso..." : "Retrieving notification stream..."} size="lg" />;

  const criticalDetections = history.filter(h => h.severity === 'Critical' || h.severity === 'High');
  const normalDetections = history.filter(h => h.severity !== 'Critical' && h.severity !== 'High');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {t('notifications')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('notificationsSubtitle')}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-primary dark:text-primary-fixed hover:underline cursor-pointer"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Notifications Layout Grid */}
      <div className="space-y-6">
        
        {/* Urgent & Critical Alerts */}
        {criticalDetections.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-error uppercase tracking-wider">
              {lang === 'tl' ? 'Mataas na Priyoridad at Kritikal na Alerto' : 'High Priority & Critical Pest Alerts'}
            </h2>

            <div className="space-y-3">
              {criticalDetections.map(det => (
                <Link
                  key={det.id}
                  to={`/history?id=${det.id}`}
                  className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-error/40 p-4 shadow-sm relative overflow-hidden group hover:border-error transition-all flex flex-col gap-2 cursor-pointer block"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>

                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                        {det.detected_pest_name} ({det.severity})
                      </h3>
                      <span className="text-[11px] text-outline font-medium flex-shrink-0">
                        {new Date(det.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {lang === 'tl' ? 'Kailangan ng agarang aksyon sa ' : 'Immediate action required on '}
                      <span className="font-bold text-on-surface dark:text-inverse-on-surface">{det.crop_name || (lang === 'tl' ? 'Pananim' : 'Crop Host')}</span>. {det.recommended_action}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-primary dark:text-primary-fixed group-hover:underline">
                        {lang === 'tl' ? 'Suriin ang Ulat ng Pagsusuri' : 'Inspect Specimen Report'} →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Regular Field Updates */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-outline uppercase tracking-wider">
            {lang === 'tl' ? 'Daloy ng Kasaysayan ng Pagsusuri' : 'Diagnostic History Feed'}
          </h2>

          <div className="space-y-3">
            {normalDetections.slice(0, 5).map(det => (
              <Link
                key={det.id}
                to={`/history?id=${det.id}`}
                className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant dark:border-outline p-4 hover:border-primary transition-all flex gap-4 items-start cursor-pointer shadow-xs block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                      {det.detected_pest_name} {lang === 'tl' ? 'Pagtukoy' : 'Identification'}
                    </h3>
                    <span className="text-[11px] text-outline font-medium flex-shrink-0">
                      {new Date(det.created_at).toLocaleDateString(lang === 'tl' ? 'fil-PH' : undefined)}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {lang === 'tl' 
                      ? `Sinuring halaman sa ${det.crop_name || 'pananim'}. Katiyakan ng AI: ${Math.round(det.confidence_score * 100)}%.`
                      : `Specimen analyzed on ${det.crop_name || 'monitored crop'}. AI confidence score calculated at ${Math.round(det.confidence_score * 100)}%.`}
                  </p>
                </div>
              </Link>
            ))}

            {normalDetections.length === 0 && criticalDetections.length === 0 && (
              <div className="text-center py-12 border border-dashed border-outline-variant rounded-xl bg-surface-container-low/20">
                <p className="text-xs text-on-surface-variant font-semibold">{t('noNotifications')}</p>
              </div>
            )}
          </div>
        </section>

      </div>

    </div>
  );
};

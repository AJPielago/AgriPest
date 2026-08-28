import React, { useState, useEffect } from 'react';
import { pestService } from '../services/pestService';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const PestLibrary = () => {
  const { lang, t } = useLanguage();
  const [pests, setPests] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedPestIds, setExpandedPestIds] = useState({});

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      try {
        const [pestData, cropData] = await Promise.all([
          pestService.getPests(selectedCropFilter ? parseInt(selectedCropFilter) : null),
          cropService.getCrops()
        ]);
        setPests(pestData || []);
        setCrops(cropData || []);
      } catch (err) {
        console.error("Error loading pest library:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, [selectedCropFilter]);

  const toggleExpand = (id) => {
    setExpandedPestIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredPests = pests.filter(p => {
    const nameStr = (lang === 'tl' && p.name_tl ? p.name_tl : p.name).toLowerCase();
    const sciStr = (p.scientific_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return nameStr.includes(query) || sciStr.includes(query);
  });

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return (
          <span className="bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-error/20">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            <span>{lang === 'tl' ? 'Mataas' : level}</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-amber-300 dark:border-amber-800">
            <span className="material-symbols-outlined text-[13px]">report</span>
            <span>{lang === 'tl' ? 'Katamtaman' : 'Moderate'}</span>
          </span>
        );
      default:
        return (
          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-secondary/20">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>{lang === 'tl' ? 'Mababa' : 'Low'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {t('pestLibrary')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('pestLibrarySubtitle')}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-lg bg-surface-container-lowest dark:bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-low text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          <span>{lang === 'tl' ? 'I-print ang Catalog' : 'Print Reference'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low p-4 rounded-xl border border-outline-variant dark:border-outline shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined text-[20px] text-outline absolute left-3 top-2.5 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder={t('searchPestPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline text-on-surface dark:text-inverse-on-surface text-xs rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none font-medium"
          />
        </div>

        <div className="w-full md:w-60">
          <select
            value={selectedCropFilter}
            onChange={(e) => setSelectedCropFilter(e.target.value)}
            className="w-full bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline text-on-surface dark:text-inverse-on-surface text-xs rounded-lg px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
          >
            <option value="">{t('filterByCrop')}</option>
            {crops.map(c => (
              <option key={c.id} value={c.id}>{lang === 'tl' && c.name_tl ? c.name_tl : c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* High-Density Directory Cards */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner label={lang === 'tl' ? "Sinasaliksik ang catalog ng mga peste..." : "Querying pest species catalog..."} />
        </div>
      ) : filteredPests.length > 0 ? (
        <div className="space-y-3">
          {filteredPests.map((pest) => {
            const isExpanded = !!expandedPestIds[pest.id];
            return (
              <div
                key={pest.id}
                className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl overflow-hidden transition-colors shadow-xs"
              >
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(pest.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                      <span className="material-symbols-outlined text-[22px]">bug_report</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                          {lang === 'tl' && pest.name_tl ? pest.name_tl : pest.name}
                        </h3>
                        {pest.scientific_name && (
                          <span className="text-xs text-on-surface-variant italic font-serif hidden sm:inline">
                            ({pest.scientific_name})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                        {(lang === 'tl' && pest.description_tl ? pest.description_tl : pest.description) || (lang === 'tl' ? 'Walang paglalarawan sa catalog.' : 'No catalog description recorded.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {getSeverityBadge(pest.severity_default)}
                    <span className="material-symbols-outlined text-outline text-[20px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details & IPM Protocol Tabs */}
                {isExpanded && (
                  <div className="p-5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container/40 space-y-4 text-xs">
                    {pest.scientific_name && (
                      <p className="text-xs text-on-surface-variant italic font-serif sm:hidden">
                        Scientific: {pest.scientific_name}
                      </p>
                    )}

                    <div className="space-y-1">
                      <span className="font-bold text-outline uppercase tracking-wider text-[11px] block">
                        {lang === 'tl' ? 'Paglalarawan at Katangian sa Bukid' : 'Description & Field Characteristics'}
                      </span>
                      <p className="text-on-surface dark:text-inverse-on-surface leading-relaxed font-medium">
                        {(lang === 'tl' && pest.description_tl ? pest.description_tl : pest.description) || (lang === 'tl' ? 'Walang paglalarawan.' : 'No description recorded.')}
                      </p>
                    </div>

                    {/* Symptoms Box */}
                    {(pest.symptoms || pest.symptoms_tl) && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-lg text-xs space-y-1">
                        <span className="font-bold block text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">symptoms</span>
                          <span>{t('symptoms')}</span>
                        </span>
                        <p className="text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                          {lang === 'tl' && pest.symptoms_tl ? pest.symptoms_tl : pest.symptoms}
                        </p>
                      </div>
                    )}

                    {/* Recommended Management Protocols */}
                    {pest.recommendations && pest.recommendations.length > 0 && (
                      <div className="space-y-2.5 pt-2 border-t border-outline-variant/60">
                        <span className="font-bold text-outline uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                          <span>{lang === 'tl' ? 'Mga Protokol sa Pamamahala ng Peste (IPM)' : 'Integrated Pest Management (IPM) Protocols'}</span>
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pest.recommendations.map((rec) => (
                            <div key={rec.id} className="p-3.5 bg-surface-container-lowest dark:bg-surface-container-low rounded-lg border border-outline-variant text-xs space-y-1 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                                  {lang === 'tl' && rec.action_title_tl ? rec.action_title_tl : rec.action_title}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold text-[10px]">
                                  {rec.management_type}
                                </span>
                              </div>
                              <p className="text-on-surface-variant text-xs leading-relaxed font-medium">
                                {lang === 'tl' && rec.description_tl ? rec.description_tl : rec.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-container-lowest dark:bg-surface-container-low p-8 rounded-xl border border-outline-variant text-center text-xs text-on-surface-variant">
          {t('noPests')}
        </div>
      )}

    </div>
  );
};

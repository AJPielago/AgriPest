import React, { useState, useEffect } from 'react';
import { diseaseService } from '../services/diseaseService';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const DiseaseLibrary = () => {
  const { lang, t } = useLanguage();
  const [diseases, setDiseases] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState('');
  const [selectedPathogenFilter, setSelectedPathogenFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedDiseaseIds, setExpandedDiseaseIds] = useState({});

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      try {
        const [diseaseData, cropData] = await Promise.all([
          diseaseService.getDiseases(
            selectedCropFilter ? parseInt(selectedCropFilter) : null,
            selectedPathogenFilter || null
          ),
          cropService.getCrops()
        ]);
        setDiseases(diseaseData || []);
        setCrops(cropData || []);
      } catch (err) {
        console.error("Error loading disease catalog:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, [selectedCropFilter, selectedPathogenFilter]);

  const toggleExpand = (id) => {
    setExpandedDiseaseIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredDiseases = diseases.filter(d => {
    const nameStr = (lang === 'tl' && d.name_tl ? d.name_tl : d.name).toLowerCase();
    const sciStr = (d.scientific_name || '').toLowerCase();
    const pathStr = (d.pathogen_type || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return nameStr.includes(query) || sciStr.includes(query) || pathStr.includes(query);
  });

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return (
          <span className="bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center gap-1 border border-error/20">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            <span>{lang === 'tl' ? 'Mataas na Banta' : level}</span>
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

  const getPathogenBadge = (type) => {
    const tLower = (type || 'fungal').toLowerCase();
    if (tLower.includes('fung')) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-label-sm text-[10px] font-bold uppercase tracking-wider">
          {lang === 'tl' ? 'Fungus' : 'Fungal'}
        </span>
      );
    }
    if (tLower.includes('bact')) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-label-sm text-[10px] font-bold uppercase tracking-wider">
          {lang === 'tl' ? 'Bakterya' : 'Bacterial'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-label-sm text-[10px] font-bold uppercase tracking-wider">
        {type || 'Viral'}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed flex items-center gap-2.5">
            <span className="material-symbols-outlined text-3xl text-primary">coronavirus</span>
            <span>{t('diseaseLibrary')}</span>
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('diseaseLibrarySubtitle')}
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
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined text-[20px] text-outline absolute left-3 top-2.5 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder={t('searchDiseasePlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline text-on-surface dark:text-inverse-on-surface text-xs rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none font-medium"
          />
        </div>

        {/* Pathogen Filter */}
        <div className="w-full md:w-52">
          <select
            value={selectedPathogenFilter}
            onChange={(e) => setSelectedPathogenFilter(e.target.value)}
            className="w-full bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline text-on-surface dark:text-inverse-on-surface text-xs rounded-lg px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
          >
            <option value="">{t('allPathogens')}</option>
            <option value="Fungal">{t('fungal')}</option>
            <option value="Bacterial">{t('bacterial')}</option>
            <option value="Viral">{t('viral')}</option>
          </select>
        </div>

        {/* Crop Filter */}
        <div className="w-full md:w-56">
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

      {/* Directory Cards */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner label={lang === 'tl' ? "Sinasaliksik ang catalog ng mga sakit sa pananim..." : "Querying crop disease catalog..."} />
        </div>
      ) : filteredDiseases.length > 0 ? (
        <div className="space-y-3">
          {filteredDiseases.map((disease) => {
            const isExpanded = !!expandedDiseaseIds[disease.id];
            return (
              <div
                key={disease.id}
                className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl overflow-hidden transition-colors shadow-xs"
              >
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(disease.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold flex-shrink-0">
                      <span className="material-symbols-outlined text-[22px]">coronavirus</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
                          {lang === 'tl' && disease.name_tl ? disease.name_tl : disease.name}
                        </h3>
                        {disease.scientific_name && (
                          <span className="text-xs text-on-surface-variant italic font-serif hidden sm:inline">
                            ({disease.scientific_name})
                          </span>
                        )}
                        {getPathogenBadge(disease.pathogen_type)}
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                        {(lang === 'tl' && disease.description_tl ? disease.description_tl : disease.description) || (lang === 'tl' ? 'Walang paglalarawan sa catalog.' : 'No catalog description recorded.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {getSeverityBadge(disease.severity_default)}
                    <span className="material-symbols-outlined text-outline text-[20px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details & Management Protocol */}
                {isExpanded && (
                  <div className="p-5 border-t border-outline-variant dark:border-outline bg-surface-bright dark:bg-surface-container/40 space-y-4 text-xs">
                    {disease.scientific_name && (
                      <p className="text-xs text-on-surface-variant italic font-serif sm:hidden">
                        Scientific: {disease.scientific_name}
                      </p>
                    )}

                    <div className="space-y-1">
                      <span className="font-bold text-outline uppercase tracking-wider text-[11px] block">
                        {lang === 'tl' ? 'Paglalarawan at Katangian ng Sakit' : 'Pathogen Description & Field Characteristics'}
                      </span>
                      <p className="text-on-surface dark:text-inverse-on-surface leading-relaxed font-medium">
                        {(lang === 'tl' && disease.description_tl ? disease.description_tl : disease.description) || (lang === 'tl' ? 'Walang paglalarawan.' : 'No description recorded.')}
                      </p>
                    </div>

                    {/* Symptoms Box */}
                    {(disease.symptoms || disease.symptoms_tl) && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-lg text-xs space-y-1">
                        <span className="font-bold block text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">symptoms</span>
                          <span>{t('diseaseCharacteristics')}</span>
                        </span>
                        <p className="text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                          {lang === 'tl' && disease.symptoms_tl ? disease.symptoms_tl : disease.symptoms}
                        </p>
                      </div>
                    )}

                    {/* Recommended Management Protocols */}
                    {disease.recommendations && disease.recommendations.length > 0 && (
                      <div className="space-y-2.5 pt-2 border-t border-outline-variant/60">
                        <span className="font-bold text-outline uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">healing</span>
                          <span>{t('diseaseManagementGuidelines')}</span>
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {disease.recommendations.map((rec) => (
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
          {t('noDiseasesFound')}
        </div>
      )}

    </div>
  );
};


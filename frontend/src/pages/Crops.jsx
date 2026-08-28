import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { useLanguage } from '../context/LanguageContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';

export const Crops = () => {
  const { lang, t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropScientific, setNewCropScientific] = useState('');
  const [newCropDesc, setNewCropDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCrops = async () => {
    try {
      const data = await cropService.getCrops();
      setCrops(data || []);
    } catch (err) {
      console.error("Error fetching crops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const handleCreateCrop = async (e) => {
    e.preventDefault();
    if (!newCropName.trim()) return;
    setSubmitting(true);
    try {
      await cropService.createCrop({
        name: newCropName,
        scientific_name: newCropScientific,
        description: newCropDesc
      });
      setIsAddModalOpen(false);
      setNewCropName('');
      setNewCropScientific('');
      setNewCropDesc('');
      fetchCrops();
    } catch (err) {
      alert((lang === 'tl' ? "Nabigong magdagdag ng pananim: " : "Failed to add crop: ") + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCrops = crops.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.scientific_name && c.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCropImage = (cropName) => {
    const name = cropName.toLowerCase();
    if (name.includes('cabbage')) {
      return 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('corn')) {
      return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {t('crops')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('cropsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined text-[20px] text-outline absolute left-3 top-2.5 pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder={t('searchCropsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest dark:bg-surface-container border border-outline-variant text-on-surface dark:text-inverse-on-surface text-xs rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none font-medium"
            />
          </div>

          {/* Add Crop Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer whitespace-nowrap"
          >
            <span>{t('addCrop')}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid layout for Crop Cards */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner label={lang === 'tl' ? "Ikinakarga ang mga pananim..." : "Loading registered crops..."} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrops.map(crop => {
            const isCorn = crop.name.toLowerCase().includes('corn');
            return (
              <Link
                key={crop.id}
                to={`/crops/${crop.id}`}
                className={`group bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border overflow-hidden hover:border-primary transition-all duration-300 flex flex-col shadow-sm cursor-pointer ${
                  isCorn ? 'border-l-[4px] border-l-error border-outline-variant' : 'border-outline-variant'
                }`}
              >
                {/* Image Cover */}
                <div className="h-48 relative overflow-hidden bg-slate-900">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
                  <img
                    src={crop.image_url || getCropImage(crop.name)}
                    alt={crop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {isCorn && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="px-2.5 py-1 bg-error text-white font-label-sm text-[11px] font-bold rounded-full shadow-sm">
                        {lang === 'tl' ? 'Alerto' : 'Alert'}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 z-20">
                    <h2 className="font-headline-md text-xl font-bold text-white">
                      {lang === 'tl' && crop.name_tl ? crop.name_tl : crop.name}
                    </h2>
                    {crop.scientific_name && (
                      <p className="text-xs text-white/80 italic font-serif mt-0.5">{crop.scientific_name}</p>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-5 flex flex-col gap-3 flex-1 justify-between bg-surface-container-lowest dark:bg-surface-container-low">
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/50">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Panahon ng Pagtatanim' : 'Planting Season'}
                      </span>
                      <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                        {lang === 'tl' ? 'Buong Taon' : 'Year-Round'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/50">
                      <span className="text-on-surface-variant font-medium">
                        {lang === 'tl' ? 'Kalagayan ng Kalusugan' : 'Health Status'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold inline-flex items-center ${
                        isCorn
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}>
                        <span>{isCorn ? t('needsAttention') : t('healthy')}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-on-surface-variant font-medium">
                        Telemetry
                      </span>
                      <span className="font-bold text-secondary dark:text-secondary-fixed flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> {lang === 'tl' ? 'Aktibo' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <span className="text-xs font-bold text-primary dark:text-primary-fixed group-hover:underline">
                      {t('viewCropDetails')} →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Add New Crop Placeholder Card */}
          <div
            onClick={() => setIsAddModalOpen(true)}
            className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl bg-surface-container-low/40 dark:bg-surface-container/20 flex flex-col items-center justify-center p-8 min-h-[300px] transition-all cursor-pointer group shadow-xs text-center"
          >
            <h3 className="font-title-lg text-sm font-bold text-on-surface dark:text-inverse-on-surface mb-1">
              + {t('addCrop')}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-[200px]">
              {lang === 'tl' ? 'Magtakda ng bagong uri ng pananim at mga kaugnay na peste.' : 'Set up catalog profile and pest association for a new species.'}
            </p>
          </div>
        </div>
      )}

      {/* Add Crop Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('addCrop')}
      >
        <form onSubmit={handleCreateCrop} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
              {t('cropNameLabel')} *
            </label>
            <input
              type="text"
              required
              value={newCropName}
              onChange={(e) => setNewCropName(e.target.value)}
              placeholder="e.g. Cabbage, Corn, Tomato"
              className="w-full bg-surface dark:bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2 text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
              {t('scientificNameLabel')}
            </label>
            <input
              type="text"
              value={newCropScientific}
              onChange={(e) => setNewCropScientific(e.target.value)}
              placeholder="e.g. Brassica oleracea var. capitata"
              className="w-full bg-surface dark:bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2 text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
              {t('cropDescLabel')}
            </label>
            <textarea
              rows={3}
              value={newCropDesc}
              onChange={(e) => setNewCropDesc(e.target.value)}
              placeholder={lang === 'tl' ? "Maglagay ng mga katangian ng pananim o karaniwang peste..." : "Provide crop characteristics, typical pests, or growth notes..."}
              className="w-full bg-surface dark:bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2 text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-container transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? (lang === 'tl' ? 'Nagse-save...' : 'Saving...') : (lang === 'tl' ? 'I-save ang Pananim' : 'Save Crop')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

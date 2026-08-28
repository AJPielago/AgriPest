import React, { useState, useEffect } from 'react';
import { cropService } from '../../services/cropService';
import { Sprout, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const ManageCrops = () => {
  const { lang, t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const data = await cropService.getAllCrops();
      setCrops(data);
    } catch (err) {
      console.error("Error loading crops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const handleOpenModal = (crop = null) => {
    setError('');
    if (crop) {
      setEditingCrop(crop);
      setName(crop.name);
      setScientificName(crop.scientific_name || '');
      setDescription(crop.description || '');
      setStatus(crop.status || 'active');
    } else {
      setEditingCrop(null);
      setName('');
      setScientificName('');
      setDescription('');
      setStatus('active');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name,
        scientific_name: scientificName,
        description,
        status
      };
      if (editingCrop) {
        await cropService.updateCrop(editingCrop.id, payload);
      } else {
        await cropService.createCrop(payload);
      }
      setIsModalOpen(false);
      fetchCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save crop record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this crop record permanently?")) return;
    try {
      await cropService.deleteCrop(id);
      fetchCrops();
    } catch (err) {
      alert("Failed to delete crop.");
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Workstation Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700">
              {lang === 'tl' ? 'KATALOG NG MGA PANANIM' : 'CROP SPECIES DIRECTORY'}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Sprout className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {t('cropManagement')}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {t('realtimeMonitoring')}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenModal(null)}>
          {t('addCrop')}
        </Button>
      </div>

      {/* Table Card */}
      <Card title={t('cropManagement')} subtitle={`Total Target Species Registered: ${crops.length}`}>
        {loading ? (
          <LoadingSpinner label={t('analyzingImage')} />
        ) : crops.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-sans">
                  <th className="py-2.5 px-3">{t('hostCrop')}</th>
                  <th className="py-2.5 px-3">{t('scientificName')}</th>
                  <th className="py-2.5 px-3">{t('symptoms')}</th>
                  <th className="py-2.5 px-3">{t('status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-xs font-sans">
                {crops.map((crop) => (
                  <tr key={crop.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {lang === 'tl' && crop.name_tl ? crop.name_tl : crop.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 italic font-mono font-medium">{crop.scientific_name || 'N/A'}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate font-medium">
                      {(lang === 'tl' && crop.description_tl ? crop.description_tl : crop.description) || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={crop.status === 'active' ? 'success' : 'neutral'} className="text-xs">
                        {crop.status === 'active' ? t('activeTarget') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(crop)}
                          aria-label={`Edit crop ${crop.name}`}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Edit Crop"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(crop.id)}
                          aria-label={`Delete crop ${crop.name}`}
                          className="p-1.5 text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Delete Crop"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-6 text-xs">{t('noCrops')}</p>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCrop ? `${t('edit')}: ${editingCrop.name}` : t('addCrop')}
      >
        {error && <Alert type="danger" className="mb-3">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('hostCrop')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corn, Rice, Onion, Cabbage"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('scientificName')}
            </label>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              placeholder="e.g. Zea mays"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('symptoms')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description details..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t('status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            >
              <option value="active">{t('activeTarget')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-300 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : t('save')}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};


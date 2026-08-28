import React, { useState, useEffect } from 'react';
import { pestService } from '../../services/pestService';
import { cropService } from '../../services/cropService';
import { Bug, Plus, Edit2, Trash2, Link as LinkIcon, ShieldCheck, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const ManagePests = () => {
  const { lang, t } = useLanguage();
  const [pests, setPests] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isPestModalOpen, setIsPestModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'protocols' | 'crops'
  
  const [selectedPest, setSelectedPest] = useState(null);
  
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severityDefault, setSeverityDefault] = useState('Moderate');

  const [actionTitle, setActionTitle] = useState('');
  const [recDescription, setRecDescription] = useState('');
  const [managementType, setManagementType] = useState('Preventative');

  const [linkCropId, setLinkCropId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPestsAndCrops = async () => {
    setLoading(true);
    try {
      const [pestsData, cropsData] = await Promise.all([
        pestService.getPests(),
        cropService.getAllCrops()
      ]);
      setPests(pestsData || []);
      setCrops(cropsData || []);
    } catch (err) {
      console.error("Error loading pests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPestsAndCrops();
  }, []);

  const handleOpenPestModal = (pest = null) => {
    setError('');
    setActiveTab('info');
    if (pest) {
      setSelectedPest(pest);
      setName(pest.name);
      setScientificName(pest.scientific_name || '');
      setDescription(pest.description || '');
      setSymptoms(pest.symptoms || '');
      setSeverityDefault(pest.severity_default || 'Moderate');
    } else {
      setSelectedPest(null);
      setName('');
      setScientificName('');
      setDescription('');
      setSymptoms('');
      setSeverityDefault('Moderate');
    }
    setIsPestModalOpen(true);
  };

  const handlePestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name,
        scientific_name: scientificName,
        description,
        symptoms,
        severity_default: severityDefault
      };
      if (selectedPest) {
        await pestService.updatePest(selectedPest.id, payload);
      } else {
        await pestService.createPest(payload);
      }
      setIsPestModalOpen(false);
      fetchPestsAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save pest record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRecModal = (pest) => {
    setError('');
    setSelectedPest(pest);
    setActionTitle('');
    setRecDescription('');
    setManagementType('Preventative');
    setIsRecModalOpen(true);
  };

  const handleRecSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await pestService.addRecommendation(selectedPest.id, {
        pest_id: selectedPest.id,
        action_title: actionTitle,
        description: recDescription,
        management_type: managementType
      });
      setIsRecModalOpen(false);
      fetchPestsAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLinkModal = (pest) => {
    setError('');
    setSelectedPest(pest);
    setLinkCropId(crops[0]?.id || '');
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await pestService.linkCrop(parseInt(linkCropId), selectedPest.id, "Host link");
      setIsLinkModalOpen(false);
      fetchPestsAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to link crop.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePest = async (id) => {
    if (!window.confirm("Delete pest record permanently?")) return;
    try {
      await pestService.deletePest(id);
      fetchPestsAndCrops();
    } catch (err) {
      alert("Failed to delete pest.");
    }
  };

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return <Badge variant="critical">{t('critical')}</Badge>;
      case 'high': return <Badge variant="danger">{t('high')}</Badge>;
      case 'moderate': return <Badge variant="warning">{t('moderate')}</Badge>;
      default: return <Badge variant="success">{t('low')}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Workstation Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700">
              {lang === 'tl' ? 'MATRIX NG MGA PESTE' : 'PEST KNOWLEDGE MATRIX'}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Bug className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            {t('pestRulesEditor')}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {t('realtimeMonitoring')}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenPestModal(null)}>
          {t('addPest')}
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label={t('analyzingImage')} size="lg" />
      ) : pests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pests.map((pest) => (
            <Card key={pest.id} className="space-y-3">
              
              <div className="flex items-start justify-between gap-3 border-b border-slate-300 dark:border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lang === 'tl' && pest.name_tl ? pest.name_tl : pest.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic font-mono">{pest.scientific_name || 'N/A'}</p>
                </div>

                <div className="flex items-center gap-1">
                  {getSeverityBadge(pest.severity_default)}
                  <button
                    onClick={() => handleOpenPestModal(pest)}
                    aria-label={`Edit ${pest.name}`}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                    title="Edit Pest"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePest(pest.id)}
                    aria-label={`Delete ${pest.name}`}
                    className="p-1.5 text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                    title="Delete Pest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {(lang === 'tl' && pest.description_tl ? pest.description_tl : pest.description) || 'No description'}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-300 dark:border-slate-800">
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => handleOpenRecModal(pest)}>
                  {t('addRecommendation')}
                </Button>
                <Button variant="outline" size="sm" icon={LinkIcon} onClick={() => handleOpenLinkModal(pest)}>
                  {t('linkCrop')}
                </Button>
              </div>

              {pest.recommendations && pest.recommendations.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-300 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('treatmentProtocols')}:</span>
                  {pest.recommendations.map((rec) => (
                    <div key={rec.id} className="p-2 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-300 dark:border-slate-800 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {lang === 'tl' && rec.action_title_tl ? rec.action_title_tl : rec.action_title}
                        </span>
                        <Badge variant="neutral" className="text-xs font-mono">{rec.management_type}</Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed font-medium">
                        {lang === 'tl' && rec.description_tl ? rec.description_tl : rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">{t('noPests')}</Card>
      )}

      {/* Tabbed Pest Inspector Modal */}
      <Modal
        isOpen={isPestModalOpen}
        onClose={() => setIsPestModalOpen(false)}
        title={selectedPest ? `${t('edit')}: ${selectedPest.name}` : t('addPest')}
      >
        {error && <Alert type="danger" className="mb-3">{error}</Alert>}

        {/* Segmented Tab Controls */}
        <div className="flex border-b border-slate-300 dark:border-slate-800 mb-4 font-sans text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'info'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. Species Info & Symptoms
          </button>
          {selectedPest && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('protocols')}
                className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors ${
                  activeTab === 'protocols'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2. Treatment Protocols ({selectedPest.recommendations?.length || 0})
              </button>
            </>
          )}
        </div>

        {activeTab === 'info' ? (
          <form onSubmit={handlePestSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('activePests')} *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fall Armyworm"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('scientificName')}</label>
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="e.g. Spodoptera frugiperda"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('symptoms')}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Field description and symptoms..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('severity')}</label>
              <select
                value={severityDefault}
                onChange={(e) => setSeverityDefault(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
              >
                <option value="Low">{t('low')}</option>
                <option value="Moderate">{t('moderate')}</option>
                <option value="High">{t('high')}</option>
                <option value="Critical">{t('critical')}</option>
              </select>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-300 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsPestModalOpen(false)}>{t('cancel')}</Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? 'Saving...' : t('save')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Recorded Protocols</span>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => { setIsPestModalOpen(false); handleOpenRecModal(selectedPest); }}>
                {t('addRecommendation')}
              </Button>
            </div>

            {selectedPest?.recommendations && selectedPest.recommendations.length > 0 ? (
              <div className="space-y-2">
                {selectedPest.recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-300 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{rec.action_title}</span>
                      <Badge variant="neutral" className="text-xs font-mono">{rec.management_type}</Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">{rec.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No treatment protocols attached to this species.</p>
            )}

            <div className="pt-3 flex justify-end border-t border-slate-300 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsPestModalOpen(false)}>{t('cancel')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Recommendation Modal */}
      <Modal
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        title={`${t('addRecommendation')}: ${selectedPest?.name}`}
      >
        {error && <Alert type="danger" className="mb-3">{error}</Alert>}
        <form onSubmit={handleRecSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('recommendedAction')} *</label>
            <input
              type="text"
              required
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              placeholder="e.g. Biological Control Application"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('symptoms')} *</label>
            <textarea
              rows={3}
              required
              value={recDescription}
              onChange={(e) => setRecDescription(e.target.value)}
              placeholder="Remediation steps..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-300 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsRecModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Crop Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`${t('linkCrop')}: ${selectedPest?.name}`}
      >
        {error && <Alert type="danger" className="mb-3">{error}</Alert>}
        <form onSubmit={handleLinkSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('hostCrop')} *</label>
            <select
              value={linkCropId}
              onChange={(e) => setLinkCropId(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            >
              {crops.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'tl' && c.name_tl ? c.name_tl : c.name} ({c.scientific_name})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-300 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsLinkModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Linking...' : t('linkCrop')}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};


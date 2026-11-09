import React, { useState, useEffect } from 'react';
import { diseaseService } from '../../services/diseaseService';
import { cropService } from '../../services/cropService';
import { Plus, Edit2, Trash2, Link as LinkIcon, ShieldCheck, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const ManageDiseases = () => {
  const { lang, t } = useLanguage();
  const [diseases, setDiseases] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'protocols' | 'crops'
  
  const [selectedDisease, setSelectedDisease] = useState(null);
  
  const [name, setName] = useState('');
  const [nameTl, setNameTl] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [pathogenType, setPathogenType] = useState('Fungal');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severityDefault, setSeverityDefault] = useState('Moderate');

  const [actionTitle, setActionTitle] = useState('');
  const [actionTitleTl, setActionTitleTl] = useState('');
  const [recDescription, setRecDescription] = useState('');
  const [managementType, setManagementType] = useState('Chemical');

  const [linkCropId, setLinkCropId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDiseasesAndCrops = async () => {
    setLoading(true);
    try {
      const [diseasesData, cropsData] = await Promise.all([
        diseaseService.getDiseases(),
        cropService.getCrops()
      ]);
      setDiseases(diseasesData || []);
      setCrops(cropsData || []);
    } catch (err) {
      console.error("Error loading diseases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiseasesAndCrops();
  }, []);

  const handleOpenDiseaseModal = (disease = null) => {
    setError('');
    setActiveTab('info');
    if (disease) {
      setSelectedDisease(disease);
      setName(disease.name);
      setNameTl(disease.name_tl || '');
      setScientificName(disease.scientific_name || '');
      setPathogenType(disease.pathogen_type || 'Fungal');
      setDescription(disease.description || '');
      setSymptoms(disease.symptoms || '');
      setSeverityDefault(disease.severity_default || 'Moderate');
    } else {
      setSelectedDisease(null);
      setName('');
      setNameTl('');
      setScientificName('');
      setPathogenType('Fungal');
      setDescription('');
      setSymptoms('');
      setSeverityDefault('Moderate');
    }
    setIsDiseaseModalOpen(true);
  };

  const handleDiseaseSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name,
        name_tl: nameTl || null,
        scientific_name: scientificName,
        pathogen_type: pathogenType,
        description,
        symptoms,
        severity_default: severityDefault
      };
      if (selectedDisease) {
        await diseaseService.updateDisease(selectedDisease.id, payload);
      } else {
        await diseaseService.createDisease(payload);
      }
      setIsDiseaseModalOpen(false);
      fetchDiseasesAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save disease record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRecModal = (disease) => {
    setError('');
    setSelectedDisease(disease);
    setActionTitle('');
    setActionTitleTl('');
    setRecDescription('');
    setManagementType('Chemical');
    setIsRecModalOpen(true);
  };

  const handleRecSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await diseaseService.addRecommendation(selectedDisease.id, {
        action_title: actionTitle,
        action_title_tl: actionTitleTl || null,
        description: recDescription,
        management_type: managementType
      });
      setIsRecModalOpen(false);
      fetchDiseasesAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add disease recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLinkModal = (disease) => {
    setError('');
    setSelectedDisease(disease);
    setLinkCropId(crops[0]?.id?.toString() || '');
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkCropId) return;
    setError('');
    setSubmitting(true);
    try {
      await diseaseService.linkCrop(parseInt(linkCropId), selectedDisease.id, 'Primary susceptible host crop');
      setIsLinkModalOpen(false);
      fetchDiseasesAndCrops();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to link crop to disease.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete disease species '${name}'?`)) return;
    try {
      await diseaseService.deleteDisease(id);
      fetchDiseasesAndCrops();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete disease species.');
    }
  };

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return <Badge variant="danger">{level}</Badge>;
      case 'moderate':
        return <Badge variant="warning">{level}</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-primary">biotech</span>
            <span>Crop Disease Management & Rules</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maintain crop disease definitions, pathogen taxonomy, symptoms, and treatment protocols.
          </p>
        </div>

        <Button onClick={() => handleOpenDiseaseModal()} icon={Plus}>
          Register Disease
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      {loading ? (
        <div className="py-12">
          <LoadingSpinner label="Loading disease catalog..." />
        </div>
      ) : diseases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diseases.map((disease) => (
            <Card key={disease.id} className="flex flex-col justify-between overflow-hidden hover:border-primary/40 transition-all">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {disease.name}
                    </h3>
                    {disease.name_tl && (
                      <p className="text-xs text-primary font-medium">{disease.name_tl}</p>
                    )}
                    {disease.scientific_name && (
                      <p className="text-xs text-slate-500 italic font-serif mt-0.5">
                        {disease.scientific_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getSeverityBadge(disease.severity_default)}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {disease.pathogen_type || 'Fungal'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {disease.description || 'No description provided.'}
                </p>

                {disease.symptoms && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold block text-[10px] uppercase">Symptoms</span>
                    <p className="line-clamp-2 mt-0.5">{disease.symptoms}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{disease.recommendations?.length || 0} Treatments / Protocols</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenRecModal(disease)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Add IDM Treatment Protocol"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Protocol</span>
                  </button>
                  <button
                    onClick={() => handleOpenLinkModal(disease)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Link Host Crop"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Host Crop</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDiseaseModal(disease)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(disease.id, disease.name)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500 text-sm">
          No disease species registered. Click "Register Disease" to add one.
        </Card>
      )}

      {/* Disease Modal (Create / Edit) */}
      <Modal
        isOpen={isDiseaseModalOpen}
        onClose={() => setIsDiseaseModalOpen(false)}
        title={selectedDisease ? `Edit Disease: ${selectedDisease.name}` : "Register New Disease Species"}
      >
        <form onSubmit={handleDiseaseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Common Disease Name (English) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Downy Mildew of Lettuce"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Local Name (Tagalog)
            </label>
            <input
              type="text"
              value={nameTl}
              onChange={(e) => setNameTl(e.target.value)}
              placeholder="e.g. Blight sa Dahon ng Mais"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Scientific / Pathogen Name
              </label>
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="e.g. Exserohilum turcicum"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Pathogen Classification
              </label>
              <select
                value={pathogenType}
                onChange={(e) => setPathogenType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none font-semibold"
              >
                <option value="Fungal">Fungal (Fungi)</option>
                <option value="Bacterial">Bacterial (Bacteria)</option>
                <option value="Viral">Viral (Virus)</option>
                <option value="Nematode">Nematode</option>
                <option value="Oomycete">Oomycete / Water Mold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Default Threat Severity
            </label>
            <select
              value={severityDefault}
              onChange={(e) => setSeverityDefault(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none font-semibold"
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Disease Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Biology, spread vectors, and environmental conditions..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Diagnostic Symptoms & Foliar Lesions
            </label>
            <textarea
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Visual cues (lesion shape, halo, color, spore clusters)..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsDiseaseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Disease'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recommendation Modal */}
      <Modal
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        title={`Add Treatment Protocol: ${selectedDisease?.name}`}
      >
        <form onSubmit={handleRecSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Action Title (English) *
            </label>
            <input
              type="text"
              required
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              placeholder="e.g. Foliar Fungicide Spray"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Action Title (Tagalog)
            </label>
            <input
              type="text"
              value={actionTitleTl}
              onChange={(e) => setActionTitleTl(e.target.value)}
              placeholder="e.g. Pag-spray ng Fungicide"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Management Category
            </label>
            <select
              value={managementType}
              onChange={(e) => setManagementType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none font-semibold"
            >
              <option value="Chemical">Chemical (Fungicide / Bactericide)</option>
              <option value="Cultural">Cultural (Sanitation, Crop Rotation, Water)</option>
              <option value="Biological">Biological (Antagonistic Organisms)</option>
              <option value="Preventative">Preventative (Resistant Hybrids, Clean Seeds)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Action Protocol Description *
            </label>
            <textarea
              rows={4}
              required
              value={recDescription}
              onChange={(e) => setRecDescription(e.target.value)}
              placeholder="Specific dosage, timing, spray intervals, and field safety instructions..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsRecModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Protocol'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Crop Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Associate Host Crop: ${selectedDisease?.name}`}
      >
        <form onSubmit={handleLinkSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              Select Susceptible Host Crop *
            </label>
            <select
              value={linkCropId}
              onChange={(e) => setLinkCropId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-none font-semibold"
            >
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} ({crop.scientific_name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Linking...' : 'Link Crop'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


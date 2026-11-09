import api from './api';

export const diseaseService = {
  getDiseases: async (cropIdOrOptions = null, pathogenType = null) => {
    const params = {};
    if (typeof cropIdOrOptions === 'object' && cropIdOrOptions !== null) {
      if (cropIdOrOptions.cropId) params.crop_id = cropIdOrOptions.cropId;
      if (cropIdOrOptions.crop_id) params.crop_id = cropIdOrOptions.crop_id;
      if (cropIdOrOptions.pathogenType) params.pathogen_type = cropIdOrOptions.pathogenType;
      if (cropIdOrOptions.pathogen_type) params.pathogen_type = cropIdOrOptions.pathogen_type;
    } else {
      if (cropIdOrOptions) params.crop_id = cropIdOrOptions;
      if (pathogenType) params.pathogen_type = pathogenType;
    }
    const response = await api.get('/diseases', { params });
    return response.data;
  },

  getDiseaseById: async (id) => {
    const response = await api.get(`/diseases/${id}`);
    return response.data;
  },

  createDisease: async (diseaseData) => {
    const response = await api.post('/diseases', diseaseData);
    return response.data;
  },

  updateDisease: async (id, diseaseData) => {
    const response = await api.put(`/diseases/${id}`, diseaseData);
    return response.data;
  },

  deleteDisease: async (id) => {
    const response = await api.delete(`/diseases/${id}`);
    return response.data;
  },

  linkCrop: async (cropId, diseaseId, notes = '') => {
    const response = await api.post('/diseases/link-crop', {
      crop_id: cropId,
      disease_id: diseaseId,
      notes
    });
    return response.data;
  },

  addRecommendation: async (diseaseId, recData) => {
    const response = await api.post(`/diseases/${diseaseId}/recommendations`, recData);
    return response.data;
  }
};


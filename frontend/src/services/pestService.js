import api from './api';

export const pestService = {
  getPests: async (cropId = null) => {
    const params = cropId ? { crop_id: cropId } : {};
    const response = await api.get('/pests', { params });
    return response.data;
  },

  getPestById: async (id) => {
    const response = await api.get(`/pests/${id}`);
    return response.data;
  },

  createPest: async (pestData) => {
    const response = await api.post('/pests', pestData);
    return response.data;
  },

  updatePest: async (id, pestData) => {
    const response = await api.put(`/pests/${id}`, pestData);
    return response.data;
  },

  deletePest: async (id) => {
    const response = await api.delete(`/pests/${id}`);
    return response.data;
  },

  linkCrop: async (cropId, pestId, notes = '') => {
    const response = await api.post('/pests/link-crop', {
      crop_id: cropId,
      pest_id: pestId,
      notes
    });
    return response.data;
  },

  addRecommendation: async (pestId, recData) => {
    const response = await api.post(`/pests/${pestId}/recommendations`, recData);
    return response.data;
  }
};

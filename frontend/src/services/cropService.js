import api from './api';

export const cropService = {
  getCrops: async () => {
    const response = await api.get('/crops');
    return response.data;
  },

  getAllCrops: async () => {
    const response = await api.get('/crops/all');
    return response.data;
  },

  createCrop: async (cropData) => {
    const response = await api.post('/crops', cropData);
    return response.data;
  },

  updateCrop: async (id, cropData) => {
    const response = await api.put(`/crops/${id}`, cropData);
    return response.data;
  },

  deleteCrop: async (id) => {
    const response = await api.delete(`/crops/${id}`);
    return response.data;
  }
};

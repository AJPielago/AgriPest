import api from './api';

export const detectionService = {
  detectPest: async (file, cropId = null, weatherCondition = null, fieldLocation = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (cropId) {
      formData.append('crop_id', cropId);
    }
    if (weatherCondition) {
      formData.append('weather_condition', weatherCondition);
    }
    if (fieldLocation) {
      formData.append('field_location', fieldLocation);
    }
    const response = await api.post('/detections/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  checkLiveFrame: async (file, cropId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (cropId) {
      formData.append('crop_id', cropId);
    }
    const response = await api.post('/detections/live-check', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  submitFeedback: async (id, feedbackAccurate, feedbackNotes = '') => {
    const response = await api.post(`/detections/${id}/feedback`, {
      feedback_accurate: feedbackAccurate,
      feedback_notes: feedbackNotes
    });
    return response.data;
  },

  getHistory: async (cropId = null, skip = 0, limit = 50) => {
    const params = { skip, limit };
    if (cropId) params.crop_id = cropId;
    const response = await api.get('/detections', { params });
    return response.data;
  },

  getDetectionById: async (id) => {
    const response = await api.get(`/detections/${id}`);
    return response.data;
  },

  deleteDetection: async (id) => {
    const response = await api.delete(`/detections/${id}`);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

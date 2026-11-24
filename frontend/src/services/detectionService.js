import api from './api';

export const detectionService = {
  detectPest: async (file, cropId = null, weatherCondition = null, fieldLocation = null, coords = null) => {
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
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      formData.append('latitude', coords.latitude);
      formData.append('longitude', coords.longitude);
    }
    const response = await api.post('/detections/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  checkLiveFrame: async (file, cropId = null, signal = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (cropId) {
      formData.append('crop_id', cropId);
    }
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' }
    };
    if (signal) {
      config.signal = signal;
    }
    const response = await api.post('/detections/live-check', formData, config);
    return response.data;
  },

  submitFeedback: async (id, feedbackAccurate, feedbackNotes = '') => {
    const response = await api.post(`/detections/${id}/feedback`, {
      feedback_accurate: feedbackAccurate,
      feedback_notes: feedbackNotes
    });
    return response.data;
  },

  getHistory: async (cropId = null, skip = 0, limit = 50, filters = {}) => {
    const params = { skip, limit };
    if (cropId) params.crop_id = cropId;
    if (filters.severity) params.severity = filters.severity;
    if (filters.search) params.search = filters.search;
    if (filters.fromDate) params.from_date = filters.fromDate;
    if (filters.toDate) params.to_date = filters.toDate;
    const response = await api.get('/detections', { params });
    return response.data;
  },

  getUnreadNotificationCount: async () => {
    const response = await api.get('/detections/notifications/unread-count');
    return response.data;
  },

  markNotificationsRead: async () => {
    const response = await api.post('/detections/notifications/mark-read');
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

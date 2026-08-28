const OFFLINE_QUEUE_KEY = 'agripest_offline_queue';

export const saveOfflineScan = (fileData, cropId, weatherCondition, fieldLocation) => {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  const newScan = {
    id: Date.now(),
    cropId,
    weatherCondition,
    fieldLocation,
    fileName: fileData.name,
    fileType: fileData.type,
    timestamp: new Date().toISOString()
  };
  queue.push(newScan);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return newScan;
};

export const getOfflineQueue = () => {
  return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

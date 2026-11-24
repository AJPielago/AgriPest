const DB_NAME = 'agripest_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_scans';
export const OFFLINE_QUEUE_EVENT = 'agripest:offline-queue-changed';

const emitQueueChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
};

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveOfflineScan = async (fileData, cropId, weatherCondition, fieldLocation, coords = null) => {
  const db = await openDb();
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const record = {
    id,
    cropId: cropId ? parseInt(cropId, 10) : null,
    weatherCondition: weatherCondition || null,
    fieldLocation: fieldLocation || null,
    coords: coords || null,
    fileName: fileData?.name || `offline_scan_${id}.jpg`,
    fileType: fileData?.type || 'image/jpeg',
    fileBlob: fileData,
    timestamp: new Date().toISOString(),
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  emitQueueChange();
  return record;
};

export const getOfflineQueue = async () => {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
};

export const removeOfflineScan = async (id) => {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emitQueueChange();
};

export const clearOfflineQueue = async () => {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emitQueueChange();
};

let isSyncing = false;

export const syncOfflineQueue = async (uploadFn) => {
  if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { synced: 0, failed: 0, remaining: (await getOfflineQueue()).length };
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const items = await getOfflineQueue();
    for (const item of items) {
      if (!item.fileBlob) {
        await removeOfflineScan(item.id);
        continue;
      }
      try {
        const file = new File([item.fileBlob], item.fileName, { type: item.fileType || 'image/jpeg' });
        await uploadFn(file, item.cropId, item.weatherCondition, item.fieldLocation, item.coords);
        await removeOfflineScan(item.id);
        synced += 1;
      } catch (err) {
        // Stop early if connectivity dropped again; keep non-4xx items queued for retry
        if (!err?.response) {
          failed += 1;
          break;
        }
        // If server explicitly rejected the photo (4xx), drop from queue to avoid infinite retry loops
        if (err.response.status >= 400 && err.response.status < 500) {
          await removeOfflineScan(item.id);
        }
        failed += 1;
      }
    }
    const remaining = (await getOfflineQueue()).length;
    return { synced, failed, remaining };
  } finally {
    isSyncing = false;
    emitQueueChange();
  }
};

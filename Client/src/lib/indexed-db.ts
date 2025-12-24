// IndexedDB utility for storing AI-generated images
const DB_NAME = "TexonaAI";
const STORE_NAME = "ai-images";
const DB_VERSION = 1;

export interface StoredImage {
  id: string;
  dataUrl: string;
  timestamp: number;
}

// Initialize the database
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// Store an image in IndexedDB
export const storeImageInIndexedDB = async (dataUrl: string): Promise<string> => {
  const db = await initDB();
  const id = `ai-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const imageData: StoredImage = {
      id,
      dataUrl,
      timestamp: Date.now(),
    };

    const request = store.add(imageData);

    request.onsuccess = () => {
      db.close();
      resolve(id);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Retrieve an image from IndexedDB
export const getImageFromIndexedDB = async (id: string): Promise<string | null> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      db.close();
      const result = request.result as StoredImage | undefined;
      resolve(result?.dataUrl || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Delete old images (older than 7 days) to save space
export const cleanupOldImages = async (): Promise<void> => {
  const db = await initDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const image = cursor.value as StoredImage;
        if (image.timestamp < sevenDaysAgo) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        db.close();
        resolve();
      }
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Get all stored images
export const getAllStoredImages = async (): Promise<StoredImage[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result as StoredImage[]);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

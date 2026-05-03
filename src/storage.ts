export interface Annotation {
  id: string;
  shareId?: string;
  timestamp: number;
  originalImageData: string; // base64
  annotatedImageData: string; // base64
  drawings: Drawing[];
  title: string;
}

export interface Drawing {
  id: string;
  type: 'text' | 'arrow' | 'rect' | 'circle' | 'line' | 'image' | 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string; // for text
  color?: string;
  fontSize?: number;
  lineWidth?: number;
  rotation?: number;
  imageData?: string; // base64 for image type
}

const DB_NAME = 'HighlarkDB';
const STORE_NAME = 'annotations';
const SHARE_STORE_NAME = 'shares';
const TEMP_STORE_NAME = 'temp';
const DB_VERSION = 3;

let db: IDBDatabase | null = null;

// Open fresh database connection (needed for cross-window contexts)
function getDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('shareId', 'shareId', { unique: true });
      }
      if (!database.objectStoreNames.contains(SHARE_STORE_NAME)) {
        const shareStore = database.createObjectStore(SHARE_STORE_NAME, { keyPath: 'shareId' });
        shareStore.createIndex('annotationId', 'annotationId', { unique: false });
      }
      if (!database.objectStoreNames.contains(TEMP_STORE_NAME)) {
        database.createObjectStore(TEMP_STORE_NAME);
      }
    };
  });
}

export async function saveAnnotation(annotation: Annotation): Promise<string> {
  const database = await getDatabase();
  console.log('[Storage] Saving annotation:', { id: annotation.id, title: annotation.title });

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(annotation);

    request.onerror = () => {
      console.error('[Storage] Save failed:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      console.log('[Storage] Annotation saved successfully');
      resolve(annotation.id);
    };

    transaction.onerror = () => {
      console.error('[Storage] Transaction failed:', transaction.error);
      reject(transaction.error);
    };
  });
}

export async function getAnnotation(id: string): Promise<Annotation | null> {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAnnotationByShareId(shareId: string): Promise<Annotation | null> {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('shareId');
    const request = index.get(shareId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllAnnotations(): Promise<Annotation[]> {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const annotations = request.result as Annotation[];
      resolve(annotations.sort((a, b) => b.timestamp - a.timestamp));
    };
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateAnnotation(annotation: Annotation): Promise<void> {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(annotation);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function createShare(annotationId: string): Promise<string> {
  const database = await getDatabase();

  const shareId = generateShareId();
  const shareData = {
    shareId,
    annotationId,
    createdAt: Date.now(),
  };

  return new Promise(async (resolve, reject) => {
    try {
      // Get the annotation and add shareId to it
      const annotation = await getAnnotation(annotationId);
      if (!annotation) {
        reject(new Error('Annotation not found'));
        return;
      }

      annotation.shareId = shareId;
      await updateAnnotation(annotation);

      const transaction = database.transaction([SHARE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(SHARE_STORE_NAME);
      const request = store.put(shareData);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(shareId);
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Share URL generation - creates a shareable string ID
export function generateShareId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getShareUrl(shareId: string): string {
  return `https://highlark.app/share/${shareId}`;
}

import { HistoryItem } from "../types";

const DB_NAME = "MiuxBotDB";
const STORE_NAME = "history";
const DB_VERSION = 1;

/**
 * Opens the IndexedDB connection.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Saves a generated result to history.
 */
export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to save history:", error);
    // Silent fail is acceptable for history
  }
};

/**
 * Retrieves all history items, sorted by newest first.
 */
export const getAllHistory = async (): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as HistoryItem[];
        // Sort by timestamp descending (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get history:", error);
    return [];
  }
};

/**
 * Deletes a single history item by ID.
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to delete history item:", error);
    throw error;
  }
};

/**
 * Clears all history.
 */
export const clearAllHistory = async (): Promise<void> => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error("Failed to clear history:", error);
      throw error;
    }
  };
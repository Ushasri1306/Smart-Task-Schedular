/*
  db.js - Promise-based IndexedDB helper functions
  Exposes:
    - dbReady (Promise)
    - saveTaskToDB(task) -> Promise
    - deleteTaskFromDB(id) -> Promise
    - getAllTasksFromDB() -> Promise -> [tasks]
*/

const DB_NAME = 'TaskDatabase';
const STORE_NAME = 'tasks';
let db = null;

// Promise that resolves when DB is ready
const dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = function (e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };

  request.onsuccess = function (e) {
    db = e.target.result;
    console.log('[DB] open success');
    resolve();
  };

  request.onerror = function (e) {
    console.error('[DB] open error', e.target.error);
    reject(e.target.error);
  };
});

// Save or update a task
function saveTaskToDB(task) {
  // ensure DB is ready before using
  return dbReady.then(() => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(task);
      req.onsuccess = () => resolve(task);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  }));
}

// Delete a task by id
function deleteTaskFromDB(id) {
  return dbReady.then(() => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(id);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  }));
}

// Get all tasks
function getAllTasksFromDB() {
  return dbReady.then(() => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  }));
}

// Expose dbReady globally (browser script non-module)
window.dbReady = dbReady;
window.saveTaskToDB = saveTaskToDB;
window.deleteTaskFromDB = deleteTaskFromDB;
window.getAllTasksFromDB = getAllTasksFromDB;

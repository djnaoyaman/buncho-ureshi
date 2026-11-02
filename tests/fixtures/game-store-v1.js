import { createWorld, parseSave, serializeWorld, validateWorld } from './engine-v1.js';

export const STORAGE_KEY = 'buncho-ureshi-world-v1';
export const DB_NAME = 'buncho-ureshi-garden-v1';
const closedError = () => new Error('この保存画面は閉じられました。');

/** One world has one backend: an IndexedDB failure must never silently open another world. */
export async function openGameStore(platform = globalThis) {
  const locks = platform.navigator?.locks;
  let storage;
  try { storage = platform.localStorage; } catch { /* Storage can be disabled by the browser. */ }
  let hasLocalSave = false;
  try { hasLocalSave = storage?.getItem(STORAGE_KEY) !== null && storage?.getItem(STORAGE_KEY) !== undefined; } catch { storage = undefined; }

  // A world created by the locked fallback stays there after a browser upgrade.
  // Never overwrite or ignore a possibly corrupt existing fallback world.
  if (hasLocalSave) {
    if (!locks || !storage) throw new Error('以前の保存を安全に開けません。このブラウザの保存機能を有効にして、もう一度開いてください。保存は変更していません。');
    return lockedLocalStore(storage, locks);
  }
  if (platform.indexedDB) {
    let settled = false;
    const db = await new Promise((resolve, reject) => {
      let request;
      const fail = error => { if (!settled) { settled = true; reject(error); } };
      try { request = platform.indexedDB.open(DB_NAME, 1); }
      catch (error) { fail(error); return; }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('world')) request.result.createObjectStore('world');
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true; resolve(request.result);
      };
      request.onerror = () => fail(request.error || new Error('保存を開けませんでした。'));
      request.onblocked = () => fail(new Error('ほかのタブで保存を更新しています。ほかのタブを閉じて再読み込みしてください。別の庭には切り替えていません。'));
    });
    let closed = false;
    db.onversionchange = () => { closed = true; db.close(); };
    return {
      mode: 'device',
      async transact(fn) {
        if (closed) throw closedError();
        return new Promise((resolve, reject) => {
          let tx;
          try { tx = db.transaction('world', 'readwrite'); } catch (error) { reject(error); return; }
          const store = tx.objectStore('world'), request = store.get('current');
          let result, failure;
          request.onsuccess = () => {
            try {
              const current = request.result ? validateWorld(request.result) : createWorld();
              const beforeRevision = current.revision, beforeTime = current.lastUpdated;
              result = validateWorld(fn(current));
              if (!request.result || result.revision !== beforeRevision || result.lastUpdated !== beforeTime) store.put(result, 'current');
            } catch (error) { failure = error; tx.abort(); }
          };
          request.onerror = () => { failure = request.error; };
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(failure || tx.error || new Error('保存できませんでした。'));
          tx.onabort = () => reject(failure || tx.error || new Error('保存を中止しました。'));
        });
      },
      close() { if (!closed) { closed = true; db.close(); } },
    };
  }
  if (locks && storage) {
    try { storage.setItem(`${STORAGE_KEY}-test`, '1'); storage.removeItem(`${STORAGE_KEY}-test`); }
    catch { return memoryStore(); }
    return lockedLocalStore(storage, locks);
  }
  return memoryStore();
}

function lockedLocalStore(storage, locks) {
  let closed = false;
  return {
    mode: 'locked-local',
    async transact(fn) {
      if (closed) throw closedError();
      return locks.request(STORAGE_KEY, () => {
        if (closed) throw closedError();
        const raw = storage.getItem(STORAGE_KEY);
        const current = raw !== null ? parseSave(raw) : createWorld();
        const result = validateWorld(fn(current));
        storage.setItem(STORAGE_KEY, serializeWorld(result));
        return result;
      });
    },
    close() { closed = true; },
  };
}

function memoryStore() {
  let world = createWorld(), closed = false;
  return {
    mode: 'memory',
    async transact(fn) {
      if (closed) throw closedError();
      const result = validateWorld(fn(structuredClone(world)));
      world = result;
      return structuredClone(world);
    },
    close() { closed = true; },
  };
}

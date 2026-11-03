import { createWorld, parseSave, serializeWorld, validateWorld, readCompatibleWorld } from './engine.js';

export const STORAGE_KEY = 'buncho-ureshi-world-v1';
export const DB_NAME = 'buncho-ureshi-garden-v1';
const BACKUP_KEY = 'reset-backup';
const LOCAL_FORMAT = 'buncho-world-with-reset-backup-v1';
let generation = 0;
const staleError = () => new Error('別のタブで庭が変わりました。画面を更新して、もう一度確認してください。');
const noBackupError = () => new Error('復元できるリセット前の庭はありません。');
function resetResult(current, expectedWorldId, backup, restore) {
  if (typeof expectedWorldId !== 'string' || current.worldId !== expectedWorldId) throw staleError();
  if (restore && !backup) throw noBackupError();
  const next = restore ? readCompatibleWorld(backup) : createWorld();
  next.settings = structuredClone(current.settings);
  // A new identity is mandatory even for same-millisecond reset/restore cycles.
  const nonce = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++generation}-${Math.random().toString(36).slice(2)}`;
  next.worldId = `garden-reset-${nonce}`;
  return validateWorld(next);
}
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
    function resetTransaction(expectedWorldId, restore = false) {
      if (closed) return Promise.reject(closedError());
      return new Promise((resolve, reject) => {
        let tx;
        try { tx = db.transaction('world', 'readwrite'); } catch (error) { reject(error); return; }
        const store = tx.objectStore('world'), request = store.get('current');
        let result, failure;
        const abort = error => { failure = error; tx.abort(); };
        request.onsuccess = () => {
          try {
            if (request.result === undefined) throw staleError();
            const current = readCompatibleWorld(request.result);
            if (current.worldId !== expectedWorldId) throw staleError();
            if (restore) {
              const saved = store.get(BACKUP_KEY);
              saved.onsuccess = () => {
                try { result = resetResult(current, expectedWorldId, saved.result, true); store.put(result, 'current'); store.delete(BACKUP_KEY); }
                catch (error) { abort(error); }
              };
              saved.onerror = () => { failure = saved.error; };
            } else {
              result = resetResult(current, expectedWorldId, null, false);
              store.put(current, BACKUP_KEY); store.put(result, 'current');
            }
          } catch (error) { abort(error); }
        };
        request.onerror = () => { failure = request.error; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('保存を中止しました。今の庭は変更していません。'));
      });
    }
    return {
      mode: 'device',
      resetWorld: expectedWorldId => resetTransaction(expectedWorldId),
      restoreResetBackup: expectedWorldId => resetTransaction(expectedWorldId, true),
      async hasResetBackup() {
        if (closed) throw closedError();
        return new Promise((resolve, reject) => {
          let tx;
          try { tx = db.transaction('world', 'readonly'); } catch (error) { reject(error); return; }
          const request = tx.objectStore('world').get(BACKUP_KEY); let found = false, failure;
          request.onsuccess = () => { try { if (request.result !== undefined) { readCompatibleWorld(request.result); found = true; } } catch (error) { failure = error; tx.abort(); } };
          tx.oncomplete = () => resolve(found);
          tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('バックアップを確認できませんでした。'));
        });
      },
      async transact(fn) {
        if (closed) throw closedError();
        return new Promise((resolve, reject) => {
          let tx;
          try { tx = db.transaction('world', 'readwrite'); } catch (error) { reject(error); return; }
          const store = tx.objectStore('world'), request = store.get('current');
          let result, failure;
          request.onsuccess = () => {
            try {
              const exists = request.result !== undefined;
              const current = exists ? readCompatibleWorld(request.result) : createWorld();
              const beforeWorldId = current.worldId, beforeRevision = current.revision, beforeTime = current.lastUpdated, beforeCareTime=current.careSchedule?.seenAt;
              result = validateWorld(fn(current));
              // Compare against the raw persisted schema, not the already-migrated object.
              if (!exists || request.result.version !== result.version || result.worldId !== beforeWorldId || result.revision !== beforeRevision || result.lastUpdated !== beforeTime || result.careSchedule?.seenAt !== beforeCareTime) store.put(result, 'current');
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

function localRecord(raw) {
  if (raw === null) return { current: createWorld(), backup: null, envelope: false };
  // Bound the wrapper before parsing two independently bounded game saves.
  if (raw.length > 8000000) throw new Error('保存データが大きすぎます。');
  const parsed = JSON.parse(raw);
  if (parsed?.format === LOCAL_FORMAT) {
    if (Object.keys(parsed).length !== 3 || !Object.hasOwn(parsed, 'current') || !Object.hasOwn(parsed, 'backup')) throw new Error('保存の項目が不正です。');
    return { current: readCompatibleWorld(parsed.current), backup: parsed.backup === null ? null : readCompatibleWorld(parsed.backup), envelope: true };
  }
  return { current: parseSave(raw), backup: null, envelope: false };
}
function encodeRecord(current, backup) { return JSON.stringify({ format: LOCAL_FORMAT, current: validateWorld(current), backup: backup === null ? null : validateWorld(backup) }); }
function lockedLocalStore(storage, locks) {
  let closed = false;
  const locked = fn => {
    if (closed) return Promise.reject(closedError());
    return locks.request(STORAGE_KEY, () => { if (closed) throw closedError(); return fn(); });
  };
  const reset = (expected, restore = false) => locked(() => {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) throw staleError();
    const { current, backup } = localRecord(raw);
    const result = resetResult(current, expected, backup, restore);
    // One key, one atomic storage operation: quota/security errors preserve both old values.
    storage.setItem(STORAGE_KEY, encodeRecord(result, restore ? null : current));
    return result;
  });
  return {
    mode: 'locked-local',
    resetWorld: expected => reset(expected),
    restoreResetBackup: expected => reset(expected, true),
    hasResetBackup: () => locked(() => localRecord(storage.getItem(STORAGE_KEY)).backup !== null),
    transact(fn) {
      return locked(() => {
        const raw = storage.getItem(STORAGE_KEY), record = localRecord(raw);
        const result = validateWorld(fn(record.current));
        const encoded = record.envelope ? encodeRecord(result, record.backup) : serializeWorld(result);
        if (encoded !== raw) storage.setItem(STORAGE_KEY, encoded);
        return result;
      });
    },
    close() { closed = true; },
  };
}

function memoryStore() {
  let world = createWorld(), backup = null, closed = false;
  const reset = async (expected, restore = false) => {
    if (closed) throw closedError();
    const result = resetResult(world, expected, backup, restore);
    backup = restore ? null : structuredClone(world);
    world = result;
    return structuredClone(world);
  };
  return {
    mode: 'memory',
    resetWorld: expected => reset(expected),
    restoreResetBackup: expected => reset(expected, true),
    async hasResetBackup() { if (closed) throw closedError(); return backup !== null; },
    async transact(fn) {
      if (closed) throw closedError();
      const result = validateWorld(fn(structuredClone(world)));
      world = result;
      return structuredClone(world);
    },
    close() { closed = true; },
  };
}

import { MAX_SAVE_BYTES, createWorld, parseSave, serializeWorld, validateWorld, readCompatibleWorld, prepareWorldReplacement } from './engine.js';

export const STORAGE_KEY = 'buncho-ureshi-world-v1';
export const DB_NAME = 'buncho-ureshi-garden-v1';
const BACKUP_KEY = 'reset-backup';
const LOCAL_FORMAT = 'buncho-world-with-reset-backup-v1';
// Raw migration copies are independent of the reset backup and never overwrite an older copy.
function preserveMigration(store,raw){
 if(!raw||raw.version>=17)return;
 const key=raw.version>=16?'migration-backup-v16':raw.version>=15?'migration-backup-v15':raw.version>=14?'migration-backup-v14':raw.version>=13?'migration-backup-v13':raw.version<12?'migration-backup-v11':'migration-backup-v12',q=store.get(key);
 q.onsuccess=()=>{if(q.result===undefined)store.put(raw,key);};
}
function preserveLocalMigration(storage,raw){
 if(!raw)return;const world=JSON.parse(raw).current??JSON.parse(raw);
 if(world.version>=17)return;
 const key=STORAGE_KEY+(world.version>=16?'-migration-v16':world.version>=15?'-migration-v15':world.version>=14?'-migration-v14':world.version>=13?'-migration-v13':world.version<12?'-migration-v11':'-migration-v12');
 if(storage.getItem(key)===null)storage.setItem(key,raw);
}

let generation = 0;
const staleError = () => new Error('別のタブで庭が変わりました。画面を更新して、もう一度確認してください。');
const noBackupError = () => new Error('復元できるリセット前の庭はありません。');
function resetResult(current, expectedWorldId, backup, restore, now=Date.now()) {
  if (typeof expectedWorldId !== 'string' || current.worldId !== expectedWorldId) throw staleError();
  if (restore && !backup) throw noBackupError();
  const next = restore ? readCompatibleWorld(backup,now) : createWorld(now);
  next.settings = {...next.settings,motion:current.settings.motion,careSound:current.settings.careSound};
  // A new identity is mandatory even for same-millisecond reset/restore cycles.
  const nonce = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++generation}-${Math.random().toString(36).slice(2)}`;
  const newWorldId=`garden-reset-${nonce}`;
  if(restore)return prepareWorldReplacement(current,next,now,newWorldId);
  next.worldId = newWorldId;
  return validateWorld(next);
}
function replacementResult(current,expectedWorldId,replacement,now){
 if(typeof expectedWorldId!=='string'||current.worldId!==expectedWorldId)throw staleError();
 const nonce=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${++generation}-${Math.random().toString(36).slice(2)}`;
 return prepareWorldReplacement(current,replacement,now,`garden-import-${nonce}`);
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
            preserveMigration(store,request.result);
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
      async migrationBackup(version=11){return new Promise((resolve,reject)=>{const tx=db.transaction('world','readonly'),q=tx.objectStore('world').get(version===16?'migration-backup-v16':version===15?'migration-backup-v15':version===14?'migration-backup-v14':version===13?'migration-backup-v13':version===12?'migration-backup-v12':'migration-backup-v11');q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);});},
      replaceWorld(expectedWorldId,replacement,now=Date.now(),{guard=()=>true}={}){
        if(closed)return Promise.reject(closedError());
        return new Promise((resolve,reject)=>{
          let tx;try{tx=db.transaction('world','readwrite');}catch(error){reject(error);return;}
          const store=tx.objectStore('world'),request=store.get('current');let result,failure;
          request.onsuccess=()=>{try{
            const current=request.result===undefined?createWorld(now):readCompatibleWorld(request.result,now);
            if(!guard()){result=current;return;}
            if(request.result===undefined)throw staleError();
            result=replacementResult(current,expectedWorldId,replacement,now);preserveMigration(store,request.result);store.put(result,'current');
          }catch(error){failure=error;tx.abort();}};
          request.onerror=()=>{failure=request.error;};
          tx.oncomplete=()=>resolve(result);
          tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('保存を中止しました。今の庭は変更していません。'));
        });
      },
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
              const beforeWorldId = current.worldId, beforeRevision = current.revision, beforeTime = current.lastUpdated, beforeCareTime=current.careSchedule?.seenAt,beforeAway=JSON.stringify(current.away),beforeRules=JSON.stringify(current.careRules);
              result = validateWorld(fn(current));
              if(exists)preserveMigration(store,request.result);
              // Compare against the raw persisted schema, not the already-migrated object.
              if (!exists || request.result.version !== result.version || request.result.encounters?.version !== result.encounters?.version || result.worldId !== beforeWorldId || result.revision !== beforeRevision || result.lastUpdated !== beforeTime || result.careSchedule?.seenAt !== beforeCareTime || JSON.stringify(result.away)!==beforeAway || JSON.stringify(result.careRules)!==beforeRules) store.put(result, 'current');
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
  if (raw.length > MAX_SAVE_BYTES*2) throw new Error('保存データが大きすぎます。');
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
    preserveLocalMigration(storage,raw);
    // One key, one atomic storage operation: quota/security errors preserve both old values.
    storage.setItem(STORAGE_KEY, encodeRecord(result, restore ? null : current));
    return result;
  });
  return {
    mode: 'locked-local',
    migrationBackup:(version=11)=>locked(()=>{const raw=storage.getItem(STORAGE_KEY+(version===16?'-migration-v16':version===15?'-migration-v15':version===14?'-migration-v14':version===13?'-migration-v13':version===12?'-migration-v12':'-migration-v11'));return raw?(JSON.parse(raw).current??JSON.parse(raw)):null;}),
    replaceWorld(expectedWorldId,replacement,now=Date.now(),{guard=()=>true}={}){
      return locked(()=>{
        const raw=storage.getItem(STORAGE_KEY),record=localRecord(raw);
        if(!guard())return record.current;
        if(raw===null)throw staleError();
        const result=replacementResult(record.current,expectedWorldId,replacement,now);
        preserveLocalMigration(storage,raw);
        storage.setItem(STORAGE_KEY,record.envelope?encodeRecord(result,record.backup):serializeWorld(result));
        return result;
      });
    },
    resetWorld: expected => reset(expected),
    restoreResetBackup: expected => reset(expected, true),
    hasResetBackup: () => locked(() => localRecord(storage.getItem(STORAGE_KEY)).backup !== null),
    transact(fn) {
      return locked(() => {
        const raw = storage.getItem(STORAGE_KEY), record = localRecord(raw);
        const result = validateWorld(fn(record.current));
        const encoded = record.envelope ? encodeRecord(result, record.backup) : serializeWorld(result);
        preserveLocalMigration(storage,raw);
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
    async migrationBackup(){return null;},
    async replaceWorld(expectedWorldId,replacement,now=Date.now(),{guard=()=>true}={}){
      if(closed)throw closedError();if(!guard())return structuredClone(world);
      const result=replacementResult(world,expectedWorldId,replacement,now);world=result;return structuredClone(world);
    },
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

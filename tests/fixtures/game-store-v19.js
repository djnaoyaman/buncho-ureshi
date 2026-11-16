// Frozen deployed source 157e20938d9b471f89d9472bf5a85386d1c69ea6; dependency paths adjusted only.
import { MAX_SAVE_BYTES, SAVE_VERSION, createWorld, parseSave, serializeWorld, validateWorld, readCompatibleWorld, prepareWorldReplacement } from './engine-v19.js';

export const STORAGE_KEY = 'buncho-ureshi-world-v1';
export const DB_NAME = 'buncho-ureshi-garden-v1';
const BACKUP_KEY = 'reset-backup';
const LOCAL_FORMAT = 'buncho-world-with-reset-backup-v1';
// Keep raw source copies before migration; the current format is never migrated here.
function migrationVersion(version){return version<12?11:version;}
function backupVersion(version){
 if(!Number.isInteger(version)||version<11||version>SAVE_VERSION)throw new Error('対応していないバックアップの版です。');
 return version;
}
function preserveMigration(store,raw){
 if(!raw||raw.version>=SAVE_VERSION)return;
 const key=`migration-backup-v${migrationVersion(raw.version)}`,q=store.get(key);
 q.onsuccess=()=>{if(q.result===undefined)store.put(raw,key);};
}
function preserveLocalMigration(storage,raw){
 if(!raw)return;const parsed=JSON.parse(raw),world=parsed.current??parsed;
 if(world.version>=SAVE_VERSION)return;
 const key=STORAGE_KEY+`-migration-v${migrationVersion(world.version)}`;
 if(storage.getItem(key)===null)storage.setItem(key,raw);
}
function snapshotText(raw){
 if(raw===undefined)throw new Error('書き出せる保存が見つかりません。保存は変更していません。');
 // Validate a compatible copy, but export the original version and values.
 readCompatibleWorld(raw);
 const text=JSON.stringify(raw);
 if(new TextEncoder().encode(text).byteLength>MAX_SAVE_BYTES)throw new Error('保存ファイルは64MB以下のJSONを選んでください。');
 return text;
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
      async exportSnapshot(){
        if(closed)throw closedError();
        return new Promise((resolve,reject)=>{
          const tx=db.transaction('world','readonly'),q=tx.objectStore('world').get('current');let text,failure;
          q.onsuccess=()=>{try{text=snapshotText(q.result);}catch(error){failure=error;tx.abort();}};
          q.onerror=()=>{failure=q.error;};
          tx.oncomplete=()=>resolve(text);
          tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('保存を読み取れませんでした。保存は変更していません。'));
        });
      },
      async migrationBackup(version=11){if(closed)throw closedError();const key=`migration-backup-v${backupVersion(version)}`;return new Promise((resolve,reject)=>{const tx=db.transaction('world','readonly'),q=tx.objectStore('world').get(key);let result;q.onsuccess=()=>{result=q.result||null;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('バックアップを読み取れませんでした。'));});},
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
    exportSnapshot:()=>locked(()=>{
      const raw=storage.getItem(STORAGE_KEY);
      if(raw===null)return snapshotText(undefined);
      if(raw.length>MAX_SAVE_BYTES*2)throw new Error('保存データが大きすぎます。');
      const parsed=JSON.parse(raw);
      if(parsed?.format===LOCAL_FORMAT){
        if(Object.keys(parsed).length!==3||!Object.hasOwn(parsed,'current')||!Object.hasOwn(parsed,'backup'))throw new Error('保存の項目が不正です。');
        return snapshotText(parsed.current);
      }
      if(new TextEncoder().encode(raw).byteLength>MAX_SAVE_BYTES)throw new Error('保存ファイルは64MB以下のJSONを選んでください。');
      snapshotText(parsed);return raw;
    }),
    migrationBackup:(version=11)=>locked(()=>{const raw=storage.getItem(STORAGE_KEY+`-migration-v${backupVersion(version)}`);return raw?(JSON.parse(raw).current??JSON.parse(raw)):null;}),
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
    async exportSnapshot(){if(closed)throw closedError();return snapshotText(world);},
    async migrationBackup(version=11){if(closed)throw closedError();backupVersion(version);return null;},
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

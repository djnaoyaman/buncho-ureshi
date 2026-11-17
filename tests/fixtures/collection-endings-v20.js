// Frozen public 0b9f38fbf1d5560d48cfb43effb9c0ac90901289; import paths only adjusted.
import {GARDEN35_PLAN} from '../../src/data/garden35-plan.js';
import {CROW_SPECIES} from '../../src/garden-crows.js';
import {RAPTOR_SPECIES} from '../../src/data/raptor-species.js';

/** Completion sets are frozen for this release: later additions never revoke an earned ending. */
export const ENDING_CATALOG=Object.freeze([
 {id:'garden',title:'庭の鳥との出会い',ids:GARDEN35_PLAN.map(x=>x.birdId)},
 {id:'crows',title:'カラスたちとの出会い',ids:CROW_SPECIES.map(x=>x.id)},
 {id:'raptors',title:'大空の鳥たちとの出会い',ids:RAPTOR_SPECIES.map(x=>x.id)},
].map(e=>Object.freeze({...e,ids:Object.freeze([...new Set(e.ids)])})));
export const ENDING_LEASE_MS=5*60*1000;
const MAX_TIME=8640000000000000;
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
const validOwner=o=>typeof o==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(o);
export const initialCollectionEndings=(version=2)=>({version,entries:[]});
export function validateCollectionEndings(w,version=2){
 const s=w.collectionEndings,fail=()=>{throw Error('エンディングの記録が不正です。');};
 if(!shape(s,['version','entries'])||s.version!==version||![1,2].includes(version)||!Array.isArray(s.entries)||s.entries.length>ENDING_CATALOG.length||new Set(s.entries.map(e=>e?.id)).size!==s.entries.length)fail();
 for(const e of s.entries){
  if(!shape(e,['id','unlockedTick','acknowledged','lease',...(version===2?['playback']:[])])||!ENDING_CATALOG.some(c=>c.id===e.id)||!integer(e.unlockedTick,0,w.tick)||typeof e.acknowledged!=='boolean')fail();
  if(version===2&&(!['pending','legacy','deferred','started','completed'].includes(e.playback)||(e.playback==='pending')!==!e.acknowledged))fail();
  if(e.lease!==null&&(!shape(e.lease,['owner','until'])||!validOwner(e.lease.owner)||!integer(e.lease.until,1,MAX_TIME)||e.acknowledged))fail();
 }
 return s;
}
const discoveries=(w,id)=>id==='garden'?w.encounters.discoveries:id==='crows'?w.encounters.crow.visits:w.encounters.raptor.visits;
export function collectionEndingStatus(w){
 return ENDING_CATALOG.map(c=>{const seen=new Set(discoveries(w,c.id).map(e=>e.id)),entry=w.collectionEndings?.entries.find(e=>e.id===c.id);return {...c,completed:c.ids.filter(id=>seen.has(id)).length,total:c.ids.length,unlocked:!!entry,acknowledged:entry?.acknowledged||false,playback:entry?.playback??(entry?.acknowledged?'legacy':'pending')};});
}
/** Mutate only inside a fresh-state store transaction. No PRNG, clocks, balance or bird changes. */
export function syncCollectionEndings(w){
 let changed=false;
 for(const s of collectionEndingStatus(w))if(!s.unlocked&&s.completed===s.total){w.collectionEndings.entries.push({id:s.id,unlockedTick:w.tick,acknowledged:false,lease:null,...(w.collectionEndings.version===2?{playback:'pending'}:{})});changed=true;}
 if(changed)bump(w);
 return {changed};
}
export function pendingCollectionEnding(w){return ENDING_CATALOG.find(c=>w.collectionEndings.entries.some(e=>e.id===c.id&&!e.acknowledged))||null;}
export function claimCollectionEnding(w,id,owner,now){
 if(!validOwner(owner)||!integer(now,0,MAX_TIME-ENDING_LEASE_MS))return {changed:false,reason:'invalid'};
 const e=w.collectionEndings.entries.find(e=>e.id===id);
 if(!e||e.acknowledged)return {changed:false,reason:'unavailable'};
 if(e.lease&&e.lease.until>now)return {changed:false,reason:e.lease.owner===owner?'owned':'busy'};
 e.lease={owner,until:now+ENDING_LEASE_MS};bump(w);return {changed:true};
}
export function acknowledgeCollectionEnding(w,id,owner){
 const e=w.collectionEndings.entries.find(e=>e.id===id);
 if(!e||e.acknowledged||e.lease?.owner!==owner)return {changed:false};
 e.acknowledged=true;e.lease=null;if(w.collectionEndings.version===2)e.playback='started';bump(w);return {changed:true};
}
export function releaseCollectionEnding(w,id,owner){
 const e=w.collectionEndings.entries.find(e=>e.id===id);
 if(!e||e.lease?.owner!==owner)return {changed:false};
 e.lease=null;bump(w);return {changed:true};
}

/** Record only observed player events, never infer completed playback from old acknowledgement. */
export function recordCollectionEndingPlayback(w,id,owner,playback){
 if(w.collectionEndings.version!==2||!validOwner(owner)||!['deferred','started','completed'].includes(playback))return {changed:false,reason:'invalid'};
 const e=w.collectionEndings.entries.find(e=>e.id===id);
 if(!e||!e.acknowledged&&e.lease?.owner!==owner)return {changed:false,reason:'unavailable'};
 if(e.playback==='completed'||e.acknowledged&&e.playback===playback)return {changed:false};
 e.acknowledged=true;e.lease=null;e.playback=playback;bump(w);return {changed:true};
}

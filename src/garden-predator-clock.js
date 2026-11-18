import {CROW_SPECIES} from './garden-crows.js';
import {RAPTOR_SPECIES} from './garden-raptors.js';

// Lottery state is separate from the saved world and its PRNG. The host journals
// attempts in this tab's session storage so reload cannot reroll a selected bird.
export const PREDATOR_ENTRY_RULES=Object.freeze({dwellMs:3000,chance:.35,crowWeight:5,raptorWeight:5,retryMs:60000,maxSampleGapMs:2500});
export function createGardenPredatorClock({random=Math.random,persist=()=>true}={}){
 let key=null,last=null,elapsed=0,lastDraw=null,pending=null,issued=false;
 const reset=()=>{key=null;last=null;elapsed=0;issued=false;};
 const snapshot=()=>({version:1,lastDraw,pending:pending?{...pending}:null});
 const save=()=>{try{return persist(snapshot())!==false;}catch{return false;}};
 const prime=({key:nextKey,now,eligible})=>{
  if(!eligible||!Number.isFinite(now)){reset();return;}
  if(nextKey!==key||last===null){reset();key=nextKey;last=now;}
 };
 const restore=state=>{
  reset();lastDraw=null;pending=null;
  if(!state)return;
  const p=state.pending;
  if(state.version!==1||!(state.lastDraw===null||Number.isFinite(state.lastDraw)&&state.lastDraw>=0)||
   (p&&(!['crow','raptor'].includes(p.kind)||!(p.kind==='crow'?CROW_SPECIES:RAPTOR_SPECIES).some(s=>s.id===p.id)||typeof p.arrivals!=='string')))return;
  lastDraw=state.lastDraw;pending=p?{kind:p.kind,id:p.id,arrivals:p.arrivals}:null;
 };
 return {reset,prime,restore,snapshot,retry(){if(issued)reset();},get elapsed(){return elapsed;},
  // Either family's committed arrival invalidates an older ticket, including
  // arrivals made by another (possibly older) tab. Never infer success from a UI.
  reconcile(arrivals,wallNow){if(pending&&pending.arrivals!==arrivals){pending=null;issued=false;lastDraw=wallNow;save();}},
  sample({key:nextKey,now,wallNow=now,arrivals='',eligible,available=true,crowAvailable=true,raptorAvailable=true,gardenId}){
   if(!eligible||!Number.isFinite(now)||!Number.isFinite(wallNow)){reset();return null;}
   if(nextKey!==key||last===null){prime({key:nextKey,now,eligible});return null;}
   const delta=now-last;last=now;
   if(delta<0||delta>PREDATOR_ENTRY_RULES.maxSampleGapMs){reset();prime({key:nextKey,now,eligible});return null;}
   elapsed+=delta;
   if(elapsed<PREDATOR_ENTRY_RULES.dwellMs||!available)return null;
   // A water-only ticket must not block every other garden forever. It may
   // expire only at the next normal draw deadline, never on rapid navigation.
   if(pending?.id==='osprey'&&gardenId!=='mizukagami'){
    if(wallNow-lastDraw<PREDATOR_ENTRY_RULES.retryMs)return null;
    pending=null;issued=false;
   }
   if(pending){
    if(issued||(pending.kind==='crow'?!crowAvailable:!raptorAvailable))return null;
    // Persist before issuing, including after a failed journal write. No fresh RNG.
    if(!save())return null;
    issued=true;return {kind:pending.kind,id:pending.id};
   }
   if(!crowAvailable&&!raptorAvailable)return null;
   if(lastDraw!==null&&wallNow-lastDraw<PREDATOR_ENTRY_RULES.retryMs)return null;
   lastDraw=wallNow;
   if(random()>=PREDATOR_ENTRY_RULES.chance){save();return null;}
   const kind=crowAvailable&&(!raptorAvailable||random()<PREDATOR_ENTRY_RULES.crowWeight/(PREDATOR_ENTRY_RULES.crowWeight+PREDATOR_ENTRY_RULES.raptorWeight))?'crow':'raptor';
   const pool=kind==='crow'?CROW_SPECIES:RAPTOR_SPECIES.filter(s=>!s.waterOnly||gardenId==='mizukagami');
   const index=Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));
   pending={kind,id:pool[index].id,arrivals};
   if(!save())return null;
   issued=true;return {kind,id:pending.id};
  }};
}

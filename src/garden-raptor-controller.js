import {createGardenRaptorClock,arriveGardenRaptor,raptorTarget,raptorToken,raptorCoolingDown,raptorScene} from './garden-raptors.js';
import {advanceGardenRaptor} from './engine.js';
import {createGardenPredatorClock} from './garden-predator-clock.js';
import {crowScene} from './garden-crows.js';
/** One host-owned foreground clock. A saved warning survives navigation and reload.
 * Transactions consume only a bounded observed interval, never offline wall time. */
export function mountGardenRaptors(root,{getWorld,transact,onChange=()=>{},isAvailable=()=>true,hasCrowPending=()=>false,random=Math.random,predatorRandom=Math.random,earlyPredatorVisits=true,canStartCrowWarning=()=>false,startCrowWarning=null}={}){
 const doc=root.ownerDocument,win=doc.defaultView,clock=createGardenRaptorClock({random}),entryClock=createGardenPredatorClock({random:predatorRandom});
 let alive=true,flight=false,timer=null,last=null,epoch=0,lastWorld=getWorld().worldId,lastPanel=root.querySelector('.game-app')?.dataset.panel,lastGarden=getWorld().encounters.garden.id;
 let renderedScene=sceneKey(getWorld());
 const visible=()=>alive&&root.isConnected&&!['loading','shown'].includes(doc.body.dataset.gameIntro)&&doc.visibilityState!=='hidden'&&!doc.body.hasAttribute('data-game-view-blocked')&&win.navigator?.onLine!==false&&!getWorld().paused;
 const interrupt=()=>{last=null;clock.reset();entryClock.reset();epoch++;};
 function sceneKey(w){const s=raptorScene(w);return s?`${s.species.id}:${s.phase}:${s.hostile}`:'';}
 async function poll(){
  if(!alive)return;
  const now=win.performance.now(),w=getWorld();
  if(w.worldId!==lastWorld){lastWorld=w.worldId;interrupt();}
  if(renderedScene!==sceneKey(w)){renderedScene=sceneKey(w);onChange({structural:true,world:w});}
  const delta=last===null?0:Math.floor(now-last);last=now;
  if(!visible()){interrupt();schedule();return;}
  if(flight){schedule();return;}
  const active=w.encounters.raptor?.active;
  const stage=root.querySelector('.finch-garden-stage');
  const eligible=w.encounters.garden.open&&!!stage&&stage.dataset.sceneState==='ready'&&!doc.querySelector('.game-bird-sheet[open]');
  const entry=earlyPredatorVisits?entryClock.sample({key:`${w.worldId}:${w.encounters.garden.id}:${raptorTarget(w)?.id}`,now,eligible,available:!active&&isAvailable()&&!hasCrowPending()&&!crowScene(w)&&!root.querySelector('[data-crow-phase=warning]'),crowAvailable:!!startCrowWarning&&canStartCrowWarning(),raptorAvailable:!raptorCoolingDown(w),gardenId:w.encounters.garden.id}):null;
  if(entry?.kind==='crow')startCrowWarning(entry.id);
  const sustained=clock.sample({key:`${w.worldId}:${w.encounters.garden.id}:${raptorTarget(w)?.id}`,now,eligible,busy:!isAvailable(),available:!entry&&!active&&!raptorCoolingDown(w)&&!hasCrowPending()&&!crowScene(w)&&!root.querySelector('[data-crow-phase=warning]'),gardenId:w.encounters.garden.id});
  const event=entry?.kind==='raptor'?{kind:'arrive',id:entry.id}:sustained;
  if(active||event?.kind==='arrive'){
   if(active&&(delta<=0||delta>2500)){schedule();return;}
   const token=raptorToken(w),session=epoch,worldId=w.worldId,targetId=raptorTarget(w)?.id,gardenId=w.encounters.garden.id;
   let result;flight=true;
   try{
    await transact(current=>{
     if(!alive||epoch!==session||!visible()||current.worldId!==worldId)return current;
     if(active){
      // The current store revision may include an unrelated story tick; preserve
      // the exact event/progress snapshot to reject another tab's earlier step.
      result=advanceGardenRaptor(current,delta,Date.now(),{...token,revision:current.revision});
     }else{
      if(hasCrowPending()||doc.querySelector('.game-bird-sheet[open]')||root.querySelector('[data-crow-phase=warning]')||crowScene(current)||current.encounters.garden.id!==gardenId||raptorTarget(current)?.id!==targetId||!root.querySelector('.finch-garden-stage[data-scene-state=ready]'))return current;
      result=arriveGardenRaptor(current,event.id,Date.now(),{worldId:current.worldId,revision:current.revision,gardenId});
     }
     return current;
    });
    if(alive){const structural=renderedScene!==sceneKey(getWorld());renderedScene=sceneKey(getWorld());onChange({result,structural,world:getWorld()});if(!active&&!result?.changed)clock.reset();}
   }catch(error){if(alive)onChange({error,structural:false,world:getWorld()});if(!active)clock.reset();}
   finally{flight=false;}
  }
  schedule();
 }
 function schedule(){if(alive)timer=win.setTimeout(poll,1000);}
 const viewChanged=event=>{if(event.type==='buncho-game-garden'){if(event.detail?.gardenId===lastGarden)return;lastGarden=event.detail?.gardenId;}else if(event.type==='buncho-game-panel'){if(event.detail===lastPanel)return;lastPanel=event.detail;}else if(event.detail?.mode==='garden')return;if(!getWorld().encounters.raptor?.active)interrupt();};
 const modalObserver=win.MutationObserver?new win.MutationObserver(records=>{if(!getWorld().encounters.raptor?.active&&records.some(r=>r.target.matches?.('.game-bird-sheet')))interrupt();}):null;
 // Begin at actual ready visibility rather than adding a whole polling second.
 const primeEntry=()=>{const w=getWorld();entryClock.prime({key:`${w.worldId}:${w.encounters.garden.id}:${raptorTarget(w)?.id}`,now:win.performance.now(),eligible:visible()&&w.encounters.garden.open&&!!root.querySelector('.finch-garden-stage[data-scene-state=ready]')&&!doc.querySelector('.game-bird-sheet[open]')});};
 const readyObserver=win.MutationObserver?new win.MutationObserver(primeEntry):null;
 readyObserver?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-scene-state']});primeEntry();
 if(doc.documentElement)modalObserver?.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
 doc.addEventListener('buncho-game-garden',viewChanged);doc.addEventListener('buncho-game-panel',viewChanged);doc.addEventListener('buncho-game-encounter-view',viewChanged);
 doc.addEventListener('visibilitychange',interrupt);doc.addEventListener('buncho-game-view-visibility',interrupt);win.addEventListener('offline',interrupt);win.addEventListener('pagehide',interrupt);schedule();
 return {poll,reset:interrupt,destroy(){alive=false;interrupt();modalObserver?.disconnect();readyObserver?.disconnect();doc.removeEventListener('buncho-game-garden',viewChanged);doc.removeEventListener('buncho-game-panel',viewChanged);doc.removeEventListener('buncho-game-encounter-view',viewChanged);win.clearTimeout(timer);doc.removeEventListener('visibilitychange',interrupt);doc.removeEventListener('buncho-game-view-visibility',interrupt);win.removeEventListener('offline',interrupt);win.removeEventListener('pagehide',interrupt);}};
}

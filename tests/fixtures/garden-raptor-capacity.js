import {createWorld,createBird,validateWorld} from '../../src/engine.js';
import {encounterSystem,getGardenVisitingBird} from '../../src/encounters.js';
import {arriveGardenRaptor,escapeGardenRaptor,raptorToken} from '../../src/garden-raptors.js';

export const RAPTOR_CAPACITY_NOW=Date.UTC(2026,10,18,9)+120001;
const origin=RAPTOR_CAPACITY_NOW-120001;
const garden='mizukagami';
export function gardenRaptorCapacity({species='common-kestrel',knownVisitor=false,warning=false}={}){
 for(let i=0;i<70;i++){
  const w=createWorld(origin,10);w.worldId='raptor-repro-'+i;w.settings.motion=false;w.settings.careSound=false;
  const s=encounterSystem,t=()=>({worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});
  const companion=knownVisitor?null:createBird(w,{home:'resident',stage:'adult'});
  if(knownVisitor){
   const f=s.catalog.find(e=>e.id==='gouldian-finch');s.selectGarden(w,f.gardenEvent.gardenIds[0],t());s.observeGarden(w,f.gardenEvent.scene,t());
   s.open(w,f.id,t());for(const step of f.steps)s.act(w,w.encounters.active.instanceId,step.action,t());
   w.encounters.friendship=[{id:f.id,petPoints:50}];s.leaveGarden(w,t());
  }
  s.chooseCompanions(w,companion?['b1',companion.id]:['b1'],t());s.chooseAccompaniment(w,true,t());s.selectGarden(w,garden,t());
  if(species!=='osprey'&&!warning){
   if(!arriveGardenRaptor(w,'common-kestrel',origin,t()).hostile)throw Error('fixture requires an initial hazard');
   escapeGardenRaptor(w,raptorToken(w));s.selectGarden(w,garden,t());
  }
  const native=s.catalog.find(e=>e.gardenEvent.gardenIds.includes(garden));s.observeGarden(w,native.gardenEvent.scene,t());
  if(knownVisitor&&!getGardenVisitingBird(w))continue;
  const arrival=arriveGardenRaptor(w,species,RAPTOR_CAPACITY_NOW,t());
  if(!arrival.changed||arrival.hostile!==warning||w.encounters.raptor.active.targetBirdId!=='b1')throw Error('unexpected raptor in capacity fixture');
  // The session was saved after the second arrival. Avoid normal load-time
  // clock catch-up advancing bird social life before the presentation assertion.
  w.lastUpdated=RAPTOR_CAPACITY_NOW;
  w.field={place:'park',hostId:null,enteredTick:w.tick};
  return {w:validateWorld(w),companionId:companion?.id,nativeId:native.id,visitorId:getGardenVisitingBird(w)?.id??null};
 }
 throw Error('deterministic visitor not found');
}

import {pathToFileURL} from 'node:url';
export const root=process.env.BOOKLET_SOURCE_ROOT?pathToFileURL(process.env.BOOKLET_SOURCE_ROOT+'/'):new URL('../../',import.meta.url);
export const load=path=>import(new URL('src/'+path,root));
export const engine=await load('engine.js'),crow=await load('garden-crows.js'),raptor=await load('garden-raptors.js');
export const {GARDENS,OLD_GARDEN_IDS}=await load('data/gardens.js');
export const NOW=Date.UTC(2026,10,8,9);
export const cases=['solo','attending','other-family','departed','chick','egg','dead','crow-warning','crow-hostile','crow-targetless','crow-friendly','crow-cooldown','raptor-hostile','raptor-targetless','raptor-friendly','osprey','settings-after-warning','legacy-warning'];
export function fixture(kind='solo',gardenId=GARDENS[0].id){
 let w=engine.createWorld(NOW,42);w.encounters.garden.open=true;w.encounters.garden.id=gardenId;w.field.place='park';w.settings.motion=false;w.settings.careSound=false;
 const attending=['attending','crow-hostile','crow-friendly','raptor-hostile','raptor-friendly','osprey','settings-after-warning','legacy-warning'].includes(kind);
 Object.assign(w.encounters.gardenFriends,{accompany:attending,companions:attending?['b1']:[],attendees:attending?['b1']:[]});
 if(kind==='other-family'){const other=engine.createBird(w,{home:'resident'});w.encounters.gardenFriends.attendees=[other.id];}
 if(kind==='departed')w.birds[0].home='departed';
 if(['chick','egg'].includes(kind))w.birds[0].stage=kind;
 if(kind==='dead')throw new Error('dead fixture requires async fixtureWithLife');
 const token=()=>({...raptor.raptorToken(w),gardenId:w.encounters.garden.id});
 // Navigation/focus alone uses naturally completed visits, keeping both entry
 // lotteries in their normal cooldown without changing clocks or random draws.
 if(kind==='navigation-cooldown'){
  const past=NOW-90000;
  if(!raptor.arriveGardenRaptor(w,'black-kite',past,token()).changed)throw Error('navigation raptor history failed');
  for(let elapsed=2000;elapsed<=raptor.RAPTOR_RULES.visitMs;elapsed+=2000)
   if(!engine.advanceGardenRaptor(w,2000,past+elapsed,raptor.raptorToken(w)).changed)throw Error('navigation raptor completion failed');
  if(!crow.arriveGardenCrow(w,'large-billed-crow',NOW-60000,token()).changed)throw Error('navigation crow history failed');
  if(crow.crowScene(w,NOW)||raptor.raptorScene(w)||!crow.crowCoolingDown(w,NOW)||!raptor.raptorCoolingDown(w,NOW))throw Error('navigation cooldown failed');
 }
 if(kind.startsWith('crow-')&&kind!=='crow-warning'){
  if(!crow.arriveGardenCrow(w,'large-billed-crow',NOW,token()).changed)throw Error('crow arrival failed');
  if(kind==='crow-friendly')for(let n=0;n<13;n++)crow.petGardenCrow(w,'large-billed-crow',8,token());
 }
 if(kind.startsWith('raptor-')||['osprey','settings-after-warning','legacy-warning'].includes(kind)){
  if(kind==='osprey')w.encounters.garden.id='mizukagami';
  if(!raptor.arriveGardenRaptor(w,kind==='osprey'?'osprey':'black-kite',NOW,token()).changed)throw Error('raptor arrival failed');
  if(kind==='raptor-friendly')for(let n=0;n<13;n++)raptor.petGardenRaptor(w,'black-kite',8,raptor.raptorToken(w));
  if(kind==='settings-after-warning')Object.assign(w.encounters.gardenFriends,{accompany:false,companions:[]});
  if(kind==='legacy-warning'){w.encounters.version=12;w.encounters.garden.visits=Object.fromEntries(OLD_GARDEN_IDS.map(id=>[id,w.encounters.garden.visits[id]]));w=engine.readCompatibleWorld(w,NOW);}
 }
 engine.validateWorld(w);if(engine.serializeWorld(engine.parseSave(engine.serializeWorld(w)))!==engine.serializeWorld(w))throw Error('round trip mismatch');return w;
}
const life=await load('life-care.js');
export function worldFor(kind,gardenId){if(kind!=='dead')return fixture(kind,gardenId);const w=fixture('solo',gardenId);life.accidentLifeBird(w,'b1',NOW);return engine.validateWorld(w);}
export const at=kind=>kind==='crow-cooldown'?NOW+60000:NOW;
export const options=kind=>({now:at(kind),crowWarning:kind==='crow-warning'?{}:null});

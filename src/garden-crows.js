import {gardenCompanionRoster} from './data/gardens.js';
import {getProtagonistBird} from './protagonist.js';
/** Crow visits are game fiction. Only visible, continuous garden time qualifies.
 * This clock has no access to the world's PRNG, offline progress or storage. */
import {isAlive} from './life-care.js';
export const CROW_RULES=Object.freeze({dwellMs:120000,checkMs:15000,chance:.2,warningMs:6000,cooldownMs:600000,visitMs:18000,retreatMs:45000,maxSampleGapMs:2500,friendPoints:100,maxPetPoints:1000000});
export const JAVA_LENGTH_CM=14;
export const CROW_SPECIES=Object.freeze([
 {id:'large-billed-crow',name:'ハシブトガラス',scientific:'Corvus macrorhynchos',lengthCm:56,description:'太く湾曲したくちばしと、額の盛り上がりが特徴。日本でもよく見られます。'},
 {id:'carrion-crow',name:'ハシボソガラス',scientific:'Corvus corone',lengthCm:50,description:'ハシブトガラスより細めのくちばしと、なだらかな額が特徴。日本でもよく見られます。'},
 {id:'rook',name:'ミヤマガラス',scientific:'Corvus frugilegus',lengthCm:47,description:'成鳥はくちばしの付け根の皮膚が白っぽく見えます。幼鳥とは見た目が異なります。'},
 {id:'common-raven',name:'ワタリガラス',scientific:'Corvus corax',lengthCm:63,range:'56〜69',description:'大きなくちばし、喉の長めの羽と、くさび形の尾が特徴。表示は全長の代表値63cmです。'},
 {id:'hooded-crow',name:'ズキンガラス',scientific:'Corvus cornix',lengthCm:46,range:'45〜47',description:'灰色の胴と黒い頭・翼・尾の組み合わせが特徴。ヨーロッパなどに分布します。'}
].map(s=>Object.freeze(s)));
export function crowTarget(world){
 const bird=getProtagonistBird(world);
 return bird&&bird.home==='resident'&&['juvenile','adult'].includes(bird.stage)&&isAlive(world,bird)&&gardenCompanionRoster(world).some(b=>b.birdId===bird.id)?bird:null;
}
export const crowSpecies=id=>CROW_SPECIES.find(s=>s.id===id)||null;
export const initialCrowState=()=>({lastArrivalAt:null,gardenId:null,speciesId:null,arrivalBirdId:null,lastHostile:false,visits:[]});
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validateCrowState(s,tick,gardenIds){
 const fail=()=>{throw new Error('カラスとの出会いの記録が不正です。');};
 if(!shape(s,['lastArrivalAt','gardenId','speciesId','arrivalBirdId','lastHostile','visits'])||typeof s.lastHostile!=='boolean'||!Array.isArray(s.visits)||s.visits.length>CROW_SPECIES.length||new Set(s.visits.map(v=>v?.id)).size!==s.visits.length)fail();
 if(s.lastArrivalAt===null){if(s.gardenId!==null||s.speciesId!==null||s.arrivalBirdId!==null||s.lastHostile||s.visits.length)fail();}
 else if(!int(s.lastArrivalAt,0,8640000000000000)||!gardenIds.includes(s.gardenId)||!crowSpecies(s.speciesId)||!/^b[1-9][0-9]*$/.test(s.arrivalBirdId)||!s.visits.some(v=>v.id===s.speciesId))fail();
 for(const v of s.visits)if(!shape(v,['id','firstTick','lastTick','count','petPoints'])||!crowSpecies(v.id)||!int(v.firstTick,0,tick)||!int(v.lastTick,v.firstTick,tick)||!int(v.count,1,1000000)||!int(v.petPoints,0,CROW_RULES.maxPetPoints))fail();
 return s;
}
/** Species-specific kindness stays in the separate crow notebook. */
export function crowFriendship(world,id){
 const visit=world.encounters?.crow?.visits.find(v=>v.id===id),points=visit?.petPoints||0;
 return {discovered:!!visit,points,friendly:!!visit&&points>=CROW_RULES.friendPoints};
}
export function petGardenCrow(world,id,amount,expected){
 if(!expected||expected.worldId!==world.worldId||expected.revision!==world.revision)return {changed:false,reason:'stale'};
 const s=world.encounters?.crow,visit=s?.visits.find(v=>v.id===id);
 if(!crowSpecies(id)||!visit||!int(amount,1,8))return {changed:false,reason:'locked'};
 const gain=Math.min(amount,CROW_RULES.maxPetPoints-visit.petPoints);
 if(!gain)return {changed:false,reason:'full',message:'ずっとなかよしだよ。'};
 visit.petPoints+=gain;
 const friendly=visit.petPoints>=CROW_RULES.friendPoints;
 if(friendly&&s.speciesId===id)s.lastHostile=false;
 world.revision=world.revision===Number.MAX_SAFE_INTEGER?0:world.revision+1;
 return {changed:true,points:visit.petPoints,friendly,message:friendly?'なかよしになったよ。もう文鳥を驚かせないよ。':`親しみ +${gain} ♪`};
}
export function crowScene(world,now=Date.now()){
 const s=world.encounters?.crow;
 if(!s||s.lastArrivalAt===null||s.gardenId!==world.encounters.garden.id)return null;
 const bird=crowTarget(world);if(!bird||bird.id!==s.arrivalBirdId)return null;
 const elapsed=Math.max(0,now-s.lastArrivalAt);
 if(elapsed>=CROW_RULES.retreatMs)return null;
 return {species:crowSpecies(s.speciesId),phase:elapsed<CROW_RULES.visitMs?'visiting':'quiet',retreat:s.lastHostile};
}
export function crowCoolingDown(world,now=Date.now()){
 const t=world.encounters?.crow?.lastArrivalAt;
 return t!=null&&now-t<CROW_RULES.cooldownMs;
}
/** Must execute inside the host's single atomic store transaction. */
export function arriveGardenCrow(world,id,now,expected){
 const g=world.encounters.garden,s=world.encounters.crow,bird=crowTarget(world);
 if(!s||!expected||expected.worldId!==world.worldId||expected.revision!==world.revision||expected.gardenId!==g.id)return {changed:false,reason:'stale'};
 if(world.encounters.raptor?.active)return {changed:false,reason:'busy'};
 if(!g.open||world.paused||!bird||!crowSpecies(id)||!int(now,0,8640000000000000))return {changed:false,reason:'inactive'};
 if(crowCoolingDown(world,now))return {changed:false,reason:'cooldown'};
 const before=bird.needs.energy,hostile=!crowFriendship(world,id).friendly;if(hostile)bird.needs.energy=Math.max(0,before/2);
 s.lastArrivalAt=now;s.gardenId=g.id;s.speciesId=id;s.arrivalBirdId=bird.id;s.lastHostile=hostile;
 const visit=s.visits.find(v=>v.id===id);
 if(visit){visit.lastTick=world.tick;visit.count=Math.min(1000000,visit.count+1);}else s.visits.push({id,firstTick:world.tick,lastTick:world.tick,count:1,petPoints:0});
 world.revision=world.revision===Number.MAX_SAFE_INTEGER?0:world.revision+1;
 return {changed:true,id,hostile,energyBefore:before,energyAfter:bird.needs.energy,message:hostile?`${crowSpecies(id).name}が来たよ。友達は安全な場所へ。${bird.name}はびっくりして元気が半分に。おうちでお世話すると回復できるよ。`:`${crowSpecies(id).name}が遊びに来たよ。もうなかよしだから、みんな安心していっしょに過ごせるよ。`};
}
export function createGardenCrowClock({random=Math.random}={}){
 let key=null,last=null,elapsed=0,nextCheck=CROW_RULES.dwellMs,warning=null,fired=false;
 const reset=()=>{key=null;last=null;elapsed=0;nextCheck=CROW_RULES.dwellMs;warning=null;fired=false;};
 return {reset,startWarning(id,now){
   if(!crowSpecies(id)||!Number.isFinite(now)||warning||fired)return false;
   // The shared entry clock has already qualified the visible garden. Anchor
   // this warning now, including when its regular clock has not sampled yet.
   last=now;warning={id,at:elapsed};return true;
 },holdWarning(now){if(warning&&Number.isFinite(now))last=now;},get warning(){return warning?.id||null;},get elapsed(){return elapsed;},sample({key:nextKey,now,eligible,available=true}){
   if(!eligible||!Number.isFinite(now)){reset();return null;}
   if(nextKey!==key||last===null){reset();key=nextKey;last=now;return null;}
   const delta=now-last;last=now;
   // Hidden tabs, suspended computers and delayed timers never catch up.
   if(delta<0||delta>CROW_RULES.maxSampleGapMs){reset();key=nextKey;last=now;return null;}
   elapsed+=delta;
   if(fired)return null;
   if(!available){warning=null;nextCheck=Math.max(nextCheck,elapsed+CROW_RULES.checkMs);return null;}
   if(warning){if(elapsed-warning.at>=CROW_RULES.warningMs){const id=warning.id;warning=null;fired=true;return {kind:'arrive',id};}return null;}
   if(elapsed<nextCheck)return null;
   nextCheck=elapsed+CROW_RULES.checkMs;
   if(random()>=CROW_RULES.chance)return null;
   const id=CROW_SPECIES[Math.min(CROW_SPECIES.length-1,Math.max(0,Math.floor(random()*CROW_SPECIES.length)))].id;
   warning={id,at:elapsed};return {kind:'warning',id};
 }};
}

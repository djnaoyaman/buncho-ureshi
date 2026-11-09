import {allBirds,activateBird} from './world-birds.js';
/** Fictional game lifecycle. Real birds need prompt veterinary assessment, not these timers.
 * Pure state operations; invoke only inside the game's fresh-state transaction.
 */
const HOUR = 3600000, DAY = HOUR * 24, MAX_TIME = 253402268399999;
export const LIFE_RULES = Object.freeze({yearTicks:8760,lifespanTicks:87600,neglectMs:3*DAY,treatmentMs:DAY,exposureMs:DAY,caretakerDailyGold:24,hospitalGold:12,memorialCooldownMs:60000,maxContractDays:30});
const CONDITIONS = Object.freeze({respiratory:'呼吸器の病気',digestive:'おなかの病気',injury:'けんかのけが'});
const CAUSES = ['lifespan','neglect','illness','injury','accident'];
const integer = (n, lo=0, hi=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const shape = (v, keys) => v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const time = n => {if(!integer(n,0,MAX_TIME))throw new Error('端末の日時を確認してください。');return n;};
export function lifeStatus(world,bird) {return world.lifecycle?.birds.find(s=>s.birdId===(typeof bird==='string'?bird:bird?.id))??null;}
export function isAlive(world,bird) {return !!bird&&!lifeStatus(world,bird)?.death;}
export function conditionName(kind) {return CONDITIONS[kind]||'体調の変化';}
export function ageTicks(world,bird) {const s=lifeStatus(world,bird);return s?Math.max(0,(s.death?.tick??world.tick)-s.ageOriginTick+s.initialAgeTicks):Math.max(0,world.tick-bird.bornTick);}
export function ageLabel(world,bird) {const days=Math.floor(ageTicks(world,bird)/24);return `${Math.floor(days/365)}年${days%365}日（ゲーム内）`;}
export function caretakerStatus(world) {const c=world.lifecycle?.caretaker,now=world.lifecycle?.seenAt??0;return {active:!!c&&now<c.until,until:c?.until??null,remainingMs:Math.max(0,(c?.until??now)-now)};}
function status(bird,world,now,legacy=false){return {birdId:bird.id,ageOriginTick:legacy?world.tick:bird.bornTick,initialAgeTicks:legacy?Math.min(world.tick-bird.bornTick,9*LIFE_RULES.yearTicks):0,lastCareAt:now,condition:null,death:null,dirtySinceAt:null,lowSinceAt:null,lastRecoveredAt:null,conflicts:0,lastConflictAt:null,incenseCount:0,prayerCount:0,lastIncenseAt:null,lastPrayerAt:null};}
export function initializeLifecycle(world,now,legacy=false){
 time(now);if(world.lifecycle)return false;
 world.lifecycle={version:1,seenAt:now,caretaker:null,birds:allBirds(world).map(b=>status(b,world,now,legacy)),migrated:legacy};return true;
}
export function registerLifeBird(world,bird){if(world.lifecycle&&!lifeStatus(world,bird))world.lifecycle.birds.push(status(bird,world,world.lifecycle.seenAt));}
function resetExposure(s){s.dirtySinceAt=null;s.lowSinceAt=null;s.conflicts=0;}
function die(world,bird,s,cause,at){
 if(s.death)return null;s.death={cause,at,tick:world.tick};s.condition=null;resetExposure(s);bird.home='departed';
 // Keep identities, ancestry, relationships and all history. Departed != dead in views.
 if(bird.partner){const partner=allBirds(world).find(b=>b.id===bird.partner);if(partner){partner.partner=null;partner.pairTick=null;}bird.partner=null;bird.pairTick=null;}
 bird.action={kind:'rest',target:null,startedTick:world.tick};
 world.gems.droppings=world.gems.droppings.filter(d=>d.birdId!==bird.id);
 if(world.adoption.pending?.birdId===bird.id)world.adoption.pending=null;
 if(world.field.place==='friend'&&world.field.hostId===bird.id)world.field={place:'home',hostId:null,enteredTick:world.tick};
 return {kind:'death',birdId:bird.id,cause};
}
/** Fictional accident uses the same memorial and relationship-preserving death path. */
export function accidentLifeBird(world,birdId,now){
 time(now);const bird=allBirds(world).find(b=>b.id===birdId),s=lifeStatus(world,birdId);
 if(!bird||!s||s.death||bird.home!=='resident')return null;
 const at=Math.max(now,world.lifecycle.seenAt);world.lifecycle.seenAt=at;
 return die(world,bird,s,'accident',at);
}
function recover(bird,s,at){s.condition=null;s.lastRecoveredAt=at;resetExposure(s);bird.needs.food=Math.max(80,bird.needs.food);bird.needs.energy=Math.max(80,bird.needs.energy);}
/** Next known real deadline; observation-only illness is never inferred here. */
export function nextLifecycleDeadline(world,after){
 let next=Infinity;const contract=world.lifecycle?.caretaker;
 if(contract?.until>after)next=contract.until;
 for(const bird of allBirds(world)){
  const s=lifeStatus(world,bird);if(!s||s.death||bird.home!=='resident')continue;
  const covered=contract&&contract.fromAt<=after?Math.min(after,contract.until):s.lastCareAt;
  for(const at of [Math.max(s.lastCareAt,covered)+LIFE_RULES.neglectMs,s.condition?.deadlineAt]){
   if(at>after&&at<=MAX_TIME)next=Math.min(next,at);
  }
 }
 return next;
}
/** Settle known real deadlines and age at the supplied chronological checkpoint.
 * Newly discovered illness always gets a full visible treatment window; never infer a
 * retroactive diagnosis/death from an unobserved exposure interval.
 */
export function syncLifecycle(world,now,{story=false,observe=true}={}){
 time(now);if(!world.lifecycle)initializeLifecycle(world,now);
 const l=world.lifecycle;if(now<l.seenAt)return {changed:false,events:[],rollback:true};
 let changed=now!==l.seenAt;l.seenAt=now;const events=[],contract=l.caretaker,states=new Map(l.birds.map(s=>[s.birdId,s]));
 for(const bird of allBirds(world)){let s=states.get(bird.id);if(!s){registerLifeBird(world,bird);s=lifeStatus(world,bird);changed=true;}if(s.death)continue;
  if(story&&world.tick-s.ageOriginTick+s.initialAgeTicks>=LIFE_RULES.lifespanTicks&&bird.stage!=='egg'){events.push(die(world,bird,s,'lifespan',now));changed=true;continue;}
  if(bird.home!=='resident'){if(s.dirtySinceAt!==null||s.lowSinceAt!==null){resetExposure(s);changed=true;}continue;}
  const coveredUntil=contract&&now>=contract.fromAt?Math.min(now,contract.until):null;
  if(coveredUntil!==null&&coveredUntil>=s.lastCareAt&&coveredUntil>=contract.fromAt){
   if(coveredUntil>s.lastCareAt){s.lastCareAt=coveredUntil;changed=true;}
   if(s.condition&&s.condition.sinceAt<=coveredUntil){recover(bird,s,coveredUntil);events.push({kind:'caretaker-treatment',birdId:bird.id});changed=true;}
   if(now<=contract.until){if(observe){if(bird.needs.food<100||bird.needs.energy<100||world.care.cleanliness<100)changed=true;bird.needs.food=100;bird.needs.energy=100;world.care.cleanliness=100;}resetExposure(s);continue;}
  }
  const hungry=s.lastCareAt+LIFE_RULES.neglectMs,untreated=s.condition?.deadlineAt??Infinity;
  if(Math.min(hungry,untreated)<=now){const cause=untreated<=hungry?(s.condition.kind==='injury'?'injury':'illness'):'neglect';events.push(die(world,bird,s,cause,Math.min(hungry,untreated)));changed=true;continue;}
  if(!observe||s.condition||['egg','chick'].includes(bird.stage))continue;
  // A treatment gives a full real day without recurrence.
  if(s.lastRecoveredAt!==null&&now-s.lastRecoveredAt<DAY)continue;
  const dirty=world.care.cleanliness<=20,low=bird.needs.food<=40&&bird.needs.energy<=40;
  for(const [key,risk] of [['dirtySinceAt',dirty],['lowSinceAt',low]]){const next=risk?(s[key]??now):null;if(next!==s[key]){s[key]=next;changed=true;}}
  const kind=s.dirtySinceAt!==null&&now-s.dirtySinceAt>=LIFE_RULES.exposureMs?'respiratory':s.lowSinceAt!==null&&now-s.lowSinceAt>=LIFE_RULES.exposureMs?'digestive':null;
  if(kind&&now<=MAX_TIME-LIFE_RULES.treatmentMs){s.condition={kind,sinceAt:now,deadlineAt:now+LIFE_RULES.treatmentMs};resetExposure(s);events.push({kind:'illness',birdId:bird.id,condition:kind});changed=true;}
 }
 return {changed,events:events.filter(Boolean),rollback:false};
}
export function noteLifeFeeding(world,bird,now){
 const s=lifeStatus(world,bird);if(!s||s.death||bird.home!=='resident')return false;
 s.lastCareAt=Math.max(time(now),world.lifecycle.seenAt,s.lastCareAt);s.lowSinceAt=null;
 // Dependent nestlings share their parents' food; never reward this automatic care.
 for(const child of allBirds(world).filter(b=>b.home==='resident'&&['egg','chick'].includes(b.stage)&&b.parents.includes(bird.id))){const c=lifeStatus(world,child);if(c&&!c.death)c.lastCareAt=Math.max(c.lastCareAt,s.lastCareAt);}
 return true;
}
/** Three territorial refusals in an overcrowded household may cause a game injury.
 * No extra story PRNG calls, no danger assigned to ordinary polite refusal/visitors.
 */
export function noteLifeConflict(world,a,b){
 const now=world.lifecycle?.seenAt;if(now===undefined||caretakerStatus(world).active||allBirds(world).filter(x=>x.home==='resident').length<6)return null;
 if(a.home!=='resident'||b.home!=='resident'||a.relations[b.id]?.compatibility>=60)return null;
 const s=lifeStatus(world,a);if(!s||s.death||s.condition||(s.lastRecoveredAt!==null&&now-s.lastRecoveredAt<DAY))return null;
 if(s.lastConflictAt!==null&&now-s.lastConflictAt>=DAY)s.conflicts=0;
 s.lastConflictAt=now;s.conflicts=Math.min(3,s.conflicts+1);
 if(s.conflicts<3||now>MAX_TIME-DAY)return null;
 s.condition={kind:'injury',sinceAt:now,deadlineAt:now+DAY};resetExposure(s);return {kind:'illness',birdId:a.id,condition:'injury'};
}
const current=(w,t)=>t&&w.worldId===t.worldId&&w.revision===t.revision;
const stale=()=>({changed:false,message:'おうちが変わったよ。もう一度選んでね。'});
export function treatLifeBird(world,birdId,token,now){
 if(!current(world,token))return stale();time(now);
 const s=lifeStatus(world,birdId),b=allBirds(world).find(x=>x.id===birdId);
 if(!b||!s||s.death||!s.condition||b.home!=='resident')return {changed:false,message:'治療が必要な仲間はいないよ。'};
 if(world.economy.gold<LIFE_RULES.hospitalGold)return {changed:false,message:`診療は${LIFE_RULES.hospitalGold} Gold。お世話で貯められるよ。`};
 world.economy.gold-=LIFE_RULES.hospitalGold;recover(b,s,Math.max(now,world.lifecycle.seenAt));
 return {changed:true,goldSpent:LIFE_RULES.hospitalGold,message:`${b.name}が病院で治療を受けて元気になったよ。`,event:{kind:'treatment',birdId:b.id}};
}
export function hireLifeCaretaker(world,days,token,now){
 if(!current(world,token))return stale();time(now);
 if(![1,3,7].includes(days))throw new Error('1日・3日・7日から選んでね。');
 if(!allBirds(world).some(b=>b.home==='resident'&&isAlive(world,b)))return {changed:false,message:'おうちの仲間を迎えてからお願いしよう。'};
 const at=Math.max(now,world.lifecycle.seenAt),from=world.lifecycle.caretaker?.until>at?world.lifecycle.caretaker.until:at,until=from+days*DAY,cost=days*LIFE_RULES.caretakerDailyGold;
 if(until-at>LIFE_RULES.maxContractDays*DAY||until>MAX_TIME)return {changed:false,message:'先払いは合計30日分までだよ。'};
 if(world.economy.gold<cost)return {changed:false,message:`${days}日分は${cost} Gold。お世話で貯められるよ。`};
 world.economy.gold-=cost;world.lifecycle.caretaker={fromAt:world.lifecycle.caretaker?.until>at?world.lifecycle.caretaker.fromAt:at,until};
 return {changed:true,goldSpent:cost,message:`飼育員さんに${days}日分のお世話をお願いしたよ。`};
}
export function honorLifeBird(world,birdId,kind,token,now){
 if(!current(world,token))return stale();time(now);if(!['incense','prayer'].includes(kind))throw new Error('お線香かお祈りを選んでね。');
 const s=lifeStatus(world,birdId);if(!s?.death)return {changed:false,message:'思い出の庭から仲間を選んでね。'};
 const last=kind==='incense'?'lastIncenseAt':'lastPrayerAt',count=kind==='incense'?'incenseCount':'prayerCount',at=Math.max(now,world.lifecycle.seenAt);
 if(s[last]!==null&&at-s[last]<LIFE_RULES.memorialCooldownMs)return {changed:false,message:'静かな時間を、少しだけいっしょに。'};
 s[last]=at;s[count]=Math.min(Number.MAX_SAFE_INTEGER,s[count]+1);
 return {changed:true,message:kind==='incense'?'お線香を供えました。ここでの思い出は、ずっと残ります。':'手を合わせました。いっしょに過ごした日々を想います。'};
}
export function validateLifecycle(world){
 const fail=()=>{throw new Error('保存データを読み込めません：健康とお墓の情報が不正です。');},l=world.lifecycle;
 if(!shape(l,['version','seenAt','caretaker','birds','migrated'])||l.version!==1||!integer(l.seenAt,0,MAX_TIME)||typeof l.migrated!=='boolean'||!Array.isArray(l.birds)||l.birds.length!==allBirds(world).length)fail();
 const c=l.caretaker;if(c!==null&&(!shape(c,['fromAt','until'])||!integer(c.fromAt,0,l.seenAt)||!integer(c.until,c.fromAt+1,MAX_TIME)||c.until-l.seenAt>LIFE_RULES.maxContractDays*DAY))fail();
 const ids=new Set();for(const s of l.birds){
  const b=allBirds(world).find(x=>x.id===s.birdId);
  if(!shape(s,['birdId','ageOriginTick','initialAgeTicks','lastCareAt','condition','death','dirtySinceAt','lowSinceAt','lastRecoveredAt','conflicts','lastConflictAt','incenseCount','prayerCount','lastIncenseAt','lastPrayerAt'])||!b||ids.has(s.birdId)||!integer(s.ageOriginTick,b.bornTick,world.tick)||!integer(s.initialAgeTicks,0,9*LIFE_RULES.yearTicks)||!integer(s.lastCareAt,0,l.seenAt)||!integer(s.conflicts,0,3)||!integer(s.incenseCount)||!integer(s.prayerCount))fail();
  ids.add(s.birdId);for(const key of ['dirtySinceAt','lowSinceAt','lastRecoveredAt','lastConflictAt','lastIncenseAt','lastPrayerAt'])if(s[key]!==null&&!integer(s[key],0,l.seenAt))fail();
  if((s.incenseCount===0)!==(s.lastIncenseAt===null)||(s.prayerCount===0)!==(s.lastPrayerAt===null))fail();
  if(s.condition!==null){const q=s.condition;if(!shape(q,['kind','sinceAt','deadlineAt'])||!Object.hasOwn(CONDITIONS,q.kind)||!integer(q.sinceAt,0,l.seenAt)||q.deadlineAt!==q.sinceAt+DAY||q.deadlineAt>MAX_TIME||s.death)fail();}
  if(s.death!==null){const d=s.death;if(!shape(d,['cause','at','tick'])||!CAUSES.includes(d.cause)||!integer(d.at,0,l.seenAt)||!integer(d.tick,s.ageOriginTick,world.tick)||b.home!=='departed'||s.lastIncenseAt!==null&&s.lastIncenseAt<d.at||s.lastPrayerAt!==null&&s.lastPrayerAt<d.at)fail();}
  else if(s.incenseCount||s.prayerCount)fail();
 }
 return l;
}
/** An explicit whole-save restore keeps its recorded remaining care/contract times.
 * It does not replay the backup's absence or merge wallet/death state with another save.
 */
export function rebaseLifecycleClock(world,now){
 time(now);const l=world.lifecycle,delta=Math.max(0,now-l.seenAt);if(!delta)return;
 const shift=value=>{if(value===null)return null;const shifted=value+delta;if(shifted>MAX_TIME)throw new Error('保存の期限が日時の上限を超えます。元の保存は変更していません。');return shifted;};
 for(const s of l.birds){if(s.death)continue;s.lastCareAt=shift(s.lastCareAt);for(const key of ['dirtySinceAt','lowSinceAt','lastRecoveredAt','lastConflictAt'])s[key]=shift(s[key]);if(s.condition){s.condition.sinceAt=shift(s.condition.sinceAt);s.condition.deadlineAt=shift(s.condition.deadlineAt);}}
 if(l.caretaker){l.caretaker.fromAt=shift(l.caretaker.fromAt);l.caretaker.until=shift(l.caretaker.until);}
 l.seenAt=now;
}

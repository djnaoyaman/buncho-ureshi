import {allBirds} from './world-birds.js';
import {careDay,careWindow} from './care-schedule.js';
const DAY=86400000,DEN=20*DAY,MAX=253402268399999;
export const RELAXED_CARE_RULES=Object.freeze({dailyDecay:30,floor:40,baseGems:30,extraGems:10,returnGraceMs:DAY});
const integer=(n,lo=0,hi=MAX)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export const relaxedBird=(w,id)=>w.careRules?.birds.find(b=>b.birdId===id);
export function registerRelaxedBird(w,b){if(w.careRules&&!relaxedBird(w,b.id))w.careRules.birds.push({birdId:b.id,at:w.careRules.seenAt,foodRemainder:0,energyRemainder:0,healthGraceUntil:0});}
export function initializeRelaxedCare(w,now){
 if(w.careRules)return false;
 w.careRules={version:1,startedAt:now,seenAt:now,day:careDay(now).date,lastBaseDay:null,extraUsed:0,extraRemainder:0,birds:[]};
 for(const b of allBirds(w))registerRelaxedBird(w,b);return true;
}
export function validateRelaxedCare(w){
 const r=w.careRules,fail=()=>{throw Error('保存データを読み込めません：新しいお世話の記録が不正です。');};
 if(!shape(r,['version','startedAt','seenAt','day','lastBaseDay','extraUsed','extraRemainder','birds'])||r.version!==1||!integer(r.startedAt)||!integer(r.seenAt,r.startedAt)||r.day!==careDay(r.seenAt).date||r.lastBaseDay!==null&&(!date(r.lastBaseDay)||r.lastBaseDay>r.day)||!integer(r.extraUsed,0,10)||!integer(r.extraRemainder,0,DEN-1)||r.extraUsed===10&&r.extraRemainder!==0||!Array.isArray(r.birds)||r.birds.length!==allBirds(w).length)fail();
 const ids=new Set(allBirds(w).map(b=>b.id)),seen=new Set();
 for(const s of r.birds){if(!shape(s,['birdId','at','foodRemainder','energyRemainder','healthGraceUntil'])||!ids.has(s.birdId)||seen.has(s.birdId)||!integer(s.at,r.startedAt,r.seenAt)||!integer(s.foodRemainder,0,DAY-1)||!integer(s.energyRemainder,0,DAY-1)||!integer(s.healthGraceUntil,0,Math.min(MAX,r.seenAt+DAY)))fail();seen.add(s.birdId);}
 return r;
}
/** O(birds), exact integer carry, no polling/feeding reset of elapsed time. */
export function syncRelaxedCare(w,now){
 const r=w.careRules;if(!r)return null;if(!integer(now))throw Error('端末の日時を確認してください。');
 if(now<r.seenAt)return {changed:false,renewed:false,rollback:true};
 let changed=now!==r.seenAt,renewed=false;
 const day=careDay(now).date;if(day>r.day){r.day=day;r.extraUsed=0;changed=true;}
 r.seenAt=now;
 const contract=w.lifecycle?.caretaker;
 for(const b of allBirds(w)){
  registerRelaxedBird(w,b);const s=relaxedBird(w,b.id);
  if(b.home==='departed'||!['juvenile','adult'].includes(b.stage)||w.lifecycle?.birds.find(x=>x.birdId===b.id)?.death){s.at=now;s.foodRemainder=s.energyRemainder=0;continue;}
  let from=s.at;
  if(contract&&contract.until>from&&contract.fromAt<=now){
   // Known paid interval restores bars; only time after its end can decrease them.
   b.needs.food=b.needs.energy=100;s.foodRemainder=s.energyRemainder=0;from=Math.min(now,contract.until);
  }
  const elapsed=now-from;
  for(const stat of ['food','energy']){
   const key=stat+'Remainder',before=b.needs[stat],bound=Math.min(before,40);
   // Saturate before multiplication for arbitrarily large supported clock jumps.
   const untilFloor=(before-bound)*DAY;
   const loss=elapsed>Math.ceil(untilFloor/30)?untilFloor:elapsed*30+s[key];
   const whole=Math.floor(loss/DAY);
   if(whole>=before-bound){b.needs[stat]=bound;s[key]=0;}else{b.needs[stat]=before-whole;s[key]=loss%DAY;}
   if(b.needs[stat]!==before)renewed=true;
  }
  s.at=now;
 }
 w.careSchedule.seenAt=Math.max(w.careSchedule.seenAt,now);w.careSchedule.windowAt=careWindow(w.careSchedule.seenAt).at;
 return {changed,renewed,rollback:false};
}
export function awardCareExtra(w,units){
 const r=w.careRules;if(!r)return null;
 if(r.extraUsed>=10)return 0;
 const total=r.extraRemainder+Math.round(units),amount=Math.min(10-r.extraUsed,Math.floor(total/DEN));
 r.extraUsed+=amount;r.extraRemainder=r.extraUsed===10?0:total% DEN;return amount;
}
export function applyRelaxedCare(w,bird,kind,now,text=''){
 const sync=syncRelaxedCare(w,now),stat=kind==='feed'?'food':'energy',s=relaxedBird(w,bird.id),before=bird.needs[stat];
 if(kind==='talk'&&!String(text).trim())return {changed:false,reason:'empty',gemAward:0,before,after:before,scheduleChanged:sync.changed};
 if(before>=100)return {changed:false,reason:'full',gemAward:0,before,after:before,scheduleChanged:sync.changed};
 const after=Math.min(100,before+20),key=stat+'Remainder';
 const recovered=(after-before)*DAY+(after===100?s[key]:0);if(after===100)s[key]=0;
 bird.needs[stat]=after;
 return {changed:true,reason:'success',before,after,recovered:recovered/DAY,gemAward:awardCareExtra(w,recovered*(kind==='feed'?6:5)),scheduleChanged:sync.changed};
}
export function careBaseStatus(w){if(w.decor.points>999999970)return {ready:false,message:'Gemsのもちものがいっぱいだよ。'};return {ready:w.careRules.lastBaseDay!==w.careRules.day,message:w.careRules.lastBaseDay===w.careRules.day?'きょうの30 Gemsは、うけとったよ。':'すきなときに、きょうの30 Gemsをうけとろう。'};}
export function takeCareBase(w){const r=w.careRules;if(!careBaseStatus(w).ready)return 0;r.lastBaseDay=r.day;return 30;}
/** Preserve actual meal/diagnosis stamps. Only an unobserved overdue health result
 * receives a return grace. Lifespan, accidents and recorded deaths are unaffected. */
export function protectAbsentCare(w,now){
 if(!w.careRules)return false;let changed=false;
 for(const b of allBirds(w)){
  const life=w.lifecycle.birds.find(s=>s.birdId===b.id),s=relaxedBird(w,b.id);if(!life||life.death||b.home!=='resident')continue;
  const c=w.lifecycle.caretaker,covered=c&&c.fromAt<=now?Math.min(now,c.until):0;
  const deadline=Math.min(Math.max(life.lastCareAt,covered)+3*DAY,life.condition?.deadlineAt??Infinity);
  const target=Math.min(MAX,now+DAY);
  if(Math.max(deadline,s.healthGraceUntil)<target||target===MAX&&deadline<=MAX&&s.healthGraceUntil!==MAX){s.healthGraceUntil=target;changed=true;}
 }
 return changed;
}
export const effectiveHealthDeadline=(w,s,at)=>{const grace=relaxedBird(w,s.birdId)?.healthGraceUntil??0;return Math.max(at,grace===MAX?MAX+1:grace);};
export function rebaseRelaxedCare(w,now){
 const r=w.careRules;if(!r)return;const delta=now-r.seenAt;
 for(const s of r.birds){s.at=now;if(s.healthGraceUntil)s.healthGraceUntil=Math.max(0,Math.min(MAX,s.healthGraceUntil+delta));}
 r.startedAt=Math.min(now,r.startedAt+delta);r.seenAt=now;r.day=careDay(now).date;
 if(r.lastBaseDay!==null)r.lastBaseDay=r.day; // A restore never opens a second current-day receipt.
}
export function reconcileRelaxedCare(incoming,current,now){
 const same=incoming.worldId===current.worldId,at=Math.max(now,incoming.careRules.seenAt,same?current.careRules.seenAt:0);
 const result=syncRelaxedCare(incoming,at);if(!same)return result;
 const snapshot=JSON.parse(JSON.stringify(current));syncRelaxedCare(snapshot,at);
 for(const b of allBirds(incoming)){const old=allBirds(snapshot).find(x=>x.id===b.id);if(!old||b.home==='departed'||old.home==='departed'||!['juvenile','adult'].includes(b.stage))continue;
  for(const stat of ['food','energy'])if(old.needs[stat]>b.needs[stat]){b.needs[stat]=old.needs[stat];relaxedBird(incoming,b.id)[stat+'Remainder']=relaxedBird(snapshot,b.id)[stat+'Remainder'];}
 }
 const a=incoming.careRules,b=snapshot.careRules;
 if(b.lastBaseDay!==null&&(a.lastBaseDay===null||b.lastBaseDay>a.lastBaseDay))a.lastBaseDay=b.lastBaseDay;
 if(a.day===b.day){a.extraUsed=Math.max(a.extraUsed,b.extraUsed);a.extraRemainder=a.extraUsed===10?0:Math.max(a.extraRemainder,b.extraRemainder);}
 return result;
}
export const careDropUnits=amount=>amount*DEN;

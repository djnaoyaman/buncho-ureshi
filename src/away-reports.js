import {careDay} from './care-schedule.js';
import {allBirds} from './world-birds.js';
import {isAlive} from './life-care.js';
const DAY=86400000,JST=32400000,MIN_ABSENCE=1800000,MAX_TIME=253402268399999;
const careTime=n=>{if(!Number.isSafeInteger(n)||n<0)throw new Error("端末の日時を確認してください。");return Math.min(n,MAX_TIME);};
const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_TIME;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export const initialAway=(seenAt=null)=>({version:1,seenAt,lastDay:null,readDay:null,reports:[]});
/** Called after the engine's descriptor-safe JSON preflight. Never repair malformed saves. */
export function validateAway(w){
 const a=w.away,fail=()=>{throw new Error('保存データを読み込めません：留守の記録が不正です。');};
 if(!shape(a,['version','seenAt','lastDay','readDay','reports'])||a.version!==1||a.seenAt!==null&&!time(a.seenAt)||a.lastDay!==null&&!date(a.lastDay)||a.readDay!==null&&!date(a.readDay)||!Array.isArray(a.reports)||a.reports.length>7)fail();
 const ids=new Set(allBirds(w).map(b=>b.id));let prev=null;
 for(const r of a.reports){
  if(!shape(r,['day','at','kind','birdId','name'])||!date(r.day)||!time(r.at)||r.at>a.seenAt||careDay(r.at).date!==r.day||prev!==null&&r.day<=prev||!['family','friend','garden'].includes(r.kind))fail();
  if(r.kind==='garden'?r.birdId!==null||r.name!==null:!ids.has(r.birdId)||typeof r.name!=='string'||!r.name.trim()||[...r.name].length>16)fail();
  prev=r.day;
 }
 if(a.lastDay!==prev||a.readDay!==null&&(a.lastDay===null||a.readDay>a.lastDay)||a.seenAt===null&&(a.lastDay!==null||a.readDay!==null))fail();
 return a;
}
export function notePresence(w,now){const at=careTime(now);if(w.away.seenAt===null||at>w.away.seenAt)w.away.seenAt=at;return w;}
export function captureAway(w){return {from:w.away.seenAt,paused:w.paused,birds:allBirds(w).filter(b=>isAlive(w,b)&&['juvenile','adult'].includes(b.stage)).map(b=>({id:b.id,name:b.name,home:b.home}))};}
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
/** Ambient reports only: no engine event, PRNG draw, social decision or reward. */
export function finishAway(w,context,now,{allowBirds=true}={}){
 const at=careTime(now),a=w.away;
 if(context.from!==null&&at>=context.from+MIN_ABSENCE&&!context.paused&&!w.paused){
  const living=new Set(allBirds(w).filter(b=>isAlive(w,b)).map(b=>b.id));
  const birds=allowBirds?context.birds.filter(b=>living.has(b.id)):[];
  const todayStart=Math.floor((at+JST)/DAY)*DAY-JST;
  for(let i=6;i>=0;i--){
   const start=todayStart-i*DAY,end=Math.min(at,start+DAY-1);
   if(end<0||end<=context.from)continue;
   const reportAt=Math.min(end,Math.max(context.from+1,start+DAY/2)),day=careDay(reportAt).date;
   if(a.lastDay!==null&&day<=a.lastDay)continue;
   const b=birds.length?birds[hash(`${w.worldId}:${day}`)%birds.length]:null;
   a.reports.push({day,at:reportAt,kind:b?(b.home==='resident'?'family':'friend'):'garden',birdId:b?.id??null,name:b?.name??null});a.lastDay=day;
  }
  a.reports=a.reports.slice(-7);
 }
 notePresence(w,at);return w;
}
export const unreadAway=w=>w.away.reports.filter(r=>w.away.readDay===null||r.day>w.away.readDay);
export const awayViewKey=w=>`${w.away.lastDay}:${w.away.readDay}`;
export function acknowledgeAway(w,throughDay){if(throughDay!==null&&w.away.reports.some(r=>r.day===throughDay)&&(w.away.readDay===null||throughDay>w.away.readDay))w.away.readDay=throughDay;return w;}
export function awayText(r){return r.kind==='family'?`${r.name}は、窓辺の光を眺めて過ごしていたみたい。`:r.kind==='friend'?`${r.name}は、庭の入口の様子が気になっていたみたい。`:'庭にそよ風が通り、小さな葉が揺れていたよ。';}

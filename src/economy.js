/** Single-player economy. All mutations belong in the engine's fresh-world transaction.
 * Trial balancing values, not user-confirmed prices. No external IO or paid currency.
 */
import {careDay,careWindow} from './care-schedule.js';
export const ECONOMY_RULES=Object.freeze({householdGold:30,ordinaryFurnitureGold:16,weekdayAuto:30,holidayAuto:40,pendingMax:40,balanceMax:1000000000});
export const AUTO_GEMS=Object.freeze({play:2,bath:2,reconcile:3,movein:10,pair:30,egg:25,hatch:35,grow:20});
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function automaticDailyCap(now){const d=careDay(now);return d.weekend||d.holiday===true?ECONOMY_RULES.holidayAuto:ECONOMY_RULES.weekdayAuto;}
export function initialEconomy(now,version=2){return {version,gold:0,lifetimeGold:0,seenAt:now,day:careDay(now).date,reserved:0,pending:null,nextGift:1,gardenWindowAt:null,firstMeetingClaimed:[],...(version===2?{household:{startedDay:careDay(now).date,lastClaimedDay:null}}:{})};}
export function validateEconomy(e,version=2){
 const fail=()=>{throw new Error('保存データを読み込めません：GemsとGoldの情報が不正です。');};
 if(!shape(e,['version','gold','lifetimeGold','seenAt','day','reserved','pending','nextGift','gardenWindowAt','firstMeetingClaimed',...(version===2?['household']:[])])||e.version!==version||!integer(e.gold,0,1e9)||!integer(e.lifetimeGold,e.gold,1e9)||!integer(e.seenAt)||!integer(e.reserved,0,40)||!integer(e.nextGift,1))fail();
 if(e.gardenWindowAt!==null&&(!integer(e.gardenWindowAt,-86400000, e.seenAt)||careWindow(Math.max(0,e.gardenWindowAt)).at!==e.gardenWindowAt))fail();
 if(!Array.isArray(e.firstMeetingClaimed)||e.firstMeetingClaimed.length>160||e.firstMeetingClaimed.some(id=>typeof id!=='string'||id.length<1||id.length>100)||new Set(e.firstMeetingClaimed).size!==e.firstMeetingClaimed.length)fail();
 if(version===2){const h=e.household,validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 if(!shape(h,['startedDay','lastClaimedDay'])||!validDate(h.startedDay)||(h.lastClaimedDay!==null&&(!validDate(h.lastClaimedDay)||h.lastClaimedDay<h.startedDay||h.lastClaimedDay>e.day)))fail();}
 const day=careDay(e.seenAt);if(e.day!==day.date||e.reserved>automaticDailyCap(e.seenAt))fail();
 if(e.pending!==null){const p=e.pending,n=typeof p?.id==='string'&&/^gift-[1-9]\d*$/.test(p.id)?Number(p.id.slice(5)):NaN;
 if(!shape(p,['id','amount'])||!integer(n,1,e.nextGift-1)||!integer(p.amount,1,40))fail();}
 return e;
}
/** Clock rollback cannot reopen an earlier day in the current world. Restoring a
 * whole historical world intentionally restores its matching wallet AND quota. */
export function syncEconomy(e,now){
 careDay(now);const at=Math.max(now,e.seenAt),day=careDay(at).date;
 const changed=at!==e.seenAt||day!==e.day;
 if(day>e.day)e.reserved=0;
 e.day=day;e.seenAt=at;return changed;
}
export function reserveAutomaticGems(e,kind){
 const requested=AUTO_GEMS[kind]||0;
 const amount=Math.max(0,Math.min(requested,automaticDailyCap(e.seenAt)-e.reserved,40-(e.pending?.amount||0)));
 if(!amount)return 0;
 if(!e.pending){if(e.nextGift>=Number.MAX_SAFE_INTEGER)return 0;e.pending={id:`gift-${e.nextGift++}`,amount:0};}
 e.pending.amount+=amount;e.reserved+=amount;return amount;
}
/** Called only after the engine checks the household, in the fresh-world transaction. */
export function awardHouseholdGold(e){
 if(e.day<e.household.startedDay||e.household.lastClaimedDay===e.day||e.gold>ECONOMY_RULES.balanceMax-ECONOMY_RULES.householdGold)return 0;
 const amount=ECONOMY_RULES.householdGold;e.gold+=amount;e.lifetimeGold=Math.min(ECONOMY_RULES.balanceMax,e.lifetimeGold+amount);e.household.lastClaimedDay=e.day;return amount;
}

/** OFFLINE DESIGN MODEL ONLY. No production imports of this module, no save writes.
 * Rates, floor and H amounts are comparison inputs, never adopted game rules.
 */
export const DAY=86400000;
function natural(n){return Number.isSafeInteger(n)&&n>=0;}
/** Integer numerator preserves fractions across arbitrary polling/reloads.
 * No per-second loop. A covered interval restores to 100; only later time decays.
 * `joinedAt` must be a real registration/growth timestamp, not a story tick.
 */
export function projectNeed(state,now,{rate,floor,joinedAt=state.at,contracts=[]}){
 if(![state.at,now,joinedAt,state.value,state.remainder??0,rate,floor].every(natural)||state.value>100||floor>100||(state.remainder??0)>=DAY)throw Error('Invalid model input');
 if(now<state.at)return {...state,rollback:true};
 let at=Math.max(state.at,joinedAt),value=state.value,remainder=state.remainder??0;
 if(at>now)return {...state,rollback:false};
 const intervals=contracts.map(c=>{if(!natural(c.from)||!natural(c.until)||c.until<c.from)throw Error('Invalid contract');return c;}).sort((a,b)=>a.from-b.from);
 function decay(until){const dt=until-at;if(!dt)return;const loss=rate*dt+remainder;if(!Number.isSafeInteger(loss))throw Error('Time range too large');const cap=Math.min(value,floor),whole=Math.floor(loss/DAY);if(whole>=value-cap){value=cap;remainder=0;}else{value-=whole;remainder=loss%DAY;}at=until;}
 for(const c of intervals){if(c.until<=at||c.from>now)continue;decay(Math.max(at,c.from));value=100;remainder=0;at=Math.min(now,c.until);if(at===now)break;}
 decay(now);return {value,remainder,at:now,rollback:false};
}
/** Economy-only comparison. Stable household, no guests/growth/deaths, automatic
 * gifts or drop collection. Story is paused; health deadlines are reported apart.
 * Starts at full gauges and zero earned Gems; initial 20 Gems excluded.
 * Caretaker starts funded; its upfront fee is included in net Gold, not income.
 */
export function simulateCare({days,birds,visits,caretaker=false,rate=30,floor=40,policy='R',base=30,extraCap=10,weekendOnly=false,absentDays=[],hours,initialGold=days*24}){
 if(![days,birds,visits,rate,floor,base,extraCap,initialGold].every(natural)||!days||!birds||!visits||!['R','H'].includes(policy))throw Error('Invalid scenario');
 const contractFunded=caretaker&&initialGold>=days*24;
 const contracts=contractFunded?[{from:0,until:days*DAY}]:[];
 const states=Array.from({length:birds*2},()=>({value:100,remainder:0,at:0}));
 const sessions=hours??(visits===1?[21]:[8,18,21]);
 let actions=0,recoveryUnits=0,rewardUnits=0,direct=0,other=0,gold=0,lastFeed=0,maxUnfed=0,baseTotal=0,extraTotal=0;
 const reach={20:null,50:null,100:null},purchaseCount={20:0,50:0,100:0},purchaseTimes={20:[],50:[],100:[]};
 const rows=[];
 for(let d=0;d<days;d++){
  // Model starts Monday; official holiday caps are irrelevant with gifts disabled.
  const dayAllowed=(!weekendOnly||d%7>=5)&&!absentDays.includes(d);
  let dailyExtra=0,dailyBase=false;
  if(!dayAllowed)continue;
  for(const h of sessions){
   const now=d*DAY+h*3600000;let earned=0,operations=0,recoveredFood=0;
   for(let i=0;i<states.length;i++){
    let s=projectNeed(states[i],now,{rate,floor,joinedAt:0,contracts});
    // Exact fractional recovery; each click restores at most 20, including last partial.
    const missing=(100-s.value)+(s.remainder/DAY);operations+=Math.ceil(missing/20-1e-12);
    recoveryUnits+=missing;rewardUnits+=missing*(i%2===0?6:5);if(i%2===0)recoveredFood+=missing;
    states[i]={value:100,remainder:0,at:now};
   }
   if(policy==='R'){earned=Math.floor((rewardUnits+1e-9)/20)-direct;}
   else{
    if(!dailyBase){earned+=base;baseTotal+=base;dailyBase=true;}
    const available=Math.floor((rewardUnits+1e-9)/20)-Math.floor((rows.at(-1)?.rewardUnits??0)/20);
    const extra=Math.min(extraCap-dailyExtra,available);earned+=extra;dailyExtra+=extra;extraTotal+=extra;
   }
   // One Gold claim per visited date; caretaker payments are a separate expense.
   const goldEarned=rows.at(-1)?.day===d?0:30;
   maxUnfed=Math.max(maxUnfed,now-lastFeed);if(recoveredFood>0||contractFunded)lastFeed=now;
   direct+=earned;gold+=goldEarned;actions+=operations+((policy==='H'&&!rows.some(r=>r.day===d))?1:0)+(goldEarned?1:0);
   for(const cost of [20,50,100]){const count=Math.floor(direct/cost);if(count>purchaseCount[cost]){if(reach[cost]===null)reach[cost]=now/DAY;for(let j=purchaseCount[cost];j<count;j++)purchaseTimes[cost].push(now/DAY);purchaseCount[cost]=count;}}
   rows.push({day:d,hour:h,earned,direct,rewardUnits,goldEarned,operations});
  }
 }
 maxUnfed=Math.max(maxUnfed,days*DAY-lastFeed);
 const intervals=Object.fromEntries([20,50,100].map(cost=>{const a=purchaseTimes[cost];return [cost,a.length>1?(a.at(-1)-a[0])/(a.length-1):null];}));
 return {days,birds,visits,rate,floor,policy,caretaker,contractFunded,actions,recovered:Number(recoveryUnits.toFixed(6)),directGems:direct,baseGems:baseTotal,extraGems:extraTotal,otherGems:other,goldEarned:gold,caretakerCost:contractFunded?days*24:0,netGold:gold-(contractFunded?days*24:0),firstReachDays:reach,averagePurchaseIntervalDays:intervals,maxUnfedHours:maxUnfed/3600000,healthWarning:!contractFunded&&maxUnfed>=3*DAY,rows};
}

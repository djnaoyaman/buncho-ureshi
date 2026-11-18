/** Fictional meals, not husbandry advice. All meals retain the same care/reward rules. */
export const FOOD_CATALOG=Object.freeze([
 {id:'seed',label:'いつものシード',growthPercent:0,description:'いつものペースで、ゆっくり育つ。'},
 {id:'pellet',label:'ペレットごはん',growthPercent:4,description:'幼鳥の成長を少し後押し。'},
 {id:'greens',label:'青菜を添えたごはん',growthPercent:2,description:'彩りを楽しみながら、穏やかに育つ。'},
 {id:'treat',label:'ごほうびを添えたごはん',growthPercent:1,description:'小さな楽しみと、ほんの少しの成長。'}
].map(x=>Object.freeze({...x,gold:0})));
export const FOOD_GROWTH_RULES=Object.freeze({intervalMs:86400000,maxPercent:20});
export const initialFoodGrowth=()=>({bonusTicks:0,lastBonusAt:null,lastFood:null});
export const foodDefinition=id=>FOOD_CATALOG.find(f=>f.id===id);
export const foodGrowthCap=base=>Math.floor(base*FOOD_GROWTH_RULES.maxPercent/100);
export function validateFoodGrowth(bird,base,seenAt){
 const s=bird.foodGrowth,integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).length!==3||!['bonusTicks','lastBonusAt','lastFood'].every(k=>Object.hasOwn(s,k))||!integer(s.bonusTicks,0,foodGrowthCap(base))||!(s.lastBonusAt===null||integer(s.lastBonusAt,0,seenAt))||!(s.lastFood===null||foodDefinition(s.lastFood))||s.bonusTicks>0&&s.lastBonusAt===null||s.lastBonusAt!==null&&s.lastFood===null||['egg','chick'].includes(bird.stage)&&(s.bonusTicks!==0||s.lastBonusAt!==null||s.lastFood!==null))throw Error('ごはんと成長の記録が不正です。');
 return s;
}
export function foodGrowthStatus(bird,base,now){
 const s=bird.foodGrowth||initialFoodGrowth(),cap=foodGrowthCap(base);
 return {eligible:bird.stage==='juvenile'&&bird.home==='resident',bonusTicks:s.bonusTicks,capTicks:cap,lastFood:s.lastFood,nextBonusAt:s.lastBonusAt===null?null:s.lastBonusAt+FOOD_GROWTH_RULES.intervalMs,ready:s.lastBonusAt===null||now-s.lastBonusAt>=FOOD_GROWTH_RULES.intervalMs};
}
/** Called once, only after a successful real meal in the serialized store transaction. */
export function applyFoodGrowth(bird,foodId,base,now){
 const food=foodDefinition(foodId);if(!food)throw Error('ごはんを選んでね。');
 const s=bird.foodGrowth,status=foodGrowthStatus(bird,base,now);s.lastFood=food.id;
 if(!status.eligible||!status.ready||food.growthPercent===0)return 0;
 const gain=Math.min(Math.floor(base*food.growthPercent/100),status.capTicks-s.bonusTicks);
 if(gain>0){s.bonusTicks+=gain;s.lastBonusAt=now;}
 return gain;
}
/** Preserve remaining cooldown across clock rebasing of an explicitly restored snapshot. */
export function rebaseFoodGrowth(world,delta){
 for(const b of [...world.birds,...(world.archive||[])])if(b.foodGrowth?.lastBonusAt!==null&&b.foodGrowth?.lastBonusAt!==undefined)b.foodGrowth.lastBonusAt=Math.max(0,Math.min(253402268399999,b.foodGrowth.lastBonusAt+delta));
}
export function reconcileFoodGrowth(incoming,current){
 if(incoming.worldId!==current.worldId)return;
 const old=new Map([...current.birds,...(current.archive||[])].map(b=>[b.id,b]));
 for(const b of [...incoming.birds,...(incoming.archive||[])]){const prior=old.get(b.id)?.foodGrowth;if(!b.foodGrowth||!prior||['egg','chick'].includes(b.stage))continue;
  b.foodGrowth.bonusTicks=Math.max(b.foodGrowth.bonusTicks,prior.bonusTicks);
  if(prior.lastBonusAt!==null&&(b.foodGrowth.lastBonusAt===null||prior.lastBonusAt>b.foodGrowth.lastBonusAt)){b.foodGrowth.lastBonusAt=prior.lastBonusAt;b.foodGrowth.lastFood=prior.lastFood;}
 }
}

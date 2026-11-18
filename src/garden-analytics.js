import {trackEvent} from './analytics.js';
import {PREDATOR_ENTRY_RULES} from './garden-predator-clock.js';
import {crowScene} from './garden-crows.js';
import {RAPTOR_RULES} from './garden-raptors.js';

// Derived from shipped rules: a later frequency-only change cannot mislabel data.
export const GARDEN_RULE_VERSION = `entry_${Math.round(PREDATOR_ENTRY_RULES.chance*100)}_${PREDATOR_ENTRY_RULES.retryMs/1000}_threat_${RAPTOR_RULES.threatCooldownMs/1000}_v1`;
export const ACTIVE_MILESTONES = [3,15,30,60,120,300,600,1200,1800,3600];
// Private comparison snapshots never leave memory and are never written to saves.
export function predatorSnapshot(w) {
  const c=w.encounters.crow,r=w.encounters.raptor;
  return {world:w.worldId,open:w.encounters.garden.open,home:w.field.place==='home',
    crowVisible:!!crowScene(w),crow:c.lastArrivalAt,crowDanger:c.lastHostile,raptor:r.lastArrivalAt,
    active:r.active?{hostile:r.active.hostile,pending:r.active.returnChoicePending}:null};
}
export function createGardenAnalytics({send=trackEvent}={}) {
  let elapsed=0,milestone=0,first=false,count=0;
  const crowHomes=new Set();
  const emit=(name,params)=>{if(count>=200)return;count++;try{send(name,{site_area:'game',measurement_scope:'page',rule_version:GARDEN_RULE_VERSION,...params});}catch{}};
  const seconds=()=>Math.min(86400,Math.floor(elapsed/1000));
  const arrival=(kind,danger)=>{
    const params={predator_kind:kind,encounter_safety:danger?'danger':'safe',active_seconds:seconds()};
    emit('garden_predator_arrival',params);
    if(!first){first=true;emit('garden_first_predator',params);}
  };
  return {
    // Called only for accepted foreground samples of the shared entry clock.
    active(delta){
      if(!Number.isFinite(delta)||delta<0||delta>PREDATOR_ENTRY_RULES.maxSampleGapMs)return;
      elapsed+=delta;
      while(milestone<ACTIVE_MILESTONES.length&&seconds()>=ACTIVE_MILESTONES[milestone]){
        emit('garden_active_time',{active_seconds:seconds(),milestone_seconds:ACTIVE_MILESTONES[milestone++]});
      }
    },
    committed(before,w){
      try {
        const after=predatorSnapshot(w);
        if(!before||before.world!==after.world)return;
        if(after.crow!==null&&after.crow!==before.crow)arrival('crow',after.crowDanger);
        if(after.raptor!==null&&after.raptor!==before.raptor&&after.active)arrival('raptor',after.active.hostile);
        const outcome=(kind,danger,result)=>emit('garden_predator_outcome',{predator_kind:kind,encounter_safety:danger?'danger':'safe',outcome:result});
        if(before.active&&before.raptor===after.raptor){
          if(!after.active)outcome('raptor',before.active.hostile,after.home?'home':'ended');
          else if(before.active.hostile&&!after.active.hostile)outcome('raptor',true,'friendly');
          else if(before.active.pending&&!after.active.pending)outcome('raptor',before.active.hostile,'stay');
        }
        const crowKey=`${before.world}:${before.crow}`;
        if(before.open&&!after.open&&after.home&&before.crowVisible&&before.crow===after.crow&&!crowHomes.has(crowKey)&&crowHomes.size<200){crowHomes.add(crowKey);outcome('crow',before.crowDanger,'home');}
      } catch { /* Telemetry cannot affect a committed save. */ }
    },
  };
}

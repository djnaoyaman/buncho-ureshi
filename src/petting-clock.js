// Only input time counts: no idle rewards, burst banking, or free point on reopen.
// State is deliberately transient; reopening starts from zero, never increases gain.
export function createPettingClock(now=()=>performance.now()){
 const states=new Map();
 return {
  input(key,{pointer=false}={}){
   const time=now(),old=states.get(key),gap=old?time-old.last:0;
   if(!old||gap<0||gap>(pointer?250:1500)){
    states.set(key,{last:time,active:0,awarded:time});return false;
   }
   old.last=time;
   old.active=Math.min(1000,old.active+Math.min(gap,pointer?250:1000));
   if(old.active<1000||time-old.awarded<1000)return false;
   old.active=0;old.awarded=time;return true;
  },
  settle(key){const time=now();states.set(key,{last:time,active:0,awarded:time});},
  reset(){states.clear();}
 };
}

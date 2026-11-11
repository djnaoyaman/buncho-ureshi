import {advanceTo} from './engine.js';
import {captureAway,finishAway,notePresence} from './away-reports.js';
/** Keep presence separate from gameplay revisions and pending decision tokens. */
export function advanceObservedWorld(w,now=Date.now(),{returning=false,advance=true,observedAt=now,active=true}={}){
 const context=returning?captureAway(w):null;
 if(advance)advanceTo(w,now,{present:active&&!returning&&(!w.careRules||now-w.careRules.seenAt<=15000)});
 if(returning)finishAway(w,context,observedAt,{allowBirds:advance});else notePresence(w,observedAt);
 return w;
}

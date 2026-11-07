import {createWorld,createBird,renameBird,validateWorld} from '../../src/engine.js';
import {lifeStatus} from '../../src/life-care.js';
export const HEALTH_NOTEBOOK_NOW=Date.UTC(2026,10,4);
const DAY=86400000;
export function healthNotebookFixture({longName=false}={}){
 const w=createWorld(HEALTH_NOTEBOOK_NOW,99);w.paused=true;w.settings.motion=false;w.settings.careSound=false;w.economy.gold=w.economy.lifetimeGold=longName?0:200;
 if(longName){renameBird(w,'b1','ながいなまえのしろいおもち');createBird(w,{home:'resident',color:'cinnamon',stage:'juvenile'});lifeStatus(w,'b1').condition={kind:'injury',sinceAt:HEALTH_NOTEBOOK_NOW,deadlineAt:HEALTH_NOTEBOOK_NOW+DAY};}
 else{const b=createBird(w,{home:'resident',color:'sakura'});renameBird(w,b.id,'さくら');lifeStatus(w,'b1').condition={kind:'respiratory',sinceAt:HEALTH_NOTEBOOK_NOW-12*3600000,deadlineAt:HEALTH_NOTEBOOK_NOW+12*3600000};}
 return validateWorld(w);
}

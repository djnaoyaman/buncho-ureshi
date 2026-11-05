import {createWorld,validateWorld} from '../../src/engine.js';
export const COLOR_PLAY_NOW=Date.UTC(2026,10,5,9);
export function colorPlayWorld(){
 const w=createWorld(COLOR_PLAY_NOW,42);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 Object.assign(w.encounters.crow,{lastArrivalAt:COLOR_PLAY_NOW,gardenId:'komorebi',speciesId:'large-billed-crow',arrivalBirdId:w.birds[0].id});
 w.encounters.crow.visits.push({id:'large-billed-crow',firstTick:0,lastTick:0,count:1,petPoints:0});
 w.encounters.raptor.lastArrivalAt=COLOR_PLAY_NOW;
 w.encounters.raptor.visits.push({id:'black-kite',firstTick:0,lastTick:0,count:1,petPoints:0});
 validateWorld(w);return w;
}

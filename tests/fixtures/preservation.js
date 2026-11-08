import assert from 'node:assert/strict';
import {createWorld,createBird,renameBird,validateWorld,serializeWorld,parseSave} from '../../src/engine.js';
export const NOW=Date.UTC(2026,10,8);
export function fixture(seed=418){
 const w=createWorld(NOW,seed);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 renameBird(w,'b1','箱<&>');const parent=createBird(w,{sex:'male',home:'visitor'});
 createBird(w,{parents:[w.birds[0].id,parent.id],generation:1,home:'resident'});
 validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);return w;
}
export function exact(actual,expected){validateWorld(actual);assert.deepEqual(actual,expected);assert.equal(serializeWorld(actual),serializeWorld(expected));}

import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const BASE_SOURCE=resolve(process.env.HELP_GUIDE_BASE_SOURCE||fileURLToPath(new URL('../..',import.meta.url)));
export const engine=await import(pathToFileURL(resolve(BASE_SOURCE,'src/engine.js')));
export function validated(world){
 engine.validateWorld(world);
 const restored=engine.parseSave(engine.serializeWorld(world));assert.deepEqual(restored,world);
 return restored;
}
export function helpWorld(known=true){
 const now=known?Date.UTC(2026,10,8):Date.UTC(2030,10,8);
 const world=engine.createWorld(now,418);
 world.paused=true;world.settings.motion=false;world.settings.careSound=false;
 assert.equal(!engine.careWindow(world.careSchedule.seenAt).coverageMessage,known);
 return validated(world);
}

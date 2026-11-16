import {allBirds} from './world-birds.js';
import {lifeStatus} from './life-care.js';
/** Ephemeral receipt of a completed action, never an instruction to the engine.
 * Caller supplies only transaction results after a successful durable commit. */
export function homeCareResponse(world,result,{kind=result?.kind,birdId=result?.birdId,saved=false,contact=false}={}){
 if(!['feed','pet','talk','name','clean','drop'].includes(kind))return null;
 if(!saved||world.field.place!=='home'||world.encounters?.raptor?.active?.hostile||!result)return null;
 const living=b=>b&&b.home!=='departed'&&!lifeStatus(world,b)?.death&&!lifeStatus(world,b)?.condition;
 const birds=allBirds(world);
 if(birds.some(b=>b.home==='resident'&&lifeStatus(world,b)?.condition))return null;
 const eligible=b=>living(b)&&['adult','juvenile'].includes(b.stage);
 let targets=[];
 if(result.results){targets=result.results.filter(r=>r.changed).map(r=>r.birdId);}
 else if(['feed','pet'].includes(kind)&&(result.changed||kind==='pet'&&result.reason==='full'))targets=[birdId];
 else if(['talk','name'].includes(kind)&&contact&&result.topic&&!result.reason)targets=[birdId];
 targets=[...new Set(targets)].filter(id=>eligible(birds.find(b=>b.id===id)));
 const room=['clean','drop'].includes(kind)&&result.changed;
 if(!room&&!targets.length)return null;
 return {worldId:world.worldId,revision:world.revision,kind,targets,room,phase:'answer'};
}
export function homeResponsePose(response,bird){
 if(!response?.targets.includes(bird.id))return null;
 return response.phase==='settled'?'rest':response.kind==='feed'?'peck':response.kind==='pet'?'preen':'tilt';
}

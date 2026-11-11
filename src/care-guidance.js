import {allBirds} from './world-birds.js';
import {lifeStatus} from './life-care.js';

/** Pure presentation of the selected bird's actual available care. */
export function careGuidance(world,birdId){
 const bird=allBirds(world).find(b=>b.id===birdId);if(!bird)return '';
 const life=lifeStatus(world,bird),danger=world.encounters?.raptor?.active;
 if(life?.death)return '思い出の庭で、この子に会えるよ。';
 if(danger?.hostile&&danger.targetBirdId===birdId)return '危険が近づいているよ。おうちへ帰ろう。';
 if(life?.condition&&bird.home==='resident')return '体調が変わったよ。病院で診てもらおう。';
 if(bird.home==='departed')return '別のおうちで暮らす仲間だよ。';
 if(['egg','chick'].includes(bird.stage))return '巣で育つ時間。そっと見守ろう。';
 if(bird.home==='visitor')return '遊びに来たお友達。お話ししてみよう。';
 if(bird.needs.food<100)return 'ごはんで、この子のおなかを満たそう。';
 if(bird.needs.energy<100)return '名前を呼ぶか、なでてふれ合おう。';
 return 'おなかも、げんきもいっぱい。なでてあそぼう。';
}
/** Presentation only. A receipt is shown separately, only after a successful write.
 * Full gauges alone never override untreated illness, danger or a dirty home.
 */
export function careIsSettled(world){
 const family=allBirds(world).filter(b=>b.home==='resident'&&!lifeStatus(world,b)?.death);
 return family.length>0&&world.care.cleanliness>20&&!world.gems?.droppings?.length&&!world.encounters?.raptor?.active?.hostile&&family.every(b=>
  !lifeStatus(world,b)?.condition&&(['egg','chick'].includes(b.stage)||b.needs.food>=100&&b.needs.energy>=100));
}
export function cleaningGuidance(world){
 const c=world.care;
 return world.field.place==='home'&&c.cleanliness<=20&&(c.lastCleanTick===null||world.tick-c.lastCleanTick>=1)?'ゆかが よごれているよ。':'';
}

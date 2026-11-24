import {allBirds} from './world-birds.js';
/** Stable visual assignment. Epoch and bird IDs survive import and succession.
 * No story random draw, save mutation or current protagonist is involved. */
const names=['バウハウス','デ・ステイル','アール・デコ','ストリームライン','北欧モダン','ミッドセンチュリー','スイス・スタイル','ブルータリズム','メンフィス'];
// Real source px: span of the painted floor bath, upper/lower perch surface centers.
const surveyed=Object.freeze([
 [232,377,579],[221,376,576],[229,376,574],
 [282,378,572],[267,377,580],[286,375,578],
 [263,379,578],[236,378,577],[255,378,578]
]);
export const FRIEND_CAGES=Object.freeze(names.map((title,i)=>Object.freeze({id:i+1,title,survey:Object.freeze(surveyed[i]),file:`friend-cages/cage-${String(i+1).padStart(2,'0')}-v1.webp`})));
export function friendCage(world,birdId){
 if(!world?.birds||!allBirds(world).some(b=>b.id===birdId))return null;
 let hash=2166136261;
 for(const char of `${world.epoch}:${birdId}:friend-cage-v1`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return FRIEND_CAGES[hash%FRIEND_CAGES.length];
}

/** Rendering only. Bird and furniture share the 1600 × 1000 illustration plane.
 * Bath is a visual reference, not a real-world cage dimension claim. */
export function friendCagePositions(birds,cage){
 const [bath,upper,lower]=cage.survey;
 const adultWidth=Math.min(.102,Math.max(.094,bath*.65/1600));
 const positions=new Map();
 const perched=birds.filter(b=>b.stage==='juvenile'||b.stage==='adult');
 const slots=perched.length===1?[[.5,.814]]:[
   [.429,lower/1000],[.571,lower/1000],[.429,upper/1000],[.571,upper/1000],
   [.429,.814],[.571,.814],[.272,lower/1000],[.728,lower/1000],
   [.272,upper/1000],[.728,upper/1000],[.272,.814],[.728,.814]
 ];
 perched.forEach((bird,i)=>{
   const [x,y]=slots[i];
   positions.set(bird.id,{id:`friend-contact-${i}`,x,y,width:adultWidth*(bird.stage==='juvenile'?.92:1),depth:1,zone:bird.action.kind,interactive:true});
 });
 return positions;
}

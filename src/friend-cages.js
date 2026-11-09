import {allBirds} from './world-birds.js';
/** Stable visual assignment. Epoch and bird IDs survive import and succession.
 * No story random draw, save mutation or current protagonist is involved. */
const names=['バウハウス','デ・ステイル','アール・デコ','ストリームライン','北欧モダン','ミッドセンチュリー','スイス・スタイル','ブルータリズム','メンフィス'];
export const FRIEND_CAGES=Object.freeze(names.map((title,i)=>Object.freeze({id:i+1,title,file:`friend-cages/cage-${String(i+1).padStart(2,'0')}-v1.webp`})));
export function friendCage(world,birdId){
 if(!world?.birds||!allBirds(world).some(b=>b.id===birdId))return null;
 let hash=2166136261;
 for(const char of `${world.epoch}:${birdId}:friend-cage-v1`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return FRIEND_CAGES[hash%FRIEND_CAGES.length];
}

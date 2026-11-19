import {PET_SOUND_PCM} from './data/pet-sound-pcm.js';
const decoded=new Map();
let cosmeticState=(Date.now()^Math.floor((globalThis.performance?.now?.()||0)*1000))>>>0;
/** Separate entropy from gameplay Math.random; independent full-period fallback. */
export function petSoundRandom(cryptoSource=globalThis.crypto){
 try{const word=new Uint32Array(1);cryptoSource.getRandomValues(word);return word[0]/4294967296;}catch{cosmeticState=(Math.imul(cosmeticState,1664525)+1013904223)>>>0;return cosmeticState/4294967296;}
}
/** Presentation-only random choice. Never accepts or advances a world RNG. */
export function choosePetSound(random=petSoundRandom){const value=random();return Number.isFinite(value)&&value>=0&&value<1?Math.floor(value*4):0;}
export function getPetSound(index){
 if(!Number.isInteger(index)||index<0||index>3)throw new RangeError('Unknown pet sound');
 if(!decoded.has(index)){const raw=atob(PET_SOUND_PCM[index]),samples=new Float32Array(raw.length/2);for(let i=0;i<samples.length;i++){const value=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);samples[i]=(value>=32768?value-65536:value)/32768;}decoded.set(index,samples);}
 return decoded.get(index);
}

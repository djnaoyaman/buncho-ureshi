import {GARDEN35_IDS,GARDEN35_LEGACY_IDS} from './data/garden35-plan.js';

/** Pure counter projection, called after legacy save validation. No persistence.
 * All twelve saved IDs survive; twenty-three new counters start at zero.
 * Encounter version 14 marks activation; older engines reject this version.
 */
export function prepareGarden35Visits(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw Error('庭の訪問記録が不正です。');
 const descriptors=Object.getOwnPropertyDescriptors(input),keys=Reflect.ownKeys(input);
 const legacy=keys.length===GARDEN35_LEGACY_IDS.length&&GARDEN35_LEGACY_IDS.every(id=>Object.hasOwn(descriptors,id));
 const modern=keys.length===GARDEN35_IDS.length&&GARDEN35_IDS.every(id=>Object.hasOwn(descriptors,id));
 if(!legacy&&!modern)throw Error('庭の訪問記録の項目が一致しません。');
 for(const id of keys){const d=descriptors[id];if(!Object.hasOwn(d,'value')||!Number.isSafeInteger(d.value)||d.value<0||d.value>1000000)throw Error('庭の訪問回数が不正です。');}
 return Object.fromEntries(GARDEN35_IDS.map(id=>[id,descriptors[id]?.value??0]));
}

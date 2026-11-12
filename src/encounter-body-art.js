/** Presentation measurements on the approved illustrations, not biological dimensions.
 * ratio is the curated head-to-standing-foot height relative to the Java sparrow.
 * Feet exclude tails. Keep notebook art and persistence untouched. */
export const ENCOUNTER_BODY_ART = Object.freeze({
 'gouldian-finch': Object.freeze({headY: 0.035, footX: 0.34, footY: 0.904, ratio: 1}),
 'double-barred-finch': Object.freeze({headY: 0.068, footX: 0.6, footY: 0.958, ratio: 0.85}),
 'diamond-firetail': Object.freeze({headY: 0.01, footX: 0.61, footY: 0.993, ratio: 1}),
 'star-finch': Object.freeze({headY: 0.038, footX: 0.34, footY: 0.969, ratio: 0.9}),
 'white-headed-munia': Object.freeze({headY: 0.069, footX: 0.59, footY: 0.95, ratio: 0.9}),
 'zebra-finch': Object.freeze({headY: 0.049, footX: 0.62, footY: 0.967, ratio: 0.85}),
 'red-avadavat': Object.freeze({headY: 0.099, footX: 0.38, footY: 0.919, ratio: 0.78}),
 'atlantic-canary': Object.freeze({headY: 0.073, footX: 0.33, footY: 0.898, ratio: 0.95}),
 'red-crossbill': Object.freeze({headY: 0.045, footX: 0.56, footY: 0.955, ratio: 1.18}),
 'evening-grosbeak': Object.freeze({headY: 0.041, footX: 0.4, footY: 0.969, ratio: 1.25}),
 'eurasian-siskin': Object.freeze({headY: 0.047, footX: 0.36, footY: 0.955, ratio: 0.85}),
 'pine-grosbeak': Object.freeze({headY: 0.039, footX: 0.63, footY: 0.953, ratio: 1.3}),
 'common-redpoll': Object.freeze({headY: 0.065, footX: 0.34, footY: 0.914, ratio: 0.86}),
 'gloster-canary': Object.freeze({headY: 0.138, footX: 0.63, footY: 0.899, ratio: 0.9}),
 'oriental-greenfinch': Object.freeze({headY: 0.104, footX: 0.34, footY: 0.897, ratio: 1}),
 'society-finch': Object.freeze({headY: 0.108, footX: 0.58, footY: 0.916, ratio: 0.88}),
 'eurasian-bullfinch': Object.freeze({headY: 0.058, footX: 0.35, footY: 0.939, ratio: 1.12}),
 'chestnut-munia': Object.freeze({headY: 0.045, footX: 0.37, footY: 0.964, ratio: 0.88}),
 'tricolored-munia': Object.freeze({headY: 0.064, footX: 0.64, footY: 0.938, ratio: 0.88}),
 'scaly-breasted-munia': Object.freeze({headY: 0.082, footX: 0.35, footY: 0.904, ratio: 0.88}),
 'black-rumped-waxbill': Object.freeze({headY: 0.114, footX: 0.65, footY: 0.866, ratio: 0.8}),
 'pin-tailed-whydah': Object.freeze({headY: 0.14, footX: 0.33, footY: 0.6, ratio: 1}),
 'hawfinch': Object.freeze({headY: 0.094, footX: 0.38, footY: 0.904, ratio: 1.22}),
 'japanese-grosbeak': Object.freeze({headY: 0.089, footX: 0.6, footY: 0.921, ratio: 1.25}),
 'brambling': Object.freeze({headY: 0.085, footX: 0.38, footY: 0.895, ratio: 1.05}),
 'red-siskin': Object.freeze({headY: 0.077, footX: 0.63, footY: 0.937, ratio: 0.85}),
 'chinese-grosbeak': Object.freeze({headY: 0.086, footX: 0.33, footY: 0.909, ratio: 1.2}),
 'long-tailed-paradise-whydah': Object.freeze({headY: 0.04, footX: 0.8, footY: 0.51, ratio: 1}),
 'white-winged-crossbill': Object.freeze({headY: 0.042, footX: 0.33, footY: 0.951, ratio: 1.12}),
 'eurasian-tree-sparrow': Object.freeze({headY: 0.061, footX: 0.62, footY: 0.954, ratio: 1}),
 'long-tailed-rosefinch': Object.freeze({headY: 0.124, footX: 0.28, footY: 0.809, ratio: 0.95}),
 'pallass-rosefinch': Object.freeze({headY: 0.037, footX: 0.35, footY: 0.955, ratio: 1.1}),
 'red-throated-parrotfinch': Object.freeze({headY: 0.056, footX: 0.62, footY: 0.955, ratio: 0.9}),
 'masked-finch': Object.freeze({headY: 0.059, footX: 0.38, footY: 0.943, ratio: 0.9}),
 'hooded-siskin': Object.freeze({headY: 0.081, footX: 0.35, footY: 0.923, ratio: 0.9}),
});
// Keep the existing long-tail contract; tails never determine body size.
export const LONG_TAIL_ART = Object.freeze(Object.fromEntries(
 ['pin-tailed-whydah','long-tailed-paradise-whydah'].map(id=>[id,ENCOUNTER_BODY_ART[id]])
));
export function encounterBodyArt(entry) {
 const p = ENCOUNTER_BODY_ART[entry.id];
 if (!p) return null;
 const height = .78 * p.ratio / (p.footY - p.headY);
 const width = height * (8 / 7) * entry.art.width / entry.art.height;
 return {height, width, ratio:p.ratio, footX:p.footX, footY:p.footY,
  style:`position:absolute;left:50%;top:100%;width:${width*100}%;height:auto;max-width:none;max-height:none;margin:0;object-fit:contain;transform:translate(${-p.footX*100}%,${-p.footY*100}%);pointer-events:none;`};
}

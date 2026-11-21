export const groups=Object.freeze({
 actors:['garden-actors'],
 trail:['garden-trail-seven'],
 max:['garden-trail-maximum-native'],
 booklet:['garden-about-booklet','encounter-music','game-music'],
 movement:['garden-ground-motion','encounter-pet-response','garden-actors-natural','garden-compact-rotation-identity','flight-integrity'],
 geometry:['garden-terrain-motion','garden-viewport-sync','iphone15-scene','white-flight-media','white-flight-media-tap'],
});
export function narrowReviewedFiles(files,key){
 const prefix='tests/browser/';
 const flat=Object.values(groups).flat().map(k=>prefix+k+'.spec.js');
 if(flat.length!==files.length||new Set(flat).size!==flat.length||!flat.every(x=>files.includes(x)))throw Error('Diagnostic groups do not partition exact reviewed manifest.');
 if(!(key in groups))throw Error('Unknown diagnostic group.');
 return groups[key].map(k=>prefix+k+'.spec.js');
}

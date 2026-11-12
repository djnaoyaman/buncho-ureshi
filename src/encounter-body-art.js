/** Source-image measurements of head top and standing feet, excluding long tails.
 * Presentation only: never changes species size, source artwork or saved state. */
export const LONG_TAIL_ART = Object.freeze({
 'pin-tailed-whydah': Object.freeze({headY: .14, footX: .33, footY: .60}),
 'long-tailed-paradise-whydah': Object.freeze({headY: .04, footX: .80, footY: .51}),
});
export function encounterBodyArt(entry) {
 const p = LONG_TAIL_ART[entry.id];
 if (!p) return null;
 const height = .78 / (p.footY - p.headY);
 const width = height * (8 / 7) * entry.art.width / entry.art.height;
 return {height, width, footX:p.footX, footY:p.footY,
  style:`position:absolute;left:50%;top:100%;width:${width*100}%;height:auto;max-width:none;max-height:none;margin:0;object-fit:contain;transform:translate(${-p.footX*100}%,${-p.footY*100}%);pointer-events:none;`};
}

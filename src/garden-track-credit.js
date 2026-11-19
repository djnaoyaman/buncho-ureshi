import {GARDEN_TRACK_CREDITS,TRACK_READINGS} from './data/garden-track-credits.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words=Object.keys(TRACK_READINGS).sort((a,b)=>b.length-a.length);
const pattern=new RegExp('('+words.join('|')+')','g');
const readable=text=>text.split(pattern).map(part=>TRACK_READINGS[part]?`<ruby>${esc(part)}<rt aria-hidden="true">${esc(TRACK_READINGS[part])}</rt></ruby>`:esc(part)).join('');
/** Describes the assigned theme, independently of the current audio selection. */
export function renderGardenTrackCredit(themeId,base='/'){
 const credit=Object.hasOwn(GARDEN_TRACK_CREDITS,themeId)?GARDEN_TRACK_CREDITS[themeId]:null;
 if(!credit)return '';
 const root=new URL(base,'https://booklet.invalid/').pathname;
 return `<div class="garden-about-booklet__music" data-garden-track-credit="${esc(themeId)}"><h6>この庭の曲</h6><p class="garden-about-booklet__track-title">${readable(credit.trackTitle)}</p><p data-track-production><ruby>制作<rt aria-hidden="true">せいさく</rt></ruby>：${esc(credit.productionCredit)}</p>${credit.composer?`<p data-track-composer><ruby>作曲<rt aria-hidden="true">さっきょく</rt></ruby>：${esc(credit.composer)}</p>`:''}<p data-track-description>${readable(credit.description)}</p>${credit.sourcePath?`<p><a data-track-source href="${esc(root+credit.sourcePath)}" target="_self">${esc(credit.sourceLabel)}</a></p>`:''}</div>`;
}

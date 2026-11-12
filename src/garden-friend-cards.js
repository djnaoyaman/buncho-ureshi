import {gardenFriendCardArt} from './garden-friend-card-art.js';
import {gardenFriendActionIllustrations} from './garden-friend-action-art.js';
const genericArt={
 watch:'<svg aria-hidden="true" focusable="false" viewBox="0 0 96 96" width="96" height="96"><circle cx="41" cy="38" r="23" fill="#e8eddd" stroke="#52604d" stroke-width="4"/><path d="M58 55L80 79" fill="none" stroke="#a9886d" stroke-width="9" stroke-linecap="round"/><path d="M29 41Q42 19 52 40Q40 55 29 41Z" fill="#bfcfb8" stroke="#52604d" stroke-width="2"/></svg>',
 play:'<svg aria-hidden="true" focusable="false" viewBox="0 0 96 96" width="96" height="96"><path d="M15 81Q62 80 48 59T78 16" fill="none" stroke="#c0b197" stroke-width="8" stroke-linecap="round" stroke-dasharray="8 10"/><path d="M17 40Q13 13 42 14Q46 39 17 40Z" fill="#bfcfb8" stroke="#52604d" stroke-width="3"/><path d="M17 40L35 21" stroke="#52604d" stroke-width="2"/></svg>'
};
const illustrations=Object.freeze({...gardenFriendActionIllustrations,...gardenFriendCardArt,...genericArt});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Semantic artwork mapping only. Never substitute a windmill or wind pose in another garden. */
export function gardenFriendActionArt(gardenId,kind){
 if(kind==='chat')return 'chat';
 if(gardenId==='kazaguruma')return kind==='watch'?'windmill':kind==='play'?'pose':null;
 return Object.hasOwn(gardenFriendActionIllustrations,`${gardenId}-${kind}`)?`${gardenId}-${kind}`:Object.hasOwn(genericArt,kind)?kind:null;
}
/** Pure presentation VM: existing caller supplies roster, sliced memories, action labels,
 * availability/reasons and portrait file derived from the actual bird. No world or clock. */
export function renderGardenFriendCards({gardenId,gardenName,friends,base='/buncho-ureshi/'}={}){
 if(!friends?.length)return '';
 return `<details name="garden-tools" data-garden-details="friends" class="garden-friend-cards"><summary>友達</summary><div class="garden-friend-cards-heading"><h4>庭の友達</h4><span>いま ${friends.length}羽</span></div><p class="garden-friend-cards-place">${esc(gardenName)}で、いっしょに。</p><div class="garden-friend-cards-list">${friends.map((f,i)=>{
 const portrait=/^(?:juvenile-)?(?:white|sakura|silver|cinnamon)\.webp$/.test(f.portraitFile)?f.portraitFile:'white.webp';
 return `<article class="garden-friend-card" data-friend-card="${esc(f.friendId)}"><div class="garden-friend-card-face tone-${i%3}"><img src="${esc(base+'game-art/'+portrait)}" alt="" width="1160" height="1359" decoding="async" draggable="false"><div><h5>${esc(f.name)}</h5><span>庭のなかよし</span><p><strong>${esc(f.affinity)}</strong> / 100</p><meter min="0" max="100" value="${esc(f.affinity)}" aria-label="${esc(f.name)}の庭のなかよし">${esc(f.affinity)} / 100</meter></div></div><div class="garden-friend-card-body"><p>${esc(f.personality)}</p>${f.memories.length?`<details data-garden-details="memory-${esc(f.friendId)}" class="garden-friend-card-memory"><summary>庭の思い出</summary><ul>${f.memories.map(m=>`<li>${esc(m.text)}</li>`).join('')}</ul></details>`:''}<div class="garden-friend-card-actions" role="group" aria-label="${esc(f.name)}と過ごす">${f.actions.map(a=>{
 const art=gardenFriendActionArt(gardenId,a.kind),tone=['watch','play','chat'].includes(a.kind)?a.kind:'other';
 return `<div class="garden-friend-card-action"><button type="button" class="garden-friend-card-button action-${tone}" data-garden-friend="${esc(f.friendId)}" data-garden-friend-action="${esc(a.kind)}" ${a.disabled?'disabled':''}>${art?illustrations[art].replaceAll('id="sail"',`id="garden-friend-sail-${i}"`).replaceAll('href="#sail"',`href="#garden-friend-sail-${i}"`):''}<span>${esc(a.label)}</span>${a.disabledReason?`<small>${esc(a.disabledReason)}</small>`:''}</button></div>`;
 }).join('')}</div></div></article>`;
 }).join('')}</div><p class="garden-friend-cards-footer">今日は、なにして遊ぼう？</p></details>`;
}

/** Presentation only: scene art never chooses participants or changes a world. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function gardenStoryArt(kind,{base='/buncho-ureshi/',actors=[],keepsake=''}={}){
 const scene=['leaf','expedition','showcase'].includes(kind)?kind:'leaf';
 const birds=actors.filter(Boolean).slice(0,2).map((bird,i)=>{
  const color=['white','sakura','silver','cinnamon'].includes(bird.appearance?.color)?bird.appearance.color:'white';
  return `<figure class="leaf-gift-bird ${i?'leaf-gift-right':'leaf-gift-left'} story-scene-bird story-scene-bird-${i}" data-story-actor="${esc(bird.id||'')}"><img src="${esc(base)}game-art/${color}.webp" width="1160" height="1359" alt="" draggable="false" decoding="async"><figcaption>${esc(bird.name)}</figcaption></figure>`;
 }).join('');
 return `<div class="garden-story-scene" data-story-scene="${scene}"><img class="story-scene-backdrop" src="${esc(base)}game-art/event-scenes/${scene}-v1.webp" width="960" height="640" alt="" draggable="false" decoding="async">${birds}${keepsake?`<div class="story-scene-keepsake">${keepsake}</div>`:''}</div>`;
}
export function storyRewardNote(content,key){return `<details class="garden-story-note" data-garden-details="${esc(key)}"><summary>おれいについて</summary><p class="leaf-gift-note">${content}</p></details>`;}
/** Native select remains keyboard/iOS accessible; its portrait is only a preview. */
export function storyFriendPicker(kind,index,friends,{base='/buncho-ureshi/'}={}){
 const id=`${kind}-actor-${index}`,chosen=friends[index]||friends[0];
 const color=b=>['white','sakura','silver','cinnamon'].includes(b?.appearance?.color)?b.appearance.color:'white';
 const favorite={chat:'おはなしが すき',watch:'よく みるのが すき',play:'あそぶのが すき'};
 return `<div class="story-friend-picker"><img data-story-friend-portrait src="${esc(base)}game-art/${color(chosen)}.webp" data-story-art-base="${esc(base)}" width="1160" height="1359" alt="" decoding="async"><label for="${id}">${index===0?'ひとりめ':'ふたりめ'}の ともだち</label><select id="${id}" name="${id}" data-${kind}-actor="${index}">${friends.map((b,j)=>`<option value="${esc(b.id)}" data-story-color="${color(b)}" ${j===index?'selected':''}>${esc(b.name)} · ${favorite[b.favorite]||''}</option>`).join('')}</select></div>`;
}
export function syncStoryFriendPortraits(root){
 for(const select of root.querySelectorAll('.story-friend-picker select')){
  const img=select.closest('.story-friend-picker')?.querySelector('[data-story-friend-portrait]');
  const color=select.options[select.selectedIndex]?.dataset.storyColor;
  if(img&&['white','sakura','silver','cinnamon'].includes(color))img.setAttribute('src',`${img.dataset.storyArtBase}game-art/${color}.webp`);
 }
}

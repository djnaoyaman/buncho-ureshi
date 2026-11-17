import {collectionEndingStatus,pendingCollectionEnding,claimCollectionEnding,recordCollectionEndingPlayback,releaseCollectionEnding} from './collection-endings.js';
const MOVIES=Object.freeze({garden:'garden-v1.mp4',crows:'crows-v1.mp4',raptors:'raptors-v1.mp4','garden-tour':'buncho-ending-01-rich-final-review.mp4'});
const TITLES={'garden-tour':'どこへ行っても、帰る場所',garden:'<ruby>庭<rt>にわ</rt></ruby>の<ruby>鳥<rt>とり</rt></ruby>との<ruby>出会<rt>であ</rt></ruby>い',crows:'カラスたちとの<ruby>出会<rt>であ</rt></ruby>い',raptors:'<ruby>大空<rt>おおぞら</rt></ruby>の<ruby>鳥<rt>とり</rt></ruby>たちとの<ruby>出会<rt>であ</rt></ruby>い'};
export function renderEndingDiary(world){
 const entries=collectionEndingStatus(world).filter(e=>e.unlocked);
 if(!entries.length)return '';
 return `<section class="game-ending-diary" aria-label="エンディング"><h3>おもいでのエンディング</h3><p><ruby>達成<rt>たっせい</rt></ruby>したエンディングは、いつでも<ruby>見<rt>み</rt></ruby>られるよ。</p><div>${entries.map(e=>`<button type="button" data-ending-replay="${e.id}"><span aria-hidden="true">▶</span> ${TITLES[e.id]}</button>`).join('')}</div></section>`;
}
/** A persistent dialog outside repainted panels. Failed autoplay never discards an ending. */
export function mountCollectionEndingPlayer(root,{getWorld,transact,canPresent=()=>true,onActive=()=>{},onClose=()=>{},now=()=>Date.now()}={}){
 const doc=root.ownerDocument,win=doc.defaultView,owner=globalThis.crypto?.randomUUID?.()||`ending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 let alive=true,dialog=null,video=null,current=null,flight=false,closing=false,lastFocus=null,blocked=new Set();
 const active=()=>!!current||flight;
 const notify=value=>{doc.body.toggleAttribute('data-game-ending-active',value);doc.dispatchEvent(new win.CustomEvent('buncho-game-ending',{detail:{active:value}}));onActive(value);};
 const transactFor=async(worldId,fn)=>transact(w=>{if(w.worldId===worldId)fn(w);return w;});
 async function savePlayback(playback){
  const c=current;if(!c||!c.recordable)return;
  let recorded=false;await transactFor(c.worldId,w=>{
   const result=recordCollectionEndingPlayback(w,c.id,owner,playback),entry=w.collectionEndings.entries.find(e=>e.id===c.id);
   recorded=result.changed||entry?.playback===playback||entry?.playback==='completed';
  });
  if(!recorded)throw Error('Ending claim changed');if(current===c)c.acked=true;
 }

 function message(text){const p=dialog?.querySelector('[role=status]');if(p)p.textContent=text;}
 // Browser fullscreen is gesture-gated. The viewport-sized dialog is always the fallback.
 function enterFullscreen(){
  const d=dialog?.querySelector('.game-ending-screen'),v=video;if(!d||!v)return;
  try{
   if(d.requestFullscreen){Promise.resolve(d.requestFullscreen()).catch(()=>{});}
   else if(v.webkitEnterFullscreen){v.webkitEnterFullscreen();}
  }catch{} // iOS may refuse until media metadata is ready; the full-screen dialog remains usable.
 }
 async function play({fullscreen=false}={}){if(!video)return;if(fullscreen)enterFullscreen();try{if(video.error)video.load();await video.play();}catch{dialog?.removeAttribute('data-playing');message('▶ をおすと、エンディングが はじまるよ。');}}
 async function close({acknowledge=true,playback='deferred'}={}){
  if(closing||!current)return;closing=true;const c=current;if(playback==='completed')c.completed=true;
  try{if(acknowledge)await savePlayback(c.completed?'completed':playback);else await transactFor(c.worldId,w=>releaseCollectionEnding(w,c.id,owner));}
  catch{closing=false;message('きろくを ほぞんできませんでした。つうしんを たしかめて、もういちど とじるを おしてね。');return;}
  if(!acknowledge)blocked.add(`${c.worldId}:${c.id}`);
  remove();closing=false;onClose();
 }
 function remove(){const old=dialog;try{if(old?.contains(doc.fullscreenElement))Promise.resolve(doc.exitFullscreen?.()).catch(()=>{});if(video?.webkitDisplayingFullscreen)video.webkitExitFullscreen?.();}catch{}dialog=null;try{video?.pause();video?.removeAttribute('src');video?.load();}catch{}video=null;current=null;if(old){if(old.open)old.close();old.remove();}notify(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});lastFocus=null;}
 async function open(id,{automatic=false}={}){
  if(!alive||active()||doc.hidden||!canPresent())return false;
  const w=getWorld(),status=collectionEndingStatus(w).find(e=>e.id===id);
  if(!status?.unlocked||!MOVIES[id])return false;
  flight=true;const worldId=w.worldId;let claimed=false;
  try{if(!status.acknowledged)await transactFor(worldId,latest=>{claimed=claimCollectionEnding(latest,id,owner,now()).changed;});
   if(!alive||doc.hidden||getWorld().worldId!==worldId||!canPresent()||(automatic&&!claimed))return false;
   current={id,worldId,acked:status.acknowledged||!claimed,recordable:status.acknowledged||claimed};lastFocus=doc.activeElement;notify(true);
   dialog=doc.createElement('dialog');dialog.className='game-ending-dialog';dialog.setAttribute('aria-labelledby','game-ending-title');
   dialog.innerHTML=`<div class="game-ending-screen"><header><h2 id="game-ending-title">${TITLES[id]}</h2><button type="button" data-ending-close aria-label="エンディングを閉じる">とじる</button></header><video controls playsinline preload="none" aria-label="${status.title}"></video><div class="game-ending-actions"><button type="button" data-ending-play>▶ <ruby>再生<rt>さいせい</rt></ruby></button><button type="button" data-ending-fullscreen><ruby>全画面<rt>ぜんがめん</rt></ruby></button><button type="button" data-ending-skip>あとで<ruby>見<rt>み</rt></ruby>る</button></div><p role="status" aria-live="polite"></p></div>`;
   if(id==='garden-tour'){dialog.dataset.film='tour';const controls=doc.createElement('div');controls.className='game-ending-tour-controls';controls.append(dialog.querySelector('[role=status]'),dialog.querySelector('.game-ending-actions'));dialog.querySelector('.game-ending-screen').append(controls);}
   root.append(dialog);video=dialog.querySelector('video');video.tabIndex=0;video.volume=.5;video.src=new URL(`../game-endings/${MOVIES[id]}`,import.meta.url).href;
   video.addEventListener('playing',()=>{dialog?.setAttribute('data-playing','');if(doc.activeElement?.matches('[data-ending-play]'))video?.focus({preventScroll:true});message('');void savePlayback('started').catch(()=>message('きろくの ほぞんを まっています。'));});
   video.addEventListener('pause',()=>{dialog?.removeAttribute('data-playing');});
   video.addEventListener('ended',()=>{void close({playback:'completed'});});
   video.addEventListener('error',()=>{message('どうがを よみこめませんでした。つうしんを たしかめて、もういちど ▶ をおしてね。');});
   dialog.addEventListener('click',ev=>{ev.stopPropagation();if(ev.target.closest('[data-ending-play]'))void play({fullscreen:true});else if(ev.target.closest('[data-ending-fullscreen]'))enterFullscreen();else if(ev.target.closest('[data-ending-close],[data-ending-skip]'))void close();});
   dialog.addEventListener('cancel',ev=>{ev.preventDefault();ev.stopPropagation();void close();});
   dialog.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();void close();}else if(ev.key==='Tab'){const controls=[...dialog.querySelectorAll('button,video')].filter(e=>!e.disabled);const i=controls.indexOf(doc.activeElement);if(ev.shiftKey&&i<=0){ev.preventDefault();controls.at(-1)?.focus();}else if(!ev.shiftKey&&i===controls.length-1){ev.preventDefault();controls[0]?.focus();}}});
   dialog.showModal();dialog.querySelector('[data-ending-play]').focus({preventScroll:true});if(id==='garden-tour'){dialog.querySelector('[data-ending-play]').textContent='▶ 音声と映像を再生';message('35の庭を訪ねた記念の作品です。あなたの訪問順や個体を再現した映像ではありません。');}else void play();return true;
  }catch{if(current)remove();return false;}
  finally{flight=false;if(!current&&claimed)void transactFor(worldId,w=>releaseCollectionEnding(w,id,owner)).catch(()=>{});}
 }
 function sync(){if(!alive)return;if(current&&getWorld().worldId!==current.worldId){remove();return;}if(active()||doc.hidden||!canPresent())return;const entry=pendingCollectionEnding(getWorld());if(entry&&!blocked.has(`${getWorld().worldId}:${entry.id}`))void open(entry.id,{automatic:true});}
 const pause=()=>{try{video?.pause();}catch{}};
 const viewBlocked=()=>{if(doc.body.dataset.gameViewBlocked)pause();};
 const visibility=()=>{if(doc.hidden)pause();else sync();};
 win.addEventListener('pagehide',pause);doc.addEventListener('buncho-game-view-visibility',viewBlocked);
 doc.addEventListener('visibilitychange',visibility);
 return {active,sync,open,destroy(){alive=false;const c=current;if(c&&!c.acked)void transactFor(c.worldId,w=>releaseCollectionEnding(w,c.id,owner)).catch(()=>{});remove();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',pause);doc.removeEventListener('buncho-game-view-visibility',viewBlocked);}};
}

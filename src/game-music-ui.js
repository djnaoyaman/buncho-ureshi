import {createGameMusic,MUSIC_TRACKS} from './game-music.js';
/** Mount once outside the repainting game field. Return cleanup on route exit. */
export function mountGameMusic(host,{base='',document=globalThis.document,window=globalThis.window,...options}={}) {
  const shell=document.createElement('details');shell.className='game-music';
  shell.innerHTML=`<summary aria-label="音楽を選ぶ"><span aria-hidden="true">♫</span><span class="game-music-label">音楽</span></summary><div class="game-music-panel"><div class="game-music-tracks" role="group" aria-label="庭の音楽">${MUSIC_TRACKS.map(t=>`<button type="button" data-music="${t.id}" aria-pressed="false">${t.title}</button>`).join('')}</div><label class="game-music-volume"><span>音量</span><input type="range" min="0" max="60" step="1" aria-label="音楽の音量"></label><button type="button" data-music-off>音楽をオフ</button><p class="game-music-status" role="status" aria-live="polite"></p></div>`;
  host.append(shell);
  let storage;try{storage=window.localStorage;}catch{}
  const range=shell.querySelector('input'),message=shell.querySelector('[role=status]');
  const update=s=>{range.value=String(Math.round(s.volume*100));shell.dataset.status=s.status;for(const b of shell.querySelectorAll('[data-music]'))b.setAttribute('aria-pressed',String(b.dataset.music===s.selected&&s.status==='playing'));message.textContent=s.status==='loading'?'音楽を準備しています…':s.status==='error'?s.error:s.status==='paused'&&s.enabled?'庭にふれると音楽が流れるよ':'';shell.querySelector('[data-music-off]').setAttribute('aria-pressed',String(!s.enabled));};
  const player=createGameMusic({base,storage,...options,onChange:update});update(player.state());
  function click(e){if(!e.isTrusted)return;const b=e.target.closest('button');if(!b||!shell.contains(b))return;if(b.hasAttribute('data-music-off'))player.off();else if(b.dataset.music)void player.playFromGesture(b.dataset.music);}
  function input(e){if(e.target===range)player.setVolume(Number(range.value)/100);}
  // Default-on means armed, never autoplay: unlock only in a real game tap.
  function firstGameTap(e){
    if(!e.isTrusted||!e.target.closest('#game-root,[data-game-title-slot],[data-game-world-control]'))return;
    if(e.target.closest('[data-music-off],[data-music]'))return;
    const s=player.state();if(s.enabled&&s.status==='paused')void player.playFromGesture(s.selected);
  }
  function hidden(){if(document.hidden)player.pause();}
  function pagehide(){player.pause();}
  function keydown(e){if(e.key==='Escape'&&shell.open){shell.open=false;shell.querySelector('summary').focus();}}
  const worldAction=e=>{if(e.detail!=='music')return;shell.open=true;shell.querySelector('[data-music]')?.focus({preventScroll:true});};document.addEventListener('buncho-world-action',worldAction);
  shell.addEventListener('click',click);shell.addEventListener('input',input);shell.addEventListener('keydown',keydown);document.addEventListener('click',firstGameTap,true);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
  return ()=>{document.removeEventListener('buncho-world-action',worldAction);player.dispose();shell.removeEventListener('click',click);shell.removeEventListener('input',input);shell.removeEventListener('keydown',keydown);document.removeEventListener('click',firstGameTap,true);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);shell.remove();};
}

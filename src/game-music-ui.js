import {createGameMusic,MUSIC_TRACKS,gardenMusicTracks} from './game-music.js';
/** Mount once outside the repainting game field. Return cleanup on route exit. */
export function mountGameMusic(host,{base='',document=globalThis.document,window=globalThis.window,...options}={}) {
  const tracks=[...MUSIC_TRACKS,...gardenMusicTracks(options.gardenAssets)];
  const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shell=document.createElement('details');shell.className='game-music';
  shell.innerHTML=`<summary aria-label="音楽を選ぶ"><span aria-hidden="true">♫</span><span class="game-music-label">音楽</span></summary><div class="game-music-panel"><div class="game-music-actions"><button type="button" data-music-auto aria-label="庭に合わせて音楽を選ぶ" aria-pressed="false">庭の音楽</button><button type="button" data-music-off>音楽をオフ</button></div><label class="game-music-volume">音量<input type="range" min="0" max="60" step="1" aria-label="音楽の音量"></label><button type="button" data-music-choose aria-expanded="false" aria-controls="game-music-choices"><span class="game-music-current"></span><span class="game-music-choose-label">曲を選ぶ ▾</span></button><div id="game-music-choices" class="game-music-tracks" role="group" aria-label="庭の音楽" hidden>${tracks.map(t=>`<button type="button" data-music="${safe(t.id)}" aria-pressed="false">${safe(t.title)}</button>`).join('')}</div><p class="game-music-status" role="status" aria-live="polite"></p></div>`;
  host.append(shell);shell.hidden=true;
  let storage;try{storage=window.localStorage;}catch{}
  const range=shell.querySelector('input'),message=shell.querySelector('[role=status]');
  const chooser=shell.querySelector('[data-music-choose]'),choices=shell.querySelector('.game-music-tracks');
  function closeChoices(restoreFocus=false){choices.hidden=true;chooser.setAttribute('aria-expanded','false');if(restoreFocus)chooser.focus({preventScroll:true});}
  const update=s=>{shell.querySelector('.game-music-current').textContent=!s.enabled?'音楽はオフ':`${s.mode==='auto'?'庭にあわせる · ':''}${tracks.find(t=>t.id===s.selected)?.title||'草原の朝'}`;range.value=String(Math.round(s.volume*100));shell.dataset.status=s.status;for(const b of shell.querySelectorAll('[data-music]'))b.setAttribute('aria-pressed',String(s.mode==='fixed'&&b.dataset.music===s.fixedSelected&&s.enabled));shell.querySelector('[data-music-auto]').setAttribute('aria-pressed',String(s.mode==='auto'&&s.enabled));message.textContent=s.status==='loading'?'音楽を準備しています…':s.status==='error'?s.error:s.status==='paused'&&s.enabled?'庭にふれると音楽が流れるよ':'';shell.querySelector('[data-music-off]').setAttribute('aria-pressed',String(!s.enabled));};
  const player=createGameMusic({base,storage,...options,onChange:update});update(player.state());
  function click(e){
    if(!e.isTrusted)return;
    const b=e.target.closest('button');if(!b||!shell.contains(b))return;
    if(b===chooser){choices.hidden=!choices.hidden;chooser.setAttribute('aria-expanded',String(!choices.hidden));}
    else if(b.hasAttribute('data-music-off')){player.off();closeChoices();}
    else if(b.hasAttribute('data-music-auto')){void player.playAutoFromGesture();closeChoices();}
    else if(b.dataset.music){void player.playFromGesture(b.dataset.music);closeChoices(true);}
  }
  function input(e){if(e.target===range)player.setVolume(Number(range.value)/100);}
  // Default-on means armed, never autoplay: unlock only in a real game tap.
  function firstGameTap(e){
    if(!e.isTrusted||!e.target.closest('#game-root,[data-game-title-slot],[data-game-world-control]'))return;
    if(e.target.closest('[data-music-off],[data-music],[data-music-auto]'))return;
    const s=player.state();if(s.enabled&&s.status==='paused')void player.playCurrentFromGesture();
  }
  function gardenChanged(e){const d=e.detail;if(!d||!(d.gardenId===null||typeof d.gardenId==='string')||typeof d.worldId!=='string')return;void player.setGarden(d.gardenId,d.worldId);}
  document.addEventListener('buncho-game-garden',gardenChanged);
  function hidden(){if(document.hidden)player.pause();}
  function pagehide(){player.pause();}
  function keydown(e){if(e.key==='Escape'&&!choices.hidden){e.preventDefault();e.stopPropagation();closeChoices(true);return;}if(e.key==='Escape'&&shell.open&&!shell.closest('[data-settings-music]')){shell.open=false;shell.querySelector('summary').focus();}}
  let musicFocus=null;const beforeRender=()=>{musicFocus=shell.contains(document.activeElement)?document.activeElement:null;host.append(shell);shell.hidden=true;};const panelChanged=e=>{const slot=document.querySelector('[data-settings-music]');if(e.detail==='settings'&&slot){slot.append(shell);shell.hidden=false;shell.open=true;musicFocus?.focus({preventScroll:true});musicFocus=null;}else{musicFocus=null;closeChoices();shell.hidden=true;shell.open=false;}};document.addEventListener('buncho-game-will-render',beforeRender);document.addEventListener('buncho-game-panel',panelChanged);
  shell.addEventListener('click',click);shell.addEventListener('input',input);shell.addEventListener('keydown',keydown);document.addEventListener('click',firstGameTap,true);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
  return ()=>{document.removeEventListener('buncho-game-garden',gardenChanged);document.removeEventListener('buncho-game-will-render',beforeRender);document.removeEventListener('buncho-game-panel',panelChanged);player.dispose();shell.removeEventListener('click',click);shell.removeEventListener('input',input);shell.removeEventListener('keydown',keydown);document.removeEventListener('click',firstGameTap,true);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);shell.remove();};
}

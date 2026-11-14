// Paired pictograms share a 64-unit canvas and rounded 2.6-unit outline.
const sceneModeIcon=open=>`<svg class="game-scene-mode-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" data-scene-mode-icon="${open?'watch':'touch'}">${open?'<circle cx="28" cy="27" r="17" fill="#fffdf8" stroke="currentColor" stroke-width="2.6"/><path d="M40 40 56 56" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M18 22q2-5 7-6" stroke="#deccb4" stroke-width="2" stroke-linecap="round"/>':'<path d="M20 29V13q0-4 4-4t4 4V7q0-4 4-4t4 4v2q0-4 4-4t4 4v7q0-4 4-4t4 4v20q0 13-10 18-11 5-21-3L10 40q-7-8-3-12 4-4 8 1l5 6Z" fill="#fffdf8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 13v16m8-20v20m8-13v15m-12 7q7-6 13 1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'}</svg>`;
/** Route-scoped shell only. Move existing nodes so sharing handlers and legal
 * links survive intact, then put those same nodes back on every site route. */
export function createWorldChrome(doc) {
  const body=doc.body,menu=doc.querySelector('#menu'),toggle=doc.querySelector('#menu-toggle');
  const brand=doc.querySelector('#brand'),footer=doc.querySelector('.site-footer');
  const viewport=doc.defaultView.visualViewport,priorViewport=body.style.getPropertyValue('--game-viewport-height'),priorOffset=body.style.getPropertyValue('--game-viewport-top');
  const updateViewport=()=>{if(!active)return;const zoomed=viewport&&viewport.scale!==1;body.style.setProperty('--game-viewport-height',zoomed?'100dvh':`${viewport?.height||doc.defaultView.innerHeight}px`);body.style.setProperty('--game-viewport-top',zoomed?'0px':`${viewport?.offsetTop||0}px`);};
  viewport?.addEventListener('resize',updateViewport);viewport?.addEventListener('scroll',updateViewport);doc.defaultView.addEventListener('resize',updateViewport);
  const originalWorldControl=toggle.getAttribute('data-game-world-control');
  const siteMenuFragment=doc.createDocumentFragment(),siteMenuNodes=[...menu.children].map(node=>{const marker=doc.createComment('site-menu-return');node.before(marker);return {node,marker};});
  const exit=doc.createElement('a');exit.className='game-world-exit';exit.innerHTML='<span class="game-route-label">文鳥図鑑</span>';exit.setAttribute('aria-label','文鳥図鑑へ戻る');exit.title='写真で文鳥を学ぶ図鑑へ戻る';exit.href=doc.querySelector('base').getAttribute('href')+'encyclopedia/';exit.hidden=true;exit.setAttribute('data-game-world-control','');toggle.before(exit);
  const sceneToggle=doc.createElement('button');sceneToggle.type='button';sceneToggle.className='game-scene-controls-toggle';sceneToggle.hidden=true;sceneToggle.setAttribute('data-game-world-control','');body.append(sceneToggle);
  const priorSceneControls=body.getAttribute('data-scene-controls');
  function sceneControls(open){body.dataset.sceneControls=open?'open':'closed';sceneToggle.setAttribute('aria-expanded',String(open));sceneToggle.setAttribute('aria-label',open?'よく見る · 操作をたたんで景色を見る':'ふれ合う · 操作メニューを開く');sceneToggle.innerHTML=sceneModeIcon(open);sceneToggle.title=open?'よく見る':'ふれ合う';}
  const toggleSceneControls=()=>{if(!active)return;sceneControls(body.dataset.sceneControls!=='open');sceneToggle.focus({preventScroll:true});};
  sceneToggle.addEventListener('click',toggleSceneControls);
  const original={label:toggle.getAttribute('aria-label'),html:toggle.innerHTML,href:brand.getAttribute('href'),brandLabel:brand.getAttribute('aria-label')};
  const extras=doc.createElement('div');extras.className='world-menu-extras';extras.hidden=true;extras.setAttribute('data-game-world-control','');
  const controls=doc.createElement('nav');controls.className='world-game-controls';controls.setAttribute('aria-label','文鳥ぐらし');controls.innerHTML='<button type="button" data-world-action="settings">暮らしの設定</button><button type="button" data-world-action="help">あそびかた</button>';extras.append(controls);
  const gameReady=()=>{if(active)controls.querySelectorAll('[data-world-action]:not([data-world-action=music])').forEach(button=>{button.disabled=false;});};doc.addEventListener('buncho-game-ready',gameReady);
  const about=doc.createElement('details');about.className='world-menu-about';about.innerHTML='<summary>この庭について</summary>';
  const source=footer.querySelector('a[href="https://github.com/djnaoyaman/buncho-ureshi"]');
  const moves=[{node:footer.querySelector('.page-tools'),target:extras},{node:source,target:about},{node:footer.querySelector('a[href="'+doc.querySelector('base').getAttribute('href')+'credits/"]'),target:about},{node:footer.querySelector('.footer-bottom'),target:about}].filter(x=>x.node);
  for(const move of moves){move.marker=doc.createComment('world-menu-return');move.node.before(move.marker);}
  extras.append(about);menu.append(extras);
  const close=(restore=false)=>{const opened=!menu.hidden;menu.hidden=true;toggle.setAttribute('aria-expanded','false');if(restore&&opened)toggle.focus({preventScroll:true});};
  const escape=e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();close(true);}};
  menu.addEventListener('keydown',escape);
  const worldAction=e=>{const button=e.target.closest?.('[data-world-action]');if(!button||!active)return;close();doc.dispatchEvent(new doc.defaultView.CustomEvent('buncho-world-action',{detail:button.dataset.worldAction}));};extras.addEventListener('click',worldAction);
  let active=false,intro=null,introTimer=null,introGeneration=0;
  function clearIntro(){introGeneration++;doc.defaultView.clearTimeout(introTimer);intro?.remove();intro=null;delete body.dataset.gameIntro;}
  function startIntro(){
    clearIntro();body.dataset.gameIntro='loading';const generation=introGeneration,image=doc.createElement('img');image.alt='おもちの文鳥ぐらし';image.width=2172;image.height=724;
    image.onload=async()=>{try{if(image.decode)await image.decode();}catch{if(generation===introGeneration)body.dataset.gameIntro='done';return;}if(!active||generation!==introGeneration)return;
      body.dataset.gameIntro='shown';intro=doc.createElement('div');intro.className='game-logo-intro';intro.setAttribute('role','status');intro.setAttribute('aria-label','おもちの文鳥ぐらし、はじまるよ');intro.append(image);body.append(intro);
      introTimer=doc.defaultView.setTimeout(()=>{if(generation===introGeneration){intro?.remove();intro=null;body.dataset.gameIntro='done';}},2000);
    };
    image.onerror=()=>{if(generation===introGeneration)body.dataset.gameIntro='done';};image.src=doc.querySelector('base').getAttribute('href')+'game-art/game-title.png';
  }

  return {set(next){
    next=!!next;close();if(next===active)return;active=next;
    if(active){
      body.dataset.world='buncho';sceneControls(false);sceneToggle.hidden=false;updateViewport();controls.querySelectorAll('[data-world-action]:not([data-world-action=music])').forEach(button=>{button.disabled=true;});for(const entry of siteMenuNodes)siteMenuFragment.append(entry.node);exit.hidden=false;toggle.setAttribute('data-game-world-control','');startIntro();toggle.innerHTML='<span class="menu-bars" aria-hidden="true"></span>しおり';toggle.setAttribute('aria-label','庭のしおりをひらく');
      brand.setAttribute('href',doc.querySelector('base').getAttribute('href')+'game/');brand.setAttribute('aria-label','おもちの文鳥ぐらし');
      for(const move of moves)move.target.append(move.node);extras.hidden=false;footer.hidden=true;
    }else{
      clearIntro();sceneToggle.hidden=true;if(priorSceneControls===null)delete body.dataset.sceneControls;else body.setAttribute('data-scene-controls',priorSceneControls);delete body.dataset.world;for(const [key,value] of [['--game-viewport-height',priorViewport],['--game-viewport-top',priorOffset]]){if(value)body.style.setProperty(key,value);else body.style.removeProperty(key);}for(const entry of siteMenuNodes)entry.marker.after(entry.node);exit.hidden=true;if(originalWorldControl===null)toggle.removeAttribute('data-game-world-control');else toggle.setAttribute('data-game-world-control',originalWorldControl);toggle.innerHTML=original.html;toggle.setAttribute('aria-label',original.label);
      brand.setAttribute('href',original.href);brand.setAttribute('aria-label',original.brandLabel);
      for(const move of moves)move.marker.after(move.node);extras.hidden=true;about.open=false;footer.hidden=false;
    }
  },close,dispose(){viewport?.removeEventListener('resize',updateViewport);viewport?.removeEventListener('scroll',updateViewport);doc.defaultView.removeEventListener('resize',updateViewport);clearIntro();this.set(false);menu.removeEventListener('keydown',escape);extras.removeEventListener('click',worldAction);doc.removeEventListener('buncho-game-ready',gameReady);extras.remove();exit.remove();sceneToggle.removeEventListener('click',toggleSceneControls);sceneToggle.remove();for(const entry of siteMenuNodes)entry.marker.remove();for(const move of moves)move.marker.remove();}};
}

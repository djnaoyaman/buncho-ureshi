import {gardenSelectorOffset} from './data/gardens.js';
import {petGardenRaptor} from './garden-raptors.js';
import {renderRaptorNotebook,renderRaptorFriendship} from './garden-raptor-ui.js';
import {createGardenCrowClock,arriveGardenCrow,crowCoolingDown,crowScene,petGardenCrow,crowTarget} from './garden-crows.js';
import {renderCrowNotebook,renderCrowFriendship} from './garden-crow-ui.js';
import {mountEncounterMedia} from './encounter-media.js';
import {mountGardenBirdMotion} from './garden-bird-motion.js';
import {encounterSystem} from './encounters.js';
import {renderEncounterNotebook,renderEncounterPage,renderEncounterScene,renderFinchGarden,renderEncounterFriendship} from './encounter-ui.js';
/** Host injects its single existing transaction store. Never creates a second save/backend. */
export function mountEncounterPanel(root,{getWorld,transact,getSelectedBirdId=()=>null,onHouseholdBird=()=>{},onGarden=async()=>{},onGardenChanged=()=>{},onHome=()=>{},onReward=()=>{},meetFriend=null,completeEncounter=null,system=encounterSystem,initialMode='notebook',base='/buncho-ureshi/',crowRandom=Math.random}={}){
  if(typeof getWorld!=='function'||typeof transact!=='function')throw new Error('図鑑の保存先が必要です。');
  let alive=true,busy=false,mode=initialMode==='garden'?'garden':'notebook',pageId=null,showPhoto=false,generation=0,notice='',worldId=getWorld().worldId,revealGardenId=null,renderedView=null;
  let rub=null,petFlight=false,petTimer=null;
 const crowClock=createGardenCrowClock({random:crowRandom});
 let crowFlight=false,crowTimer=null,crowPhase=null,crowEpoch=0,crowContext=null;
 const stopCrow=()=>{crowClock.reset();crowEpoch++;};
 const syncCrowContext=w=>{const key=`${w.worldId}:${w.encounters.garden.id}:${crowTarget(w)?.id}`;if(key!==crowContext){stopCrow();crowContext=key;}return key;};
  const doc=root.ownerDocument,win=doc.defaultView;
  const media=mountEncounterMedia(root);
  let hostCatalogScroll=null,hostGardenScroll=null,hostEntryReading=null,renderedReadingKey=null;
  const entryReading=()=>{
    const card=root.querySelector('.finch-record-card');if(!card||!renderedReadingKey)return null;
    const active=doc.activeElement,focused=active?.matches('summary')?active.parentElement.dataset.notebookReading:null;
    return {key:renderedReadingKey,open:[...card.querySelectorAll('details[data-notebook-reading][open]')].map(d=>d.dataset.notebookReading),focused,scroll:root.scrollTop};
  };
  const rememberCatalog=()=>{
    hostEntryReading=entryReading();
    const catalog=root.querySelector('.finch-catalog');hostCatalogScroll=catalog?{view:renderedView,top:catalog.scrollTop}:null;
    // The game replaces its overlay before calling refresh(). Capture the
    // inner dock while it is still attached; reading after reattachment is
    // too late in browsers that reset nested scroll offsets on detach.
    const garden=root.querySelector('.finch-garden');
    hostGardenScroll=garden?{
      view:renderedView,world:garden.dataset.gardenWorld,
      gardenId:garden.querySelector('[aria-current=page]')?.dataset.gardenSelect,
      details:new Map([...garden.querySelectorAll('details[data-garden-details][open]')].map(d=>[d.dataset.gardenDetails,d.scrollTop])),
    }:null;
  };
  doc.addEventListener('buncho-game-will-render',rememberCatalog);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({focus=false}={}){
    if(!alive)return;const w=getWorld();syncCrowContext(w);
    if(mode!=='garden'||w.paused||w.worldId!==worldId||doc.querySelector('.game-bird-sheet[open]'))stopCrow();
    if(w.worldId===worldId&&rub&&rub.generation===generation&&['entry','crows','raptors'].includes(mode)&&pageId===rub.id){refreshBond();return;}
    if(w.worldId!==worldId){rub=null;clearTimeout(petTimer);}
    const view=`${w.worldId}:${mode}:${pageId}:${showPhoto}`,oldEntryScroll=view===renderedView?root.scrollTop:0;
    const oldCatalogScroll=view===renderedView?(hostCatalogScroll?.view===view?hostCatalogScroll.top:root.querySelector('.finch-catalog')?.scrollTop):0;
    hostCatalogScroll=null;
    renderedView=view;
    const oldGarden=root.querySelector('.finch-garden');
    const savedGarden=hostGardenScroll?.view===view&&hostGardenScroll.world===w.worldId
      &&hostGardenScroll.gardenId===w.encounters.garden.id?hostGardenScroll:null;
    hostGardenScroll=null;
    const oldDetails=savedGarden?.details||new Map(oldGarden?[...oldGarden.querySelectorAll('details[data-garden-details][open]')].map(d=>[d.dataset.gardenDetails,d.scrollTop]):[]);
    const oldSelector=root.querySelector('.finch-garden-selector');
    const oldScroll=oldSelector?.scrollLeft, oldSelected=oldSelector?.querySelector('[aria-current=page]')?.dataset.gardenSelect;
    if(w.worldId!==worldId){worldId=w.worldId;generation++;busy=false;mode='notebook';pageId=null;notice='';}
    const nextReadingKey=['entry','raptors','crows'].includes(mode)&&pageId?`${w.worldId}:${mode}:${pageId}`:null,priorReading=hostEntryReading||entryReading();
    const savedReading=priorReading?.key===nextReadingKey?priorReading:null;hostEntryReading=null;renderedReadingKey=nextReadingKey;
    media.preserve();
    root.innerHTML=(mode==='raptors'?renderRaptorNotebook(w,{base,id:pageId}):mode==='crows'?renderCrowNotebook(w,{base,id:pageId}):mode==='event'?renderEncounterScene(w,{system,base}):mode==='garden'?renderFinchGarden(w,{system,base,selectedBirdId:getSelectedBirdId(),crowWarning:crowClock.warning}):mode==='entry'?renderEncounterPage(w,pageId,{system,base,showPhoto}):renderEncounterNotebook(w,{system,base}))+`<p class="finch-notice" role="status">${escape(notice)}</p><button type="button" class="finch-media-retry" data-media-retry hidden>絵をもう一度読み込む</button>`;
    const selector=root.querySelector('.finch-garden-selector');
    if(selector){
      const selected=selector.querySelector('[aria-current=page]');
      if(oldScroll!=null)selector.scrollLeft=oldScroll;
      if(selected && (oldScroll==null || selected.dataset.gardenSelect!==oldSelected))revealGardenId=selected.dataset.gardenSelect;
      if(revealGardenId){
        // A newly mounted panel can be detached during render. Wait until layout
        // exists, and carry the intent across any intervening re-render.
        const reveal=()=>{
          if(!alive||!selector.isConnected||root.querySelector('.finch-garden-selector')!==selector)return;
          const target=selector.querySelector('[aria-current=page]');
          if(!target||target.dataset.gardenSelect!==revealGardenId||!selector.clientWidth)return;
          const view=selector.getBoundingClientRect(),item=target.getBoundingClientRect();
          if(item.left<view.left)selector.scrollLeft+=item.left-view.left;
          else if(item.right>view.right)selector.scrollLeft+=item.right-view.right;
          revealGardenId=null;
        };
        if(typeof requestAnimationFrame==='function')requestAnimationFrame(reveal);else reveal();
      }
    }
    // Restore only within the same garden and world; navigation starts fresh.
    const newGarden=root.querySelector('.finch-garden');
    if(oldGarden && newGarden && oldGarden.dataset.gardenWorld===newGarden.dataset.gardenWorld && oldSelected===newGarden.querySelector('[aria-current=page]')?.dataset.gardenSelect){
      const details=[...root.querySelectorAll('details[data-garden-details]')];
      // Open nested memories first so the outer pane has its final height
      // before the browser clamps its restored scroll position.
      for(const detail of details)if(oldDetails.has(detail.dataset.gardenDetails))detail.open=true;
      for(const detail of details)if(oldDetails.has(detail.dataset.gardenDetails))detail.scrollTop=oldDetails.get(detail.dataset.gardenDetails);
    }
    if(savedReading){for(const detail of root.querySelectorAll('details[data-notebook-reading]'))detail.open=savedReading.open.includes(detail.dataset.notebookReading);if(!focus&&savedReading.focused)for(const detail of root.querySelectorAll('details[data-notebook-reading]'))if(detail.dataset.notebookReading===savedReading.focused)detail.querySelector('summary')?.focus({preventScroll:true});}
    root.scrollTop=savedReading?.scroll??oldEntryScroll;
    const catalog=root.querySelector('.finch-catalog');if(catalog)catalog.scrollTop=oldCatalogScroll||0;
    media.refresh();
    root.setAttribute('aria-busy',String(busy));
    if(busy)for(const button of root.querySelectorAll('button'))button.disabled=true;
    doc.dispatchEvent(new win.CustomEvent('buncho-game-encounter-view',{detail:{mode}}));
    if(focus)root.querySelector('h3')?.focus({preventScroll:true});
  }
  function refreshBond(){
    if(!alive||!['entry','crows','raptors'].includes(mode))return;
    if(mode==='raptors'){const bond=root.querySelector('[data-raptor-friendship]');if(bond)bond.outerHTML=renderRaptorFriendship(getWorld(),pageId);return;}
    if(mode==='crows'){const bond=root.querySelector('[data-crow-friendship]');if(bond)bond.outerHTML=renderCrowFriendship(getWorld(),pageId);return;}
    const bond=root.querySelector('[data-finch-friendship]');
    if(bond)bond.outerHTML=renderEncounterFriendship(getWorld(),pageId,{system});
    const status=root.querySelector('.finch-notice');if(status)status.textContent=notice;
  }
  async function flushPet(){
    if(petFlight||!rub||!rub.pending||!alive)return;
    const session=rub,amount=Math.min(8,session.pending);session.pending-=amount;petFlight=true;let feedback;
    try{await transact(w=>{
      if(!alive||session.generation!==generation||session.worldId!==w.worldId||!['entry','crows','raptors'].includes(mode)||pageId!==session.id)return w;
      feedback=(mode==='raptors'?petGardenRaptor:mode==='crows'?petGardenCrow:system.pet)(w,session.id,amount,{worldId:w.worldId,revision:w.revision});return w;
    },{gesture:true});if(alive&&session.generation===generation){notice=feedback?.message||'';refreshBond();}}
    catch{if(alive&&session.generation===generation){notice='記録できなかったよ。もう一度なでてね。';refreshBond();}}
    finally{petFlight=false;if(rub===session){if(session.pending)petTimer=setTimeout(flushPet,100);else if(!session.active){rub=null;render();if(session.keyboard)root.querySelector('[data-encounter-rub]')?.focus({preventScroll:true});}}}
  }
  function startRub(event){
    const target=event.target.closest('[data-encounter-rub]');
    if(!target||!root.contains(target)||busy||petFlight||rub||event.isPrimary===false||event.button!==0)return;
    event.preventDefault();const w=getWorld();
    rub={id:target.dataset.encounterRub,worldId:w.worldId,generation,pointerId:event.pointerId,x:event.clientX,y:event.clientY,distance:0,pending:0,active:true};
  }
  function moveRub(event){
    if(!rub||!rub.active||event.pointerId!==rub.pointerId)return;
    if(!alive||!['entry','crows','raptors'].includes(mode)||pageId!==rub.id||getWorld().worldId!==rub.worldId){rub=null;return;}
    const target=root.querySelector('[data-encounter-rub]'),box=target?.getBoundingClientRect();
    const distance=Math.hypot(event.clientX-rub.x,event.clientY-rub.y);rub.x=event.clientX;rub.y=event.clientY;
    if(!box||event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom){rub.distance=0;return;}
    event.preventDefault();rub.distance+=Math.min(distance,96);
    const strokes=Math.floor(rub.distance/24);rub.distance%=24;
    if(strokes){rub.pending=Math.min(32,rub.pending+strokes);if(!petFlight)flushPet();}
  }
  function endRub(event){if(!rub||event.pointerId!==rub.pointerId)return;rub.active=false;if(!petFlight&&rub.pending)flushPet();else if(!petFlight){rub=null;render();}}
  function keyRub(event){
    const target=event.target.closest('[data-encounter-rub]');
    if(!target||!root.contains(target)||!['Enter',' '].includes(event.key)||event.repeat||busy||petFlight||rub)return;
    event.preventDefault();const w=getWorld();rub={id:target.dataset.encounterRub,worldId:w.worldId,generation,pending:1,active:false,keyboard:true};flushPet();
  }
  async function mutate(operation,token){
    busy=true;render();let feedback;
    try{await transact(w=>{if(!alive||token!==generation)return w;feedback=operation(w);return w;});if(!alive||token!==generation)return null;return feedback;}
    catch{if(alive&&token===generation)notice='記録できなかったよ。今の保存はそのままです。もう一度試してね。';return null;}
    finally{if(alive&&token===generation){busy=false;render();}}
  }
  async function click(event){
    const button=event.target.closest('button');if(!button||!root.contains(button)||busy)return;
    if(rub){rub=null;clearTimeout(petTimer);generation++;}
    if(button.hasAttribute('data-finch-go-home')){const token=++generation,originalWorld=getWorld().worldId,isCurrent=()=>alive&&token===generation&&getWorld().worldId===originalWorld;busy=true;render();try{await onHome(isCurrent);}catch{if(isCurrent())notice='おうちをひらけなかったよ。もう一度試してね。';}finally{if(isCurrent()){busy=false;render();}}return;}
    if(button.hasAttribute('data-encounter-invite-garden')||button.hasAttribute('data-encounter-invite-cage')||button.hasAttribute('data-encounter-dismiss-cage')){
      const token=++generation,w=getWorld(),expected=button.hasAttribute('data-encounter-dismiss-cage')?{worldId:button.dataset.goodbyeWorld,revision:Number(button.dataset.goodbyeRevision)}:{worldId:w.worldId,revision:w.revision};
      const gardenInvite=button.hasAttribute('data-encounter-invite-garden'),cageInvite=button.hasAttribute('data-encounter-invite-cage');
      const id=gardenInvite?button.dataset.encounterInviteGarden:cageInvite?button.dataset.encounterInviteCage:button.dataset.encounterDismissCage;
      const result=await mutate(current=>(gardenInvite?system.inviteGarden:cageInvite?system.inviteCage:system.dismissCage)(current,id,expected),token);
      if(!alive||token!==generation)return;notice=result?.message||'';
      if(gardenInvite&&(result?.changed||result?.resumed)){mode='garden';try{onGardenChanged({gardenId:getWorld().encounters.garden.id,worldId:getWorld().worldId,generation:token});}catch{}}
      render({focus:true});return;
    }
    if(button.hasAttribute('data-garden-scroll')){const selector=root.querySelector('.finch-garden-selector');if(selector)selector.scrollLeft=gardenSelectorOffset(selector.scrollLeft,selector.clientWidth,selector.scrollWidth,button.dataset.gardenScroll);return;}
    if(button.hasAttribute('data-garden-household')){stopCrow();const id=button.dataset.gardenHousehold,w=getWorld();if(w.birds.some(b=>b.id===id&&b.home==='resident'&&['juvenile','adult'].includes(b.stage)))onHouseholdBird(id);return;}
    if(button.hasAttribute('data-raptor-entry')){generation++;stopCrow();mode='raptors';pageId=button.dataset.raptorEntry;notice='';render({focus:true});return;}
    if(button.hasAttribute('data-crow-notebook')||button.hasAttribute('data-crow-entry')){generation++;stopCrow();mode='crows';pageId=button.dataset.crowEntry||null;notice='';render({focus:true});return;}
    if(button.hasAttribute('data-encounter-page')){pageId=button.dataset.encounterPage;mode='entry';showPhoto=false;notice='';render({focus:true});return;}
    // Reading the notebook is still the same visit. The host closes the session on actual home/overlay exits.
    if(button.hasAttribute('data-encounter-back')||button.hasAttribute('data-encounter-close')){generation++;stopCrow();mode='notebook';pageId=null;showPhoto=false;notice='';render({focus:true});return;}
    if(button.hasAttribute('data-encounter-view')){showPhoto=button.dataset.encounterView==='photo';render();root.querySelector(`[data-encounter-view="${showPhoto?'photo':'art'}"]`)?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-finch-go-garden')){await garden();return;}
    if(button.hasAttribute('data-garden-select')){await garden(button.dataset.gardenSelect);return;}
    if(button.hasAttribute('data-garden-accompany')){
      const scene=button.closest('[data-garden-world]'),token=++generation,expected={worldId:scene.dataset.gardenWorld,revision:Number(scene.dataset.gardenRevision)};
      const result=await mutate(w=>system.chooseAccompaniment(w,!w.encounters.gardenFriends.accompany,expected),token);
      if(alive&&token===generation){notice=result?.changed?'次のおでかけの同行を変えたよ。今の同行や警告は変わらないよ。':'';render();}return;
    }
    if(button.hasAttribute('data-garden-companion')){
      const scene=button.closest('[data-garden-world]'),token=++generation,expected={worldId:scene.dataset.gardenWorld,revision:Number(scene.dataset.gardenRevision)},id=button.dataset.gardenCompanion;
      const result=await mutate(w=>{const ids=w.encounters.gardenFriends.companions;return system.chooseCompanions(w,ids.includes(id)?ids.filter(x=>x!==id):[...ids,id],expected);},token);
      if(alive&&token===generation){notice=result?.changed?'次のおでかけで同行する家族を選んだよ。':'同行は4羽まで選べるよ。';render();}return;
    }
    if(button.hasAttribute('data-garden-friend')){
      const scene=button.closest('[data-garden-world]'),token=++generation,expected={worldId:scene.dataset.gardenWorld,revision:Number(scene.dataset.gardenRevision)};
      const result=await mutate(w=>(meetFriend||system.meetGardenFriend)(w,button.dataset.gardenFriend,button.dataset.gardenFriendAction,expected),token);
      if(alive&&token===generation){notice=result?.message||'またゆっくり遊ぼう。';render();if(result?.gemAward)onReward(result.gemAward);}return;
    }
    if(button.hasAttribute('data-garden-observe')){
      const scene=button.closest('[data-garden-world]'),token=++generation;
      const expected={worldId:scene.dataset.gardenWorld,revision:Number(scene.dataset.gardenRevision)};
      const result=await mutate(w=>system.observeGarden(w,button.dataset.gardenObserve,expected),token);
      if(alive&&token===generation){notice=result?.arrived?'小さなお客さまが来たよ。':'';render();}return;
    }
    if(button.hasAttribute('data-encounter-open')){await open(button.dataset.encounterOpen);return;}
    if(button.hasAttribute('data-encounter-act')){
      const scene=button.closest('[data-encounter-instance]');if(!scene)return;
      const expected={worldId:scene.dataset.encounterWorld,revision:Number(scene.dataset.encounterRevision)},instance=Number(scene.dataset.encounterInstance),action=button.dataset.encounterAct,token=++generation;
      const feedback=await mutate(w=>(completeEncounter||system.act)(w,instance,action,expected),token);if(!alive||token!==generation)return;
      if(feedback?.revealed){pageId=feedback.id;mode='entry';showPhoto=false;notice=feedback.message;}
      else if(feedback&&!feedback.changed)notice=feedback.message||'もう一度ひらいてみよう。';
      render({focus:true});if(feedback?.gemAward)onReward(feedback.gemAward);
    }
  }
  async function garden(gardenId=getWorld().encounters.garden.id){
    if(!alive||busy)return false;const token=++generation,originalWorld=getWorld().worldId;notice='';
    try{await onGarden(gardenId);}catch{if(alive&&token===generation){notice='庭をひらけなかったよ。もう一度試してね。';render();}return false;}
    if(!alive||token!==generation||getWorld().worldId!==originalWorld)return false;
    const w=getWorld(),expected={worldId:w.worldId,revision:w.revision},startingGarden=w.encounters.garden.id;
    // A clock tick may advance the revision while this transaction waits. A
    // newer selection in another tab must still win, but unrelated updates do
    // not invalidate this garden choice.
    const result=await mutate(current=>{
      const sameChoiceContext=current.worldId===expected.worldId&&current.encounters.garden.id===startingGarden;
      return system.selectGarden(current,gardenId,sameChoiceContext?{worldId:current.worldId,revision:current.revision}:expected);
    },token);
    if(!alive||token!==generation)return false;
    if(!(result?.changed||result?.resumed)){notice=result?.message||'庭をひらけなかったよ。もう一度試してね。';render();return false;}
    mode='garden';render({focus:true});try{Promise.resolve(onGardenChanged({gardenId,worldId:getWorld().worldId,generation:token})).catch(()=>{});}catch{}return true;
  }
  async function open(id){
    const destination=system.status(getWorld(),id).gardenId||getWorld().encounters.garden.id;
    if(!await garden(destination))return;const token=++generation;
    const w=getWorld(),expected={worldId:w.worldId,revision:w.revision};
    const feedback=await mutate(current=>system.open(current,id,expected),token);if(!alive||token!==generation)return;
    if(feedback?.changed||feedback?.resumed)mode='event';else notice=feedback?.message||'今は会えないみたい。また庭で探してみよう。';render({focus:true});
  }
  function crowEligible(requireReady=true){
    const w=getWorld();
    return !w.encounters.raptor?.active&&!!crowTarget(w)&&alive&&mode==='garden'&&root.isConnected&&doc.visibilityState!=='hidden'&&win?.navigator?.onLine!==false&&!w.paused&&w.encounters.garden.open&&!doc.querySelector('.game-bird-sheet[open]')&&!!root.querySelector('.finch-garden-stage')&&(!requireReady||root.querySelector('.finch-garden-stage').dataset.sceneState==='ready');
  }
  function canStartCrowWarning(){
    return crowEligible()&&!busy&&!crowFlight&&!crowClock.warning&&!crowCoolingDown(getWorld());
  }
  function startCrowWarning(id){
    if(!canStartCrowWarning())return false;
    const w=getWorld(),now=win.performance.now();
    crowClock.sample({key:syncCrowContext(w),now,eligible:true,available:false});
    if(!crowClock.startWarning(id,now))return false;
    render();return true;
  }
  async function pollCrow(){
    if(!alive)return;
    const w=getWorld(),now=Date.now(),phase=crowScene(w,now)?.phase||null,priorWarning=crowClock.warning;
    // Rendering the shared warning can briefly reload its stage before the
    // crow timer runs in the same turn. Keep the warning, but spend no warning
    // time until the scene is ready again. Real navigation still resets it.
    syncCrowContext(w);
    if(crowClock.warning&&crowEligible(false)&&!crowEligible()){
      crowClock.holdWarning(win.performance.now());
      if(alive)crowTimer=win.setTimeout(pollCrow,1000);return;
    }
    const event=crowClock.sample({key:syncCrowContext(w),now:win.performance.now(),eligible:crowEligible(),available:!busy&&!crowFlight&&!crowCoolingDown(w,now)});
    if(event?.kind!=='arrive'&&(phase!==crowPhase||event?.kind==='warning'||priorWarning!==crowClock.warning)){crowPhase=phase;render();}
    if(event?.kind==='arrive'){
      const originalWorld=w.worldId,originalBird=crowTarget(w)?.id,gardenId=w.encounters.garden.id,token=generation,session=crowEpoch;
      crowFlight=true;let feedback,committed=false;
      try{await transact(current=>{
        if(!alive||token!==generation||session!==crowEpoch||!crowEligible()||current.worldId!==originalWorld||crowTarget(current)?.id!==originalBird||current.encounters.garden.id!==gardenId)return current;
        feedback=arriveGardenCrow(current,event.id,Date.now(),{worldId:current.worldId,revision:current.revision,gardenId});return current;
      });committed=!!feedback?.changed;if(alive&&token===generation&&feedback?.changed){notice='';crowPhase=crowScene(getWorld())?.phase||null;render();}}
      catch{if(alive&&token===generation){notice='カラスの記録を保存できなかったよ。元気と保存はそのままです。';render();}}
      finally{crowFlight=false;if(!committed)stopCrow();}
    }
    if(alive)crowTimer=win.setTimeout(pollCrow,1000);
  }
  const crowInterrupted=()=>{stopCrow();if(alive&&mode==='garden')render();};
  const crowModalObserver=win.MutationObserver?new win.MutationObserver(records=>{if(records.some(r=>r.target.matches?.('.game-bird-sheet')))stopCrow();}):null;
  if(doc.documentElement)crowModalObserver?.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
  doc.addEventListener('visibilitychange',crowInterrupted);
  win.addEventListener('offline',crowInterrupted);
  win.addEventListener('pagehide',crowInterrupted);
  crowTimer=win.setTimeout(pollCrow,1000);
  root.classList.add('finch-overlay-content');root.addEventListener('click',click);root.addEventListener('pointerdown',startRub);root.addEventListener('keydown',keyRub);doc.addEventListener('pointermove',moveRub,{passive:false});doc.addEventListener('pointerup',endRub);doc.addEventListener('pointercancel',endRub);render();
  const motion=mountGardenBirdMotion(root,{enabled:()=>alive&&!getWorld().paused&&getWorld().settings.motion});
  return {canStartCrowWarning,startCrowWarning,hasCrowPending:()=>alive&&(!!crowClock.warning||crowFlight),open,garden,entry(id){generation++;rub=null;busy=false;mode='entry';pageId=id;showPhoto=false;notice='';render({focus:true});},notebook(){rub=null;generation++;busy=false;mode='notebook';pageId=null;notice='';render({focus:true});},refresh(){render();},destroy(){stopCrow();crowModalObserver?.disconnect();win.clearTimeout(crowTimer);doc.removeEventListener('visibilitychange',crowInterrupted);win.removeEventListener('offline',crowInterrupted);win.removeEventListener('pagehide',crowInterrupted);doc.removeEventListener('buncho-game-will-render',rememberCatalog);media.destroy();motion();alive=false;generation++;rub=null;clearTimeout(petTimer);root.removeEventListener('pointerdown',startRub);root.removeEventListener('keydown',keyRub);doc.removeEventListener('pointermove',moveRub);doc.removeEventListener('pointerup',endRub);doc.removeEventListener('pointercancel',endRub);root.removeEventListener('click',click);root.removeAttribute('aria-busy');root.classList.remove('finch-overlay-content');}};
}

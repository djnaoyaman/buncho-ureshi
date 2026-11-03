import {mountGardenBirdMotion} from './garden-bird-motion.js';
import {encounterSystem} from './encounters.js';
import {renderEncounterNotebook,renderEncounterPage,renderEncounterScene,renderFinchGarden} from './encounter-ui.js';
/** Host injects its single existing transaction store. Never creates a second save/backend. */
export function mountEncounterPanel(root,{getWorld,transact,getSelectedBirdId=()=>null,onHouseholdBird=()=>{},onGarden=async()=>{},onGardenChanged=()=>{},onReward=()=>{},meetFriend=null,completeEncounter=null,system=encounterSystem,initialMode='notebook',protagonistFlight=null,base='/buncho-ureshi/'}={}){
  if(typeof getWorld!=='function'||typeof transact!=='function')throw new Error('図鑑の保存先が必要です。');
  let alive=true,busy=false,mode=initialMode==='garden'?'garden':'notebook',pageId=null,showPhoto=false,generation=0,notice='',worldId=getWorld().worldId,revealGardenId=null;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({focus=false}={}){
    if(!alive)return;const w=getWorld();
    const oldGarden=root.querySelector('.finch-garden');
    const oldOpenDetails=new Set(oldGarden?[...oldGarden.querySelectorAll('details[data-garden-details][open]')].map(d=>d.dataset.gardenDetails):[]);
    const oldDockScroll=root.querySelector('.finch-garden-dock details[name="garden-tools"][open]')?.scrollTop;
    const oldSelector=root.querySelector('.finch-garden-selector');
    const oldScroll=oldSelector?.scrollLeft, oldSelected=oldSelector?.querySelector('[aria-current=page]')?.dataset.gardenSelect;
    if(w.worldId!==worldId){worldId=w.worldId;generation++;busy=false;mode='notebook';pageId=null;notice='';}
    root.innerHTML=(mode==='event'?renderEncounterScene(w,{system,base}):mode==='garden'?renderFinchGarden(w,{system,base,selectedBirdId:getSelectedBirdId()}):mode==='entry'?renderEncounterPage(w,pageId,{system,base,showPhoto}):renderEncounterNotebook(w,{system,base}))+`<p class="finch-notice" role="status">${escape(notice)}</p>`;
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
      for(const detail of root.querySelectorAll('details[data-garden-details]'))if(oldOpenDetails.has(detail.dataset.gardenDetails))detail.open=true;
      const openDock=root.querySelector('.finch-garden-dock details[name="garden-tools"][open]');
      if(openDock && oldDockScroll!=null)openDock.scrollTop=oldDockScroll;
    }
    root.setAttribute('aria-busy',String(busy));
    if(busy)for(const button of root.querySelectorAll('button'))button.disabled=true;
    if(focus)root.querySelector('h3')?.focus({preventScroll:true});
  }
  async function mutate(operation,token){
    busy=true;render();let feedback;
    try{await transact(w=>{if(!alive||token!==generation)return w;feedback=operation(w);return w;});if(!alive||token!==generation)return null;return feedback;}
    catch{if(alive&&token===generation)notice='記録できなかったよ。今の保存はそのままです。もう一度試してね。';return null;}
    finally{if(alive&&token===generation){busy=false;render();}}
  }
  async function click(event){
    const button=event.target.closest('button');if(!button||!root.contains(button)||busy)return;
    if(button.hasAttribute('data-garden-scroll')){const selector=root.querySelector('.finch-garden-selector');if(selector)selector.scrollLeft+=(button.dataset.gardenScroll==='next'?1:-1)*selector.clientWidth;return;}
    if(button.hasAttribute('data-garden-household')){const id=button.dataset.gardenHousehold,w=getWorld();if(w.birds.some(b=>b.id===id&&b.home==='resident'&&['juvenile','adult'].includes(b.stage)))onHouseholdBird(id);return;}
    if(button.hasAttribute('data-encounter-page')){pageId=button.dataset.encounterPage;mode='entry';showPhoto=false;notice='';render({focus:true});return;}
    if(button.hasAttribute('data-encounter-back')||button.hasAttribute('data-encounter-close')){const token=++generation,w=getWorld(),expected={worldId:w.worldId,revision:w.revision};await mutate(current=>system.leaveGarden(current,expected),token);if(!alive||token!==generation)return;mode='notebook';notice='';render({focus:true});return;}
    if(button.hasAttribute('data-encounter-view')){showPhoto=button.dataset.encounterView==='photo';render();root.querySelector(`[data-encounter-view="${showPhoto?'photo':'art'}"]`)?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-finch-go-garden')){await garden();return;}
    if(button.hasAttribute('data-garden-select')){await garden(button.dataset.gardenSelect);return;}
    if(button.hasAttribute('data-garden-companion')){
      const scene=button.closest('[data-garden-world]'),token=++generation,expected={worldId:scene.dataset.gardenWorld,revision:Number(scene.dataset.gardenRevision)},id=button.dataset.gardenCompanion;
      const result=await mutate(w=>{const ids=w.encounters.gardenFriends.companions;return system.chooseCompanions(w,ids.includes(id)?ids.filter(x=>x!==id):[...ids,id],expected);},token);
      if(alive&&token===generation){notice=result?.changed?'同行する家族を選んだよ。':'同行は4羽まで選べるよ。';render();}return;
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
    if(!await garden())return;const token=++generation;
    const w=getWorld(),expected={worldId:w.worldId,revision:w.revision};
    const feedback=await mutate(current=>system.open(current,id,expected),token);if(!alive||token!==generation)return;
    if(feedback?.changed||feedback?.resumed)mode='event';else notice=feedback?.message||'今は会えないみたい。また庭で探してみよう。';render({focus:true});
  }
  root.classList.add('finch-overlay-content');root.addEventListener('click',click);render();
  // Flight is opt-in until its original artwork passes motion review.
  const flight=protagonistFlight?.({root,getWorld,enabled:()=>alive&&!getWorld().paused&&getWorld().settings.motion,base});
  const motion=mountGardenBirdMotion(root,{enabled:()=>alive&&!getWorld().paused&&getWorld().settings.motion,reservedIds:()=>flight?.reservedIds?.()||[]});
  return {open,garden,notebook(){generation++;busy=false;mode='notebook';pageId=null;notice='';render({focus:true});},refresh(){render();},destroy(){motion();flight?.destroy?.();alive=false;generation++;root.removeEventListener('click',click);root.removeAttribute('aria-busy');root.classList.remove('finch-overlay-content');}};
}


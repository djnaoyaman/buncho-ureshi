import {encounterSystem} from './encounters.js';
import {renderEncounterNotebook,renderEncounterPage,renderEncounterScene,renderFinchGarden} from './encounter-ui.js';
/** Host injects its single existing transaction store. Never creates a second save/backend. */
export function mountEncounterPanel(root,{getWorld,transact,onGarden=async()=>{},onGardenChanged=()=>{},onReward=()=>{},meetFriend=null,completeEncounter=null,system=encounterSystem,base='/buncho-ureshi/'}={}){
  if(typeof getWorld!=='function'||typeof transact!=='function')throw new Error('図鑑の保存先が必要です。');
  let alive=true,busy=false,mode='notebook',pageId=null,showPhoto=false,generation=0,notice='',worldId=getWorld().worldId;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({focus=false}={}){
    if(!alive)return;const w=getWorld();
    if(w.worldId!==worldId){worldId=w.worldId;generation++;busy=false;mode='notebook';pageId=null;notice='';}
    root.innerHTML=(mode==='event'?renderEncounterScene(w,{system,base}):mode==='garden'?renderFinchGarden(w,{system,base}):mode==='entry'?renderEncounterPage(w,pageId,{system,base,showPhoto}):renderEncounterNotebook(w,{system,base}))+`<p class="finch-notice" role="status">${escape(notice)}</p>`;
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
    const w=getWorld(),expected={worldId:w.worldId,revision:w.revision};
    const result=await mutate(current=>system.selectGarden(current,gardenId,expected),token);
    if(!alive||token!==generation||!(result?.changed||result?.resumed))return false;
    mode='garden';render({focus:true});try{Promise.resolve(onGardenChanged({gardenId,worldId:getWorld().worldId,generation:token})).catch(()=>{});}catch{}return true;
  }
  async function open(id){
    if(!await garden())return;const token=++generation;
    const w=getWorld(),expected={worldId:w.worldId,revision:w.revision};
    const feedback=await mutate(current=>system.open(current,id,expected),token);if(!alive||token!==generation)return;
    if(feedback?.changed||feedback?.resumed)mode='event';else notice=feedback?.message||'今は会えないみたい。また庭で探してみよう。';render({focus:true});
  }
  root.classList.add('finch-overlay-content');root.addEventListener('click',click);render();
  return {open,garden,notebook(){generation++;mode='notebook';pageId=null;notice='';render({focus:true});},refresh(){render();},destroy(){alive=false;generation++;root.removeEventListener('click',click);root.removeAttribute('aria-busy');root.classList.remove('finch-overlay-content');}};
}

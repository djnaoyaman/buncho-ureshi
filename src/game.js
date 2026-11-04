import {encounterCageActors,renderEncounterCageGuest} from './encounter-ui.js';
import {mountEncounterPanel} from './encounter-controller.js';
import {encounterSystem} from './encounters.js';
import {loadOwnerProfile,renderOwnerAvatar,mountOwnerProfile} from './owner-profile.js';
import {renderOwnerPeek,renderOwnerPortrait,ownerAnimationDelay} from './owner-peek.js';
import { renderRelationshipMap, navigateRelationships, bindRelationshipNavigation } from './relationship-map.js';
import { suggestLegacyNumberedNames } from './bird-names.js';
import { familyLayout } from './family-layout.js';
import { completeEncounterReward, meetGardenFriendReward, setAdoptionMode, resolveAdoption, economyToken, claimAutomaticGift, buyOrdinaryFurniture, ordinaryFurnitureCatalog, SAVE_VERSION, createWorld, resetTemporaryState, resetFurniturePlacement, bumpRevision, advanceTo, advanceTicks, findBird, birdName, adoptBird, renameBird, talkToBird, relationshipLabel, eventText, parseSave, serializeWorld, validateWorld, ACTIONS, STAGES, LIMITS, TICK_MS, MAX_SAVE_BYTES, DECOR_SLOTS, DECOR_COLORS, DECOR_TIERS, DECOR_DRAW_COST, decorLevel, decorOdds, drawDecoration, equipDecoration, travelTo, fieldBirds, inviteFriend, feedBird, petBird, cleanGarden, getFullness, getCleanliness, collectDropping, careWindow, reconcileImportedCare } from './engine.js';

import { createCareAudio } from './care-audio.js';
import { openGameStore } from './game-store.js';
import { SPRITE_CONTACT } from './habitat-layout.js';
import { fieldPositions, furnitureSvg, furnitureSceneSvg, friendFurnishing, furnitureFormIndex, furnitureFormName } from './field-visuals.js';
import { poseGeometry, birdPose, createPoseClock, refreshPoseSubtrees } from './bird-poses.js';
export function formatGameAmount(value){return value>=100000000?`${Math.floor(value/10000000)/10}億`:value>=10000?`${Math.floor(value/1000)/10}万`:value.toLocaleString('ja-JP');}
const escape = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colorName = {white:'白文鳥',sakura:'桜文鳥',silver:'シルバー',cinnamon:'シナモン'};
const milestoneName = {welcome:'庭の暮らしが始まった',adopt:'庭に迎えられた',movein:'庭の仲間になった',pair:'つがいになった',egg:'家族の卵が生まれた',hatch:'家族の卵がかえった',grow:'家族が成長した',depart:'新しい庭へ旅立った'};
const homeName = {resident:'この庭の仲間',visitor:'遊びに来た仲間',departed:'別の庭に巣立った仲間'};
const markCurrentTime = w => { const now=Date.now(); if(Number.isSafeInteger(now)&&now>=0&&now<=8640000000000000)w.lastUpdated=Math.max(w.lastUpdated,now); };
const day = tick => `${Math.floor(tick / 24) + 1}日目 ${tick % 24}時`;
const GAME_ART = new URL('../game-art/', import.meta.url).href;
// Reviewed source canvases remain untouched. CSS maps each transparent image to
// one physical contact plane without stretching its native aspect ratio.
export const GAME_SPRITE_ASSETS = Object.freeze({
  white:{width:1157,height:1359,scale:1000/1359,footX:625,footY:1325},
  sakura:{width:1157,height:1359,scale:1000/1359,footX:625,footY:1325},
  cinnamon:{width:1157,height:1359,scale:1000/1359,footX:625,footY:1325},
  silver:{width:1157,height:1359,scale:1000/1359,footX:625,footY:1325},
  juvenile:{width:1312,height:1199,scale:.795,footX:745,footY:1144},
  'juvenile-white':{width:1295,height:1214,scale:.795,footX:745,footY:1165},
  'juvenile-cinnamon':{width:1312,height:1199,scale:.795,footX:745,footY:1150},
  'juvenile-silver':{width:1312,height:1199,scale:.795,footX:745,footY:1145},
  chick:{width:1312,height:1199,scale:.70,footX:680,footY:1125},
  egg:{width:850,height:1000,scale:1,footX:459,footY:975},
});
export function gameSpriteGeometry(color='white',stage='adult',pose='left') {
  const safeColor=Object.hasOwn(colorName,color)?color:'white';
  const safeStage=Object.hasOwn(STAGES,stage)?stage:'adult';
  const posed=poseGeometry(safeColor,safeStage,pose);if(posed)return posed;
  const asset=safeStage==='adult'?safeColor:safeStage==='juvenile'?(safeColor==='sakura'?'juvenile':`juvenile-${safeColor}`):safeStage;
  const source=GAME_SPRITE_ASSETS[asset];
  return {color:safeColor,stage:safeStage,asset,extension:asset==='egg'?'svg':'webp',...source,
    imageWidth:source.width*source.scale/850,
    imageLeft:(850*SPRITE_CONTACT.x-source.footX*source.scale)/850,
    imageTop:(1000*SPRITE_CONTACT.y-source.footY*source.scale)/1000};
}
/** Historical API name retained; the bird is now a photographic image, not fake
 * SVG anatomy. The one native SVG exception is the smooth white egg asset. */
export function gameBirdSvg(color='white',stage='adult',pose='left') {
  const a=gameSpriteGeometry(color,stage,pose);
  if(a.window){const v=a.window,i=a.atlasImage;return `<span class="game-sprite" data-stage="${a.stage}" data-color="${a.color}" data-asset="${a.asset}" data-pose="${a.pose}" data-foot-x="${a.footX}" data-foot-y="${a.footY}" aria-hidden="true"><span class="game-pose-window" style="left:${v.left*100}%;top:${v.top*100}%;width:${v.width*100}%;height:${v.height*100}%;${a.clip?'clip-path:polygon('+a.clip.map(p=>p[0]+'% '+p[1]+'%').join(',')+')':''}"><img src="${GAME_ART}${a.asset}.${a.extension}" alt="" draggable="false" decoding="sync" width="${a.width}" height="${a.height}" style="left:${i.left*100}%;top:${i.top*100}%;width:${i.width*100}%"></span></span>`;}
  return `<span class="game-sprite" data-stage="${a.stage}" data-color="${a.color}" data-asset="${a.asset}" style="--sprite-image-width:${a.imageWidth*100}%;--sprite-image-left:${a.imageLeft*100}%;--sprite-image-top:${a.imageTop*100}%" aria-hidden="true"><img src="${GAME_ART}${a.asset}.${a.extension}" alt="" draggable="false" decoding="sync" width="${a.width}" height="${a.height}"></span>`;
}

export function careFloorOpacity(cleanliness) {
  const value = Number.isFinite(cleanliness) ? Math.max(0, Math.min(100, cleanliness)) : 100;
  return Math.min(.22, Math.max(0, (100 - value) / 100 * .22));
}
export async function mountGame(root, { birdSvg = gameBirdSvg, goArticle = () => {}, goArt = () => {}, audioFactory = createCareAudio } = {}) {
  let sheetOpen=false, sheetReturn=null, ownerCleanup=null, ownerEditor=null, welcomeFocusKey=null;
  let adoptionDialogToken=null,adoptionBusy=false;
  let resetPending=false, resetWorldId=null, resetKind=null, resetStage=0, resetBackupAvailable=false;
  let decorFilter='all', decorTier='cozy';
  let decorSlot='perch', previewItem=null, drawResult=null, fieldPending=false, fieldViewRequest=0;
  let alive=true, store, world, panel='garden', selected='b1', message='', error='', busy=0, lastReply='', replyBird=null, timer, channel, importRequest=0;
  root.innerHTML='<div class="game-loading" role="status">文鳥たちの庭をひらいているよ…</div>';
  // Older false values were the old default, not proof of an explicit mute.
  // Keep the explicit device preference separate from interchangeable world saves.
  let explicitSound=null;
  try { const p=JSON.parse(localStorage.getItem('buncho.care-sound-choice.v1')||'null');if(p?.explicit===true&&typeof p.enabled==='boolean')explicitSound=p.enabled; } catch {}
  try { store=await openGameStore();world=await store.transact(w=>{advanceTo(w);const desired=explicitSound??true;if(w.settings.careSound!==desired){w.settings.careSound=desired;bumpRevision(w);}return w;}); } catch(e){store?.close();if(!root.isConnected)return()=>{};root.innerHTML=`<div role="alert"><h2>保存を開けませんでした</h2><p>${escape(e.message)}</p><p>いまの保存は削除していません。ほかのタブを閉じて、再読み込みしてください。</p></div>`;return()=>{};}
  if(!alive||!root.isConnected){store.close();return()=>{};}
  // Unsaved local text belongs to an immutable bird in one world. A background
  // refresh must not replace it just because the submit button took focus.
  // A peer update may finish between pointerdown and click. Keep the live
  // form/button nodes in place until the user's activation is complete.
  let refreshPending=false, releaseTimer;
  const pressedPointers=new Set();
  const formFocused=()=>{
    const focus=document.activeElement;
    if(!root.contains(focus))return false;
    const field=focus?.closest('form[data-game-form]')?.querySelector('input[data-game-draft-bird]');
    // A completed Save button may retain keyboard focus. Do not freeze the
    // self-running scene after its draft has been committed.
    return !!field&&(focus===field||drafts.get(`${field.dataset.gameDraftWorld}:${field.dataset.gameDraftBird}`)?.[field.id]!==undefined);
  };
  const interactionActive=()=>pressedPointers.size>0||formFocused();
  let birdSwipe=null,suppressSwipeClickUntil=0,familyZoom=1,familyZoomManual=false;
  const pointerStart=ev=>{
    pressedPointers.add(ev.pointerId);
    const surface=ev.target.closest?.('.game-profile,.game-bird-sheet,.game-bird-carousel');
    if(pressedPointers.size!==1){birdSwipe=null;return;}
    if(surface&&!ev.target.closest('button,input,select,textarea,a,summary,label')&&(ev.button===undefined||ev.button===0))birdSwipe={id:ev.pointerId,x:ev.clientX,y:ev.clientY,at:Date.now(),worldId:world.worldId,birdId:selected,surface};
  };
  const pointerEnd=ev=>{
    pressedPointers.delete(ev.pointerId);
    const swipe=birdSwipe;if(swipe?.id===ev.pointerId){birdSwipe=null;const dx=ev.clientX-swipe.x,dy=ev.clientY-swipe.y;if(ev.type!=='pointercancel'&&swipe.surface.isConnected&&swipe.worldId===world.worldId&&swipe.birdId===selected&&Date.now()-swipe.at<1200&&Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.6){suppressSwipeClickUntil=Date.now()+400;switchBird(dx<0?1:-1);}}
    clearTimeout(releaseTimer);
    // Native click/form submission follows pointerup; never replace its target
    // in the pointerup handler itself. Cancellation uses the same safe flush.
    releaseTimer=setTimeout(()=>{if(alive&&refreshPending&&!busy&&!interactionActive())render();},0);
  };
  let encounterRoot=null,encounterController=null,encounterMode=null;
  let relationshipPage=0,relationshipFocusKey='';
  const drafts = new Map(), nameSuggestionOrigins=new Map();
  const draftKey = (birdId = selected) => `${world.worldId}:${birdId}`;
  function rememberDraft(ev) {
    const input = ev.target;
    if (!['game-name','game-words'].includes(input.id) || !root.contains(input)) return;
    const key = draftKey(), current = drafts.get(key) || {};
    current[input.id] = input.value;
    drafts.set(key,current);
  }
  const poseClock=createPoseClock(),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),poseLayout=globalThis.matchMedia?.('(max-width: 600px)'),compactLayout=globalThis.matchMedia?.('(max-height: 500px)');
  const poseEnabled=()=>alive&&root.isConnected&&panel==='garden'&&!document.hidden&&world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!reducedMotion?.matches;
  const holdPoses=()=>{poseClock.hold();if(document.hidden)cancelCareEffects();};
  const poseFor=(bird,positions,birds)=>birdPose(bird,{worldId:world.worldId,elapsed:poseClock.elapsed,positions,birds});
  function updatePoses(force=false){
    poseClock.advance(poseEnabled());if((!force&&!poseEnabled())||!alive||!root.isConnected||panel!=='garden')return;
    const allBirds=fieldBirds(world),birds=compactLayout?.matches?[allBirds.find(b=>b.id===selected)||allBirds[0]].filter(Boolean):allBirds,positions=fieldPositions(birds,globalThis.matchMedia?.('(max-width: 600px)').matches?'tall':'wide',world.field.place);
    refreshPoseSubtrees(root,birds,bird=>poseFor(bird,positions,birds),birdSvg);
  }
  const reframePoses=()=>updatePoses(true);
  const reframeCompact=()=>{if(alive)render();};
  const audio = audioFactory();
  let careGeneration=0, soundRequest=0, soundChoice=null, careFeedback=null, careGesture=null, gestureTimer;
  let pollFlight=null, pendingCareIntent=null;
  const careSoundEnabled = () => soundChoice ?? explicitSound ?? true;
  function cancelCareEffects() { pendingCareIntent=null;careGeneration++;audio.cancel();clearTimeout(gestureTimer);careGesture=null;careFeedback=null;root.querySelectorAll('.game-care-cheer,.game-gem-reward').forEach(node=>node.remove()); }
  const latest = w => {
    if(findBird(world,selected)?.name!==findBird(w,selected)?.name){lastReply='';replyBird=null;}
    if (world.worldId !== w.worldId) { if(!resetPending)closeResetDialog(false);sheetOpen=false;sheetReturn=null;poseClock.reset();drafts.clear();nameSuggestionOrigins.clear();previewItem=null;drawResult=null;lastReply='';replyBird=null;cancelCareEffects();soundRequest++;soundChoice=null; }
    world=w;
    if(adoptionDialogToken&&(adoptionDialogToken.worldId!==w.worldId||w.adoption.pending?.birdId!==adoptionDialogToken.birdId))closeAdoptionDialog(false);
    if(!findBird(world,selected)){cancelCareEffects();selected=world.birds[0].id;}
    audio.setEnabled(careSoundEnabled());
  };
  audio.setEnabled(careSoundEnabled());
  async function mutate(fn, success='', guard=()=>true, {bump=true,advancePaused=true,advanceCurrent=true,renderAfter=true}={}) {
    if(!alive||!guard())return false;
    let committed=false;
    const expectedWorldId=world.worldId;
    busy++;error='';
    try { latest(await store.transact(w=>{if(!guard())return w;if(w.worldId!==expectedWorldId)throw new Error('別のタブで別の庭が読み込まれました。画面の更新を待ってから、もう一度選んでください。');if(advanceCurrent&&(!w.paused||advancePaused))advanceTo(w);const next=fn(w)||w;if(bump)bumpRevision(next);return next;})); committed=true;if(alive&&guard()){if(success)message=success;channel?.postMessage({revision:world.revision});} }
    catch(e){error=e.message||'保存できませんでした。もう一度試してください。';}
    finally{busy--;if(alive&&renderAfter)render();}
    return committed;
  }
  function closeResetDialog(restore=true){
    const dialog=root.querySelector('.game-reset-dialog');if(dialog?.open)dialog.close();resetWorldId=null;
    if(restore&&alive&&root.isConnected)root.querySelector('[data-game-action="reset-state"]')?.focus({preventScroll:true});
  }
  function resetDialogContent(){
    const dialog=root.querySelector('.game-reset-dialog');if(!dialog)return;
    const cancel='<button data-game-action="reset-cancel" autofocus>やめる</button>';
    const copy={care:['状態をリセットしますか？家族・Gem・家具などは残ります。','戻すもの：おなか・元気は80、気分70・遊び60まで回復し、庭をきれいにします。既に高い値は下げません。','残るもの：家族・名前・卵・成長・関係・日記・Gem・家具・図鑑・お世話時刻・音の設定。'],furniture:['家具の配置だけ初期化しますか？','戻すもの：9種類の道具を最初の持ち物に付け替えます。','残るもの：所有家具・Gem・家族・状態・日記・図鑑・設定。'],all:['おもち1羽から、最初から始めますか？','消えるもの：今の家族・名前・卵・成長・関係・日記・Gem・所有家具・配置・図鑑・進行。',`残るもの：サイトの観察ノート・音楽と音量・音と動きの設定。直前の庭は、${store.mode==='memory'?'この画面を閉じるまで':'このブラウザに'}1件バックアップします。`],restore:['リセット直前の庭に戻しますか？','今の庭を、保存された直前の家族・Gem・家具・進行に戻します。','サイトの観察ノート・音楽設定は変えません。']}[resetKind];
    if(!copy){dialog.innerHTML=`<h3 id="game-reset-title">何をリセットする？</h3><div class="game-reset-options"><button data-reset-kind="care">お世話の状態だけ回復</button><button data-reset-kind="furniture">家具の配置だけ初期化</button><button class="game-reset-danger" data-reset-kind="all">おもち1羽から、最初から</button><button data-reset-kind="restore" ${resetBackupAvailable?'':'disabled'}>直前の庭を復元</button></div>`+cancel;}
    else{dialog.innerHTML=`<h3 id="game-reset-title">${resetKind==='all'&&resetStage===2?'最後の確認：今の家族と進行をリセットします。':copy[0]}</h3><p>${copy[1]}</p><p>${copy[2]}</p>${resetKind==='all'&&resetStage===2?'<p>おもち1羽の新しい庭になります。続けますか？</p>':''}${cancel}<button data-game-action="reset-back">選び直す</button><button data-game-action="reset-confirm">${resetKind==='all'?(resetStage===2?'確認して、最初から始める':'内容を確認して次へ'):resetKind==='restore'?'直前の庭に戻す':'リセットする'}</button>`;}
    dialog.querySelector('[data-game-action="reset-cancel"]').focus({preventScroll:true});
  }
  function openResetDialog(){
    if(resetPending)return;let dialog=root.querySelector('.game-reset-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.className='game-reset-dialog';dialog.setAttribute('aria-labelledby','game-reset-title');root.querySelector('.game-app').append(dialog);}
    resetWorldId=world.worldId;resetKind=null;resetStage=0;resetBackupAvailable=false;resetDialogContent();dialog.showModal();dialog.querySelector('[autofocus]').focus({preventScroll:true});const expected=resetWorldId;store.hasResetBackup().then(available=>{if(!alive||resetWorldId!==expected||!dialog.open)return;resetBackupAvailable=available;const button=dialog.querySelector('[data-reset-kind=restore]');if(button)button.disabled=!available;}).catch(()=>{});
  }
  async function confirmStateReset(){
    const dialog=root.querySelector('.game-reset-dialog');if(!dialog?.open||resetPending||!resetKind||resetWorldId!==world.worldId)return;
    if(resetKind==='all'&&resetStage<2){resetStage=2;resetDialogContent();return;}
    const expected=resetWorldId,kind=resetKind;resetPending=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);cancelCareEffects();
    if(kind==='all'||kind==='restore'){
      busy++;error='';try{const next=await (kind==='all'?store.resetWorld(expected):store.restoreResetBackup(expected));if(alive){latest(next);selected=world.birds[0].id;panel='settings';message=kind==='all'?'おもちとの新しい暮らしが始まったよ。':'直前の庭に戻ったよ。';channel?.postMessage({revision:world.revision});}}catch(e){if(alive)error=e.message||'保存できませんでした。今の庭はそのままです。';}finally{busy--;if(alive)render();}
    }else await mutate(w=>{if(w.worldId!==expected)throw new Error('庭が変わりました。もう一度確認してください。');(kind==='care'?resetTemporaryState:resetFurniturePlacement)(w);return w;},kind==='care'?'みんなの調子を整えたよ。':'最初の道具を飾ったよ。',()=>alive&&root.isConnected,{bump:false,advanceCurrent:false});
    resetPending=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);closeResetDialog();
  }
  function adoptionInvitation(){const request=world.adoption.pending,b=request&&findBird(world,request.birdId);return b?`<button class="game-adoption-invitation" data-adoption-open>${escape(b.name)}から相談 ♡</button>`:'';}
  function dismissDrawResult(){
    drawResult=null;
    const dialog=root.querySelector('.game-draw-result');
    if(dialog?.open)dialog.close();
    dialog?.remove();
    (root.querySelector('[data-decor-draw]:not(:disabled)')||root.querySelector('[data-decor-slot][aria-pressed=true]'))?.focus({preventScroll:true});
  }
  function syncDrawResult(){
    let dialog=root.querySelector('.game-draw-result');
    if(!drawResult||panel!=='decorate'){
      if(dialog?.open)dialog.close();
      dialog?.remove();
      return;
    }
    if(dialog)return;
    dialog=document.createElement('dialog');
    dialog.className='game-draw-result';
    dialog.setAttribute('aria-labelledby','game-draw-result-title');
    dialog.innerHTML=`<strong id="game-draw-result-title">${drawResult.duplicate?'もう持っている色でした':'新しいお飾り！'}</strong><p>${escape(itemName(drawResult.item))}</p><p>${escape(drawResult.message)}</p><button type="button" data-draw-result-close autofocus>閉じる</button>`;
    root.querySelector('.game-app').append(dialog);
    dialog.showModal();
    dialog.querySelector('button').focus({preventScroll:true});
  }
  function closeAdoptionDialog(restore=true){const dialog=root.querySelector('.game-adoption-dialog');if(dialog?.open)dialog.close();adoptionDialogToken=null;if(restore)root.querySelector('[data-adoption-open]')?.focus({preventScroll:true});}
  function openAdoptionDialog(){
    const request=world.adoption.pending,b=request&&findBird(world,request.birdId);if(!b||adoptionBusy)return;
    let dialog=root.querySelector('.game-adoption-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.className='game-adoption-dialog';dialog.setAttribute('aria-labelledby','game-adoption-title');root.querySelector('.game-app').append(dialog);}
    adoptionDialogToken={...economyToken(world),birdId:b.id};dialog.innerHTML=`<h2 id="game-adoption-title">${escape(b.name)}と暮らす？</h2>${smallBird(b)}<p>このおうちの仲間に迎えます。今は友達のままでも、また遊びに来てくれるよ。</p><button data-adoption-cancel autofocus>あとで決める</button><button data-adoption-decision="later">また遊ぼう</button><button data-adoption-decision="accept">いっしょに暮らす</button><p data-adoption-notice role="status"></p>`;dialog.showModal();dialog.querySelector('[autofocus]').focus({preventScroll:true});
  }
  async function adoptionDecision(button){
    if(adoptionBusy||!adoptionDialogToken||button.disabled)return;const token={...adoptionDialogToken},dialog=root.querySelector('.game-adoption-dialog');adoptionBusy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);let result;
    try{const committed=await mutate(w=>{result=resolveAdoption(w,token.birdId,button.dataset.adoptionDecision,token);},'',()=>alive,{bump:false,advanceCurrent:false});if(committed){message=result?.message||'';closeAdoptionDialog(false);render();root.querySelector('[data-game-open-menu]')?.focus({preventScroll:true});}else if(dialog.open)dialog.querySelector('[data-adoption-notice]').textContent=error;}
    finally{adoptionBusy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function chosen(){return findBird(world,selected)||world.birds[0];}
  const smallBird = b => `<span class="game-mini-bird">${birdSvg(b.color,b.stage,birdPose(b,{worldId:world.worldId,elapsed:0}))}</span>`;
  function birdButton(b, extra=''){return `<button class="game-bird-link" data-game-select="${b.id}">${smallBird(b)}<span>${escape(b.name)}<small>${colorName[b.color]} · ${STAGES[b.stage]} · ${homeName[b.home]}</small></span>${extra}</button>`;}
  function soundControl() {
    return `<label class="game-check game-care-sound"><input type="checkbox" data-game-care-sound ${careSoundEnabled()?'checked':''}> ふれあいの音</label>`;
  }
  function careMessage(feedback){if(feedback.kind==='clean')return feedback.changed?'ぴかぴかになったよ。':'もうきれいだよ。';if(feedback.reason==='cooldown')return `${feedback.kind==='feed'?'さっき食べたところ。':'ひとやすみ。'}${world.paused?'再開すると、また遊べます。':'もう少ししたら、またね。'}`;if(feedback.reason==='full')return feedback.kind==='feed'?'いまは、おなかいっぱい。':'いまは、元気いっぱい。';return feedback.kind==='feed'?'もぐもぐ♪ ごちそうさま。':'ぴっ♪ うれしそう。';}
  function nextCareLabel(){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(careWindow(world.careSchedule.seenAt).nextAt));}
  function canTalk(b){return b.home!=='departed'&&['juvenile','adult'].includes(b.stage)&&b.needs.energy<100;}
  function careControls(b) {
    const eligible=b.home!=='departed'&&['juvenile','adult'].includes(b.stage);
    const explanation=b.home==='departed'?'別の庭に巣立った仲間です。思い出を見守ろう。':['egg','chick'].includes(b.stage)?'巣で育つ時間。お世話は親にまかせよう。':'';
    return `<section class="game-care" aria-label="${escape(b.name)}のお世話"><div class="game-fullness"><div class="game-care-meter"><div class="game-care-meter-heading"><span>おなか</span><output data-game-fullness>${Math.round(getFullness(world,b.id))} / 100</output></div><meter aria-label="おなか" min="0" max="100" value="${Math.round(getFullness(world,b.id))}">${Math.round(getFullness(world,b.id))} / 100</meter></div><div class="game-care-meter game-care-meter-energy"><div class="game-care-meter-heading"><span>元気</span><output data-game-energy>${Math.round(b.needs.energy)} / 100</output></div><meter aria-label="元気" min="0" max="100" value="${Math.round(b.needs.energy)}">${Math.round(b.needs.energy)} / 100</meter></div></div>${eligible&& (b.needs.food>=100||b.needs.energy>=100)?`<p class="game-small" data-next-care>次のお世話 ${nextCareLabel()}（日本時間）</p>`:''}<div class="game-care-actions"><button id="game-care-feed" type="button" data-game-care="feed" data-care-bird-id="${b.id}" ${eligible&&b.needs.food<100?'':'disabled'}>ごはん</button><button id="game-care-pet" type="button" data-game-care="pet" data-care-bird-id="${b.id}" ${canTalk(b)?'':'disabled'}>なでる</button><button id="game-talk-call" type="button" data-game-talk="名前を呼ぶ" ${canTalk(b)?'':'disabled'}>名前を呼ぶ</button></div>${explanation?`<p id="game-care-explanation" class="game-small">${explanation}</p>`:''}${careFeedback&&careFeedback.birdId===b.id?`<p class="game-care-feedback" role="status">${escape(careMessage(careFeedback))}</p>`:''}</section>`;
  }
  function gardenCare() {
    const cleanliness=getCleanliness(world);
    return `<div class="game-garden-care" aria-label="お部屋のおそうじ"><button type="button" data-game-care="clean">そうじ</button><meter aria-label="床のきれいさ" min="0" max="100" value="${cleanliness}" data-game-cleanliness>${cleanliness}</meter><output data-game-cleanliness-value>${cleanliness} / 100</output>${careFeedback?.kind==='clean'?`<span class="game-care-feedback" role="status">${escape(careMessage(careFeedback))}</span>`:''}</div>`;
  }
  function talkControls(b){return `<div class="game-talk"><div class="game-talk-choices">${['あそぼう','水浴びしよう','ともだちは？','おやすみ'].map((t,i)=>`<button id="game-talk-${i}" data-game-talk="${t}" ${canTalk(b)?'':'disabled'}>${t}</button>`).join('')}</div><form data-game-form="talk"><label class="game-sr-only" for="game-words">じゆうに話しかける</label><div class="game-input-row"><input id="game-words" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="words" maxlength="100" required ${canTalk(b)?'':'disabled'} placeholder="ことばをかける…"><button id="game-talk-send" ${canTalk(b)?'':'disabled'}>話す</button></div></form></div>`;}
  function switchableBirds(){return panel==='garden'?fieldBirds(world):world.birds.filter(b=>b.home!=='departed'||b.id===selected);}
  function birdSwitchControls(){const birds=switchableBirds(),index=birds.findIndex(b=>b.id===selected);return `<nav class="game-bird-switch" aria-label="文鳥を切り替える"><button type="button" data-bird-step="-1" aria-label="前の文鳥" ${birds.length<2?'disabled':''}>‹</button><span>${index+1} / ${birds.length}</span><button type="button" data-bird-step="1" aria-label="次の文鳥" ${birds.length<2?'disabled':''}>›</button></nav>`;}
  function switchBird(direction){const birds=switchableBirds();if(birds.length<2)return;const i=birds.findIndex(b=>b.id===selected);cancelCareEffects();fieldViewRequest++;selected=birds[(i+direction+birds.length)%birds.length].id;lastReply='';replyBird=null;message='';error='';render();const heading=root.querySelector(sheetOpen?'#game-sheet-title':panel==='garden'?'.game-bird-carousel-face':'.game-profile h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  function birdSheet(){
    const b=chosen();
    return `<header class="game-sheet-heading"><div>${smallBird(b)}<div><h2 id="game-sheet-title">${escape(b.name)}</h2><p>${STAGES[b.stage]} · ${ACTIONS[b.action.kind]}</p></div></div><button id="game-sheet-close" type="button" data-game-close-bird aria-label="文鳥の操作を閉じる">閉じる</button></header>${birdSwitchControls()}${careGesture?.birdId===b.id?`<span class="game-sheet-cheer" aria-hidden="true">${careGesture.kind==='feed'?'もぐもぐ':'♪'}</span>`:''}${careControls(b)}${lastReply&&replyBird===b.id?`<p class="game-reply" role="status">${escape(lastReply)}</p>`:''}<details class="game-sheet-talk" data-game-details="sheet-talk"><summary>もっと話す</summary>${talkControls(b)}</details><footer class="game-sheet-footer"><button data-game-panel="settings">音・暮らしの設定</button><button type="button" data-game-panel="profile">${b.home==='visitor'?'名前・お迎え':'紹介・名前'}</button></footer>${error?`<p class="game-warning" role="alert">${escape(error)}</p>`:message?`<p class="game-sheet-message" role="status">${escape(message)}</p>`:''}`;
  }
  function openBirdSheet(birdId){fieldViewRequest++;cancelCareEffects();selected=birdId;sheetOpen=true;sheetReturn={birdId,worldId:world.worldId};lastReply='';message='';render();}
  function closeBirdSheet(restore=true){
    const back=sheetReturn;sheetOpen=false;cancelCareEffects();root.querySelector('.game-panel-overlay')?.close();root.querySelector('.game-bird-sheet')?.close();
    render();if(restore&&back?.worldId===world.worldId){
      const generation=careGeneration,view=fieldViewRequest;
      const focusBack=(deferred=false)=>{if(!alive||sheetOpen||generation!==careGeneration||view!==fieldViewRequest||back.worldId!==world.worldId)return;const active=document.activeElement;if(deferred&&active?.isConnected&&active!==document.body&&active!==document.documentElement&&!active.closest('.game-bird-sheet'))return;const target=root.querySelector(`[data-garden-household="${back.birdId}"]`)||root.querySelector('.game-panel-overlay[open] [data-game-open-bird]')||root.querySelector(`[data-game-scene-select][data-bird-id="${back.birdId}"]`)||root.querySelector('#game-open-bird');target?.focus({preventScroll:true});};
      focusBack();root.ownerDocument.defaultView.requestAnimationFrame(()=>focusBack(true));
    }
  }
  function sheetCancel(ev){if(ev.target.matches('.game-draw-result')){ev.preventDefault();dismissDrawResult();return;}if(ev.target.matches('.game-adoption-dialog')){ev.preventDefault();if(!adoptionBusy)closeAdoptionDialog();return;}if(ev.target.matches('.game-panel-overlay')){ev.preventDefault();closePanel();return;}if(ev.target.matches('.game-reset-dialog')){ev.preventDefault();if(!resetPending)closeResetDialog();return;}if(ev.target.matches('.game-bird-sheet')){ev.preventDefault();closeBirdSheet();}}
  async function closePanel(){fieldViewRequest++;if(['outdoors','notebook'].includes(panel)&&world.encounters.garden.open){const expected={worldId:world.worldId,revision:world.revision};await mutate(w=>{encounterSystem.leaveGarden(w,expected);},'',()=>alive,{bump:false,advanceCurrent:false});}sheetOpen=false;cancelCareEffects();if(panel==='owner'){panel='settings';render();focusPanel();return;}panel='garden';render();root.querySelector('[data-game-open-menu]')?.focus({preventScroll:true});}
  function focusPanel(){const surface=root.querySelector('.game-panel-overlay[open] .game-panel')||root.querySelector('.game-panel');const heading=surface?.querySelector('h3')||surface;if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  const itemColor=item=>DECOR_COLORS.find(c=>c.id===item?.color)||DECOR_COLORS[0];
  const itemTier=item=>DECOR_TIERS.find(t=>t.id===item?.tier)||DECOR_TIERS[0];
  const itemArt=item=>furnitureSvg(item.slot,itemColor(item).hex,DECOR_TIERS.findIndex(t=>t.id===item.tier)+1);
  const itemName=item=>`${itemColor(item).label}の${furnitureFormName(item.slot,itemColor(item).hex)}・${itemTier(item).label}`;
  function fieldTitle(){return world.field.place==='park'?'みんなの文鳥公園':world.field.place==='friend'?`${birdName(world,world.field.hostId)}のお部屋`:'おもちたちの籠のおうち';}
  function fieldControls(){return `<nav class="game-field-nav" aria-label="文鳥のおでかけ"><button data-field-travel="home" data-game-panel="garden" aria-label="籠のおうちへ" aria-pressed="${panel==='garden'&&world.field.place==='home'}">おうち</button><button data-game-panel="outdoors" aria-label="庭へ遊びに行く" aria-pressed="${panel==='outdoors'}">庭へ</button><button data-game-panel="friends" aria-label="友達のお部屋へ" aria-pressed="${panel==='friends'||panel==='garden'&&world.field.place==='friend'}">友達</button></nav><div class="game-play-actions"><button data-game-panel="decorate" aria-label="お部屋を飾る" aria-pressed="${panel==='decorate'}"><span aria-hidden="true">✧</span> お飾りのアトリエ</button></div>`;}
  function secondaryMenu(){
    const items=[['profile','文鳥の紹介','M7 20c-4-10 9-16 15-9l5 2-5 3c0 10-11 12-15 4zM6 19l-4 5 7-2'],['relations','関係図','M8 10a4 4 0 1 0 0 .1M24 10a4 4 0 1 0 0 .1M8 24a4 4 0 1 0 0 .1M12 10h8M8 14v6M12 24l9-11'],['family','家系図','M8 7h16v7H8zM16 14v7M6 21h20M6 21v7M16 21v7M26 21v7'],['diary','日記','M7 4h20v24H7zM7 8H4M7 16H4M7 24H4M12 10h10M12 16h10M12 22h7'],['roster','名簿','M8 8a4 4 0 1 0 0 .1M3 25v-4c0-6 10-6 10 0v4M19 8h10M19 15h10M19 22h10'],['notebook','出会い図鑑','M16 8C10 3 4 5 3 6v21c4-2 9-2 13 1 4-3 9-3 13-1V6c-5-2-9-1-13 2v20'],['settings','保存・設定','M5 8h22M5 16h22M5 24h22M11 4v8M22 12v8M14 20v8'],['help','あそびかた','M16 29a13 13 0 1 0 0-26 13 13 0 0 0 0 26M12 11c0-6 10-6 10 0 0 4-6 4-6 8M16 23v1']];
    return `<details class="game-secondary-menu" data-game-details="navigation"><summary id="game-nav-summary">文鳥のこと・家族・記録</summary><div class="game-menu-heading"><strong>暮らしのメニュー</strong><button class="game-menu-close" data-game-close-menu aria-label="メニューを閉じる">×</button></div><nav class="game-tabs" aria-label="文鳥ぐらしのメニュー">${items.map(([id,label,path])=>`<button id="game-menu-${id}" data-game-panel="${id}" aria-pressed="${panel===id}"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg><span>${label}</span></button>`).join('')}</nav></details>`;
  }
  function welcomeCard(){
    const summary=world.offlineSummary;if(!summary||panel!=='garden')return '';
    const elapsed=summary.ticks<24?`${summary.ticks}時間`:`${Math.floor(summary.ticks/24)}日${summary.ticks%24?`と${summary.ticks%24}時間`:''}`;
    return `<section class="game-welcome" role="dialog" aria-modal="false" aria-labelledby="game-welcome-title"><strong id="game-welcome-title">おかえりなさい</strong><p>${summary.ticks?`留守のあいだに、庭の時間が${elapsed}進んだよ。`:'文鳥たちの様子を見てみよう。'}</p>${summary.newBirds?`<p>${summary.newBirds}羽との出会いがあったよ。</p>`:''}${summary.skipped?'<p>長いお休みのぶんは、ゆっくり待っていたよ。</p>':''}<button id="game-welcome-close" data-game-action="dismiss-welcome" aria-label="おかえりメッセージを閉じる">閉じる</button></section>`;
  }
  async function dismissWelcome(){const expected=world.worldId;const committed=await mutate(w=>{w.offlineSummary=null;},'',()=>world.worldId===expected);if(committed&&alive&&world.worldId===expected)(root.querySelector('button.game-room-bird.is-selected')||document.querySelector('.game-scene-controls-toggle'))?.focus({preventScroll:true});}

  function wallet(){return `<div class="game-wallet"><strong role="group" data-decor-points data-full-amount="${world.decor.points}" title="${world.decor.points.toLocaleString('ja-JP')} Gems" aria-label="${world.decor.points.toLocaleString('ja-JP')} Gems">${formatGameAmount(world.decor.points)}<small> Gems</small></strong><strong role="group" data-gold-balance data-full-amount="${world.economy.gold}" title="${world.economy.gold.toLocaleString('ja-JP')} Gold" aria-label="${world.economy.gold.toLocaleString('ja-JP')} Gold">${formatGameAmount(world.economy.gold)}<small> Gold</small></strong><span>Lv.${decorLevel(world)}</span></div>`;}
  function fieldNavigation(){
    const level=decorLevel(world);
    return `<div class="game-field-bar"><div><p class="game-eyebrow">${world.field.place==='park'?'BUNCHO PARK':'LITTLE HOME'}</p><h3 title="${escape(fieldTitle())}">${escape(fieldTitle())}</h3></div>${wallet()}</div>${fieldControls()}`;
  }
  function sceneFurniture(override=null,ownRoom=false){
    return `<div class="game-furnishings" aria-hidden="true">${DECOR_SLOTS.map(slot=>{
      const own=world.decor.inventory.find(i=>i.id===world.decor.equipped[slot.id]);
      const item=override?.slot===slot.id?override:world.field.place==='friend'&&!ownRoom?friendFurnishing(findBird(world,world.field.hostId),slot.id,DECOR_COLORS,DECOR_TIERS):own;
      return `<span class="game-furnishing furnishing-${slot.id}" data-equipped-slot="${slot.id}" data-equipped-item="${item.id}" data-furniture-form="${furnitureFormIndex(itemColor(item).hex)}">${furnitureSceneSvg(slot.id,itemColor(item).hex,DECOR_TIERS.findIndex(t=>t.id===item.tier)+1)}</span>`;
    }).join('')}</div>`;
  }
  function friendRooms(){
    const friends=world.birds.filter(b=>b.home!=='resident'&&b.stage==='adult');
    const metFriends=world.birds.length>1||world.events.some(e=>['visit','revisit','adopt','movein'].includes(e.kind));
    return `<section class="game-friends"><div class="game-section-title"><div><p class="game-eyebrow">A LITTLE VISIT</p><h3>友達のおうち</h3></div></div><div class="game-friend-carousel-controls"><button data-friend-step="-1" aria-label="前の友達">‹</button><span>友達のおうちをめくる</span><button data-friend-step="1" aria-label="次の友達">›</button></div><div class="game-friend-houses" tabindex="0" aria-label="友達のおうち。横にスワイプして選ぶ">${friends.map(b=>`<article class="game-friend-house" data-friend-card="${b.id}"><div class="game-house-portrait">${smallBird(b)}</div><h4>${escape(b.name)}のお部屋</h4><p>${b.sex==='male'?'オス':'メス'} · ${colorName[b.color]}<br>${b.home==='visitor'?'いま、こちらの籠に遊びに来ています':'また会える、なじみのお友達'}</p><div><button data-field-travel="friend" data-field-host="${b.id}">会いに行く</button><button data-field-invite="${b.id}" ${b.home==='visitor'?'disabled':''}>籠に招く</button></div></article>`).join('')||`<div class="game-empty-home"><h4>${metFriends?'いま訪ねられる友達はいません':'友達が来るのを待とう'}</h4><p>${metFriends?'仲間たちは、このおうちで暮らしています。':'時間を動かすと、友達が訪ねてきます。'}</p><button data-game-panel="outdoors">庭へ</button><button data-field-travel="home">おうちへ</button></div>`}</div></section>`;
  }
  function decorationRoom(){
    const slot=DECOR_SLOTS.find(s=>s.id===decorSlot)||DECOR_SLOTS[0],owned=world.decor.inventory.filter(i=>i.slot===slot.id);
    const collection=DECOR_TIERS.flatMap(tier=>DECOR_COLORS.map(color=>({id:`${slot.id}-${color.id}-${tier.id}`,slot:slot.id,color:color.id,tier:tier.id})));
    const preview=collection.find(i=>i.id===previewItem)||world.decor.inventory.find(i=>i.id===world.decor.equipped[slot.id]);
    const previewOwned=owned.some(i=>i.id===preview.id),previewUnlocked=decorLevel(world)>=itemTier(preview).level,shopItem=ordinaryFurnitureCatalog(world).find(i=>i.id===preview.id);
    const canDraw=!fieldPending&&world.decor.points>=DECOR_DRAW_COST&&world.decor.lastDrawTick!==world.tick;
    return `<section class="game-decoration"><div class="game-section-title"><div><p class="game-eyebrow">MAKE ROOM FOR JOY</p><h3>小さな籠に、好きな色を。</h3></div></div><div class="game-decor-intro"><p>お飾りを選ぼう</p>${wallet()}</div><div class="game-decor-slots" aria-label="9種類のお飾り">${DECOR_SLOTS.map(s=>`<button data-decor-slot="${s.id}" aria-pressed="${s.id===slot.id}">${furnitureSvg(s.id,'#b5c8ad')}<span>${s.label}</span></button>`).join('')}</div><div class="game-decor-workbench"><div class="game-decor-preview" data-preview-item="${preview.id}"><div class="game-room-preview"><picture><source media="(max-width:600px)" srcset="${GAME_ART}field-home-tall.webp"><img src="${GAME_ART}field-home-wide.webp" alt="道具を試しに置いたおうち" width="1600" height="1000"></picture>${sceneFurniture(preview,true)}</div><div class="game-item-art">${itemArt(preview)}</div><p>${escape(itemName(preview))}</p><small>${world.decor.equipped[slot.id]===preview.id?'使用中':previewOwned?'試着中':previewUnlocked?'いつか、おうちに':'Lv.'+itemTier(preview).level+'で出会える'}</small>${!previewOwned&&shopItem?`<button data-gold-buy="${preview.id}" data-economy-world="${escape(world.worldId)}" data-economy-revision="${world.revision}" ${world.economy.gold<shopItem.gold||economyPending?'disabled':''}>選んで迎える · ${shopItem.gold} Gold</button>`:''}${previewOwned&&world.decor.equipped[slot.id]!==preview.id?`<div><button data-decor-equip="${preview.id}">これでOK</button><button data-decor-cancel>やめる</button></div>`:''}</div><div class="game-decor-draw"><h4>${slot.label}のお飾りガチャ</h4><button class="game-draw-button" data-decor-draw="${slot.id}" ${canDraw?'':'disabled'}>ひとつ開ける · ${DECOR_DRAW_COST} Gems</button><p class="game-small">${world.decor.lastDrawTick===world.tick?(world.paused?'再開すると、また開けられます。':'次の時間にもう一度。'):world.decor.points<DECOR_DRAW_COST?'文鳥とふれあって、Gemsを集めよう。':'同じお飾りが出たら8 Gemsを返します。'}</p><details data-game-details="draw-odds"><summary>確率・Gemsのしくみ</summary><p>Gemsだけで遊べます。お金・広告・購入はありません。同じお飾りは8 Gems返却。</p><p>色は8色それぞれ12.5%。仕上げは ${decorOdds(world).map(o=>`${DECOR_TIERS.find(t=>t.id===o.tierId).label} ${Math.round(o.probability*100)}%`).join(' / ')}。色と仕上げは別々に抽選します。</p><p>Lv.1 ほっこり / Lv.3 とっておき / Lv.6 きらめき。みんなの交流・家族の節目からは贈り物が届きます。自動の贈り物は日本時間で平日30、土日祝40 Gemsまで。タップで受け取り、最大40 Gemsを期限なく置いておけます。獲得合計80 Gemsごとにレベルアップ。ごはん6 Gems、なでる5 Gems、お話5 Gems。成功したお世話は4 Goldも貯まります。ふつうのお飾りは16 Goldで選べます。お世話は日本時間7時・17時・20時、土日祝は12時にも。おなか・元気がいっぱいになるまで遊べます。おなかいっぱいの後の落としものは、拾うと8 Gems。</p></details></div></div><div class="game-decor-filter" aria-label="所持品の表示"><button data-decor-filter="owned" aria-pressed="${decorFilter==='owned'}">持っている</button><button data-decor-filter="all" aria-pressed="${decorFilter==='all'}">すべて・24種類</button></div><div class="game-decor-tiers" aria-label="道具の仕上げ">${DECOR_TIERS.map(t=>`<button data-decor-tier="${t.id}" aria-pressed="${decorTier===t.id}">${t.label}<small>Lv.${t.level}</small></button>`).join('')}</div><h4 class="game-collection-heading">${slot.label}のコレクション <small>${owned.length} / 24</small></h4><div class="game-collection">${DECOR_TIERS.map(tier=>`<section class="game-collection-tier" ${tier.id===decorTier?'':'hidden'}><h5>${tier.label}<span>${decorLevel(world)>=tier.level?'出会えるお飾り':'Lv.'+tier.level+'のお楽しみ'}</span></h5><div class="game-owned-items">${collection.filter(item=>item.tier===tier.id).map(item=>{const has=owned.some(i=>i.id===item.id),locked=decorLevel(world)<tier.level;return `<button ${decorFilter==='owned'&&!has?'hidden':''} data-decor-preview="${item.id}" data-owned="${has}" data-locked="${locked}" aria-label="${itemName(item)}、${has?'持っている':locked?'Lv.'+tier.level+'で解放':'まだ持っていない'}" aria-pressed="${item.id===preview.id}">${itemArt(item)}<span>${escape(furnitureFormName(item.slot,itemColor(item).hex))}<small>${itemColor(item).label}</small><small>${world.decor.equipped[slot.id]===item.id?'使用中':has?'持っている':locked?'Lv.'+tier.level:'未入手'}</small></span></button>`;}).join('')}</div></section>`).join('')}</div></section>`;
  }
  async function fieldAction(button){
    if(fieldPending||button.disabled)return;
    fieldPending=true;button.disabled=true;
    const expectedWorld=world.worldId,request=++fieldViewRequest;
    let feedback;
    try{
      const committed=await mutate(w=>{
        if(button.hasAttribute('data-field-travel')){if(w.encounters.garden.open)encounterSystem.leaveGarden(w,{worldId:w.worldId,revision:w.revision});feedback=travelTo(w,button.dataset.fieldTravel,button.dataset.fieldHost||null);}
        else if(button.dataset.fieldInvite)feedback=inviteFriend(w,button.dataset.fieldInvite);
        else if(button.dataset.decorDraw)feedback=drawDecoration(w,button.dataset.decorDraw);
        else feedback=equipDecoration(w,button.dataset.decorEquip);
      },'',()=>alive&&world.worldId===expectedWorld,{bump:false});
      if(committed&&feedback&&request===fieldViewRequest){message=button.hasAttribute('data-field-travel')?'':feedback.message;if(button.hasAttribute('data-field-travel')){cancelCareEffects();panel='garden';previewItem=null;drawResult=null;}if(button.dataset.decorDraw&&feedback.changed){drawResult=feedback;decorTier=feedback.item?.tier||decorTier;previewItem=feedback.item.id;}if(button.dataset.decorEquip)previewItem=null;}
    }finally{fieldPending=false;if(alive){render();if(button.hasAttribute('data-field-travel')&&request===fieldViewRequest)focusPanel();}}
  }

  let economyPending=false;
  function automaticGift(){const gift=world.economy.pending;return gift?`<button class="game-auto-gift" data-auto-gift="${escape(gift.id)}" data-economy-world="${escape(world.worldId)}" data-economy-revision="${world.revision}" aria-label="みんなからの贈り物 ${gift.amount} Gemsを受け取る">🎁 <span>${gift.amount} Gems</span></button>`:'';}
  async function economyAction(button){
    if(economyPending||button.disabled)return;economyPending=true;button.disabled=true;
    const token={worldId:button.dataset.economyWorld,revision:Number(button.dataset.economyRevision)};let result;
    try{const committed=await mutate(w=>{result=button.dataset.autoGift?claimAutomaticGift(w,button.dataset.autoGift,token):buyOrdinaryFurniture(w,button.dataset.goldBuy,token);},'',()=>alive,{bump:false,advanceCurrent:false});
      if(committed&&result){message=result.message||'';render();showGemReward(result.gemAward);if(result.changed)root.querySelector(button.dataset.autoGift?'[data-game-open-menu]':'[data-decor-preview="'+button.dataset.goldBuy+'"]')?.focus({preventScroll:true});}
    }finally{economyPending=false;if(alive)render();}
  }
  function gemCollectibles(){
    if(world.field.place!=='home')return '';
    const g=roomGeometry((root.ownerDocument.defaultView.innerWidth||390)<=600?'tall':'wide');
    return `<div class="game-droppings" aria-label="落としものを拾う">${(world.gems?.droppings||[]).map((drop,i)=>`<button type="button" data-gem-collect="${drop.id}" data-gem-revision="${world.revision}" data-gem-world="${escape(world.worldId)}" class="game-dropping" style="--drop-x:${(g.left+g.width*(.17+(i%6)*.13))/g.planeWidth*100}%;--drop-y:${(g.height-104-(1-Math.floor(i/6))*48-g.top)/g.planeHeight*100}%" aria-label="${escape(birdName(world,drop.birdId))}の落としものを拾う・8 Gems"><span class="game-dropping-art" aria-hidden="true"></span><span class="game-dropping-spark" aria-hidden="true">✧</span></button>`).join('')}</div>`;
  }
  function showGemReward(amount,origin,gold=0){
    if((!amount&&!gold)||!alive)return;
    const host=sheetOpen?root.querySelector('.game-bird-sheet'):(root.querySelector('.game-panel-overlay[open]')||root.querySelector('.game-app'));
    if(!host)return;
    const reward=root.ownerDocument.createElement('span');reward.className='game-gem-reward';reward.setAttribute('role','status');reward.textContent=[amount?`✦ +${amount} Gems`:null,gold?`● +${gold} Gold`:null].filter(Boolean).join(" · ");
    const box=host.getBoundingClientRect();if(origin&&!sheetOpen){reward.style.left=`${Math.max(65,Math.min(box.width-65,origin.x-box.left))}px`;reward.style.top=`${Math.max(20,origin.y-box.top)}px`;}
    host.append(reward);setTimeout(()=>reward.remove(),1400);
  }
  async function collectGem(button){
    if(button.disabled)return;button.disabled=true;
    const expectedWorld=button.dataset.gemWorld,revision=Number(button.dataset.gemRevision),view=fieldViewRequest,rect=button.getBoundingClientRect();let feedback;
    const committed=await mutate(w=>{feedback=collectDropping(w,button.dataset.gemCollect,revision);},'',()=>alive&&world.worldId===expectedWorld,{bump:false,advanceCurrent:false});
    if(committed&&feedback?.changed&&view===fieldViewRequest&&world.field.place==='home'){
      showGemReward(feedback.gemAward,{x:rect.left+rect.width/2,y:rect.top});
      (root.querySelector('[data-gem-collect]')||root.querySelector('[data-game-care=clean]')||root.querySelector('#game-open-bird'))?.focus({preventScroll:true});
    }
  }
  function bottomDock(){
    const icon=path=>`<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return `<nav class="game-bottom-dock" aria-label="庭のあそび"><button data-game-panel="decorate" aria-pressed="${panel==='decorate'}">${icon('<path d="M5 12h22v15H5zM3 12l13-8 13 8M11 27v-9h10v9"/>')}<span>お飾り</span></button><button id="game-open-bird" data-game-open-bird>${icon('<path d="M7 20c-4-10 9-16 15-9l5 2-5 3c0 10-11 12-15 4zM6 19l-4 5 7-2M14 26v3m5-4v4"/><circle cx="19" cy="12" r="1"/>')}<span>ふれあう</span></button><button data-game-panel="family" aria-pressed="${panel==='family'}">${icon('<circle cx="10" cy="9" r="4"/><circle cx="23" cy="9" r="4"/><path d="M10 13v5h13v-5M16 18v5"/><circle cx="16" cy="27" r="3"/>')}<span>家族</span></button><button id="game-nav-open" data-game-open-menu>${icon('<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="24" cy="8" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="24" cy="16" r="2"/><circle cx="8" cy="24" r="2"/><circle cx="16" cy="24" r="2"/><circle cx="24" cy="24" r="2"/>')}<span>メニュー</span></button></nav>`;
  }
  function roomGeometry(kind){
    const win=root.ownerDocument.defaultView,width=win.innerWidth||390,height=Number.parseFloat(document.body.style.getPropertyValue('--game-viewport-height'))||win.innerHeight||844,ratio=kind==='tall'?.75:1.6;
    const planeWidth=Math.max(width,height*ratio),planeHeight=Math.max(height,width/ratio),top=Math.max(height-planeHeight,Math.min(0,height*.7-planeHeight*.79));
    return {width,height,planeWidth,planeHeight,top,left:(planeWidth-width)/2};
  }
  function visibleFieldPositions(birds,kind,place){
    const positions=fieldPositions(birds,kind,place),g=roomGeometry(kind),fraction=g.width/g.planeWidth;
    return new Map([...positions].map(([id,p])=>[id,{...p,x:(1-fraction)/2+p.x*fraction,width:p.width*fraction}]));
  }
  // Keep the caption in a free viewport band, including crowded perch rows.
  function placeSceneCaption(){
    if(!alive||panel!=='garden')return;
    const caption=root.querySelector('.game-main>.game-scene-caption'),main=root.querySelector('.game-main');
    if(!caption||!main)return;
    caption.style.top='';caption.style.bottom='';
    const box=caption.getBoundingClientRect(),frame=main.getBoundingClientRect();
    if(!box.width||!box.height||!frame.height)return;
    const obstacles=[...root.querySelectorAll('.game-room-bird,.game-scene-toolbar,.game-bottom-dock,.game-field-nav,.game-field-bar,.game-main>.game-heading,.game-auto-gift,.game-adoption-invitation'),document.querySelector('.game-scene-controls-toggle')].filter(Boolean);
    let gaps=[[frame.top+8,frame.bottom-8]];
    for(const node of obstacles){
      if(!node.getClientRects().length)continue;
      const r=node.getBoundingClientRect();if(r.right<=box.left||r.left>=box.right)continue;
      const top=r.top-4,bottom=r.bottom+4;
      gaps=gaps.flatMap(([a,b])=>bottom<=a||top>=b?[[a,b]]:[[a,Math.max(a,top)],[Math.min(b,bottom),b]]);
    }
    const choices=gaps.filter(([a,b])=>b-a>=box.height).map(([a,b])=>Math.max(a,Math.min(box.top,b-box.height)));
    if(!choices.length)return;
    const top=choices.reduce((a,b)=>Math.abs(a-box.top)<=Math.abs(b-box.top)?a:b);
    caption.style.top=`${top-frame.top}px`;caption.style.bottom='auto';
  }
  function sceneCaption(){
    const active=fieldBirds(world),current=active.find(b=>b.id===selected)||active[0];
    const related=current&&world.events.slice(-8).reverse().find(e=>e.ids.includes(current.id)&&world.tick-e.tick<2&&['play','bath','declined','pair','reconcile'].includes(e.kind));
    const selectedSpeech=related?(related.kind==='declined'?'またあとでね':related.kind==='pair'?'これからも一緒':'いっしょに♪'):'';
    return `${current?`<div class="game-scene-caption" aria-hidden="true"><strong>${escape(current.name)}</strong><span>${current.stage==='egg'?'巣で育っているよ':ACTIONS[current.action.kind]}</span>${selectedSpeech?`<span class="game-bubble">${selectedSpeech}</span>`:''}</div>`:''}`;
  }
  function garden(preserveSelection=false) {
    const active=fieldBirds(world);

    // Returning from a visitor/departed profile must not show a different bird
    // in the picker, scene caption and compact profile.
    if(!preserveSelection&&!active.some(b=>b.id===selected)&&active.length){cancelCareEffects();selected=active[0].id;}
    const current=active.find(b=>b.id===selected)||active[0];
    const shown=compactLayout?.matches?[current].filter(Boolean):active;
    const cageGuests=world.field.place==='home'?encounterCageActors(world):[],actors=[...shown,...cageGuests];
    const positions=visibleFieldPositions(actors,'wide',world.field.place),mobilePositions=visibleFieldPositions(actors,'tall',world.field.place);
    // Short screens crop the upper perches. Keep the selected family bird and
    // its invited guests together on the existing lower, visible floor contacts.
    if(compactLayout?.matches&&cageGuests.length)for(const [kind,map] of [['wide',positions],['tall',mobilePositions]]){
      const household=visibleFieldPositions(shown,kind,world.field.place),geometry=roomGeometry(kind),fraction=geometry.width/geometry.planeWidth;
      for(const b of shown)map.set(b.id,{...household.get(b.id),x:.5});
      cageGuests.forEach((guest,i)=>{const x=cageGuests.length===1?.72:i===0?.28:.72;map.set(guest.id,{...map.get(guest.id),x:(1-fraction)/2+x*fraction,y:.79});});
    }
    return `${fieldNavigation()}<div class="game-room" data-compact="${!!compactLayout?.matches}" data-field="${world.field.place}" aria-label="${escape(fieldTitle())}。イラストのゲーム用風景です。">
      <picture class="game-habitat"><source media="(max-width: 600px)" srcset="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-tall.webp"><img src="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-wide.webp" alt="" aria-hidden="true" width="1600" height="1000" decoding="async"></picture>
      ${world.field.place!=='park'?sceneFurniture():''}${gemCollectibles()}<span class="game-floor-soil" style="--care-soil-opacity:${careFloorOpacity(getCleanliness(world)).toFixed(3)}" aria-hidden="true"></span>
      ${shown.map(b=>{
        const pos=positions.get(b.id),mobile=mobilePositions.get(b.id),isSelected=b.id===selected;
        const pose=poseFor(b,globalThis.matchMedia?.('(max-width: 600px)').matches?mobilePositions:positions,shown);
        const style=`--bird-x:${(compactLayout?.matches&&!cageGuests.length?.5:pos.x)*100}%;--bird-y:${pos.y*100}%;--bird-width:${pos.width*100}%;--bird-depth:${Math.round(pos.y*100)};--bird-tall-x:${(compactLayout?.matches&&!cageGuests.length?.5:mobile.x)*100}%;--bird-tall-y:${mobile.y*100}%;--bird-tall-width:${mobile.width*100}%;--bird-tall-depth:${Math.round(mobile.y*100)};--foot-x:${SPRITE_CONTACT.x*100}%;--foot-y:${SPRITE_CONTACT.y*100}%`;
        const attrs=`class="game-room-bird ${isSelected?'is-selected':''} ${pos.interactive?'':'game-nestling'}" style="${style}" data-bird-id="${b.id}" data-anchor="${pos.id}" data-tall-anchor="${mobile.id}" data-action="${b.action.kind}"`;
        return pos.interactive?`<button ${attrs} type="button" data-game-select="${b.id}" data-game-scene-select aria-pressed="${isSelected}" aria-label="${escape(b.name)}、${STAGES[b.stage]}、${ACTIONS[b.action.kind]}">${birdSvg(b.color,b.stage,pose)}${careGesture&&careGesture.birdId===b.id&&careGesture.worldId===world.worldId?'<span class="game-care-cheer" aria-hidden="true">♪</span>':''}</button>`:`<span ${attrs} aria-hidden="true">${birdSvg(b.color,b.stage,pose)}</span>`;
      }).join('')}
      ${cageGuests.map(guest=>{const p=positions.get(guest.id),m=mobilePositions.get(guest.id);return renderEncounterCageGuest(guest.entry,{base:new URL('../',GAME_ART).href,style:`--bird-x:${p.x*100}%;--bird-y:${p.y*100}%;--bird-width:${p.width*100}%;--bird-depth:${Math.round(p.y*100)};--bird-tall-x:${m.x*100}%;--bird-tall-y:${m.y*100}%;--bird-tall-width:${m.width*100}%;--bird-tall-depth:${Math.round(m.y*100)};--foot-x:50%;--foot-y:100%`});}).join('')}

    </div>
    <div class="game-scene-toolbar"><div class="game-scene-picker game-bird-carousel" aria-label="スワイプで文鳥を選ぶ">${birdSwitchControls()}<div class="game-bird-carousel-face" data-bird-id="${current?.id||''}">${current?smallBird(current):''}<div><strong>${current?escape(current.name):''}</strong><small>${current?colorName[current.color]+'・'+STAGES[current.stage]:''}</small></div></div></div>${world.field.place==='home'?gardenCare():''}</div>${secondaryMenu()}${world.field.place==='home'?`<div class="game-owner-companion" aria-hidden="true" style="--owner-delay:${ownerAnimationDelay()}ms">${renderOwnerPeek(loadOwnerProfile())}</div>`:''}${bottomDock()}`;
  }
  function profile() {
    const b=chosen(),nameSuggestion=suggestLegacyNumberedNames(world).find(item=>item.birdId===b.id),parentNames=b.parents.map(id=>birdName(world,id)),last=world.events.slice().reverse().find(e=>e.ids.includes(b.id));
    return `<section class="game-profile">${birdSwitchControls()}<div class="game-profile-heading">${smallBird(b)}<div><h3>${escape(b.name)}</h3><p>${b.sex==='female'?'メス':'オス'} · ${colorName[b.color]} · ${STAGES[b.stage]}</p></div></div><div class="game-profile-actions"><button id="game-profile-open-bird" type="button" data-game-open-bird>ふれあう・話す</button><button data-game-art="${b.id}">記念カード</button></div><form class="game-name-form" data-game-form="rename"><label for="game-name">${b.home==='visitor'?'名前をつける':'名前'}</label><input id="game-name" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="name" maxlength="16" value="${escape(b.name)}" required><button type="submit">名前を保存</button>${nameSuggestion?`<button type="button" data-game-name-suggest="${b.id}" data-name-before="${escape(b.name)}" data-name-world="${escape(world.worldId)}">名前の候補を見る</button><button type="button" data-game-name-cancel="${b.id}">もとの名前</button>`:''}${b.home==='visitor'?'<button type="button" data-game-action="adopt">おうちに迎える</button>':''}</form>${['名前を保存しました。','新しい仲間を迎えたよ。'].includes(message)?`<p class="game-name-feedback" role="status">${message}</p>`:''}<details class="game-profile-details" data-game-details="profile-${b.id}"><summary>性格・家族・思い出</summary><dl class="game-facts"><div><dt>いま</dt><dd>${ACTIONS[b.action.kind]}</dd></div><div><dt>好きなこと</dt><dd>${b.preference}</dd></div><div><dt>性格</dt><dd>${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}</dd></div><div><dt>家族</dt><dd>${b.partner?`つがい：${escape(birdName(world,b.partner))}`:'つがいはまだいない'}${parentNames.length?`<br>親：${parentNames.map(escape).join(' と ')}`:''}</dd></div></dl><div class="game-meters">${[['気分',b.mood],['元気',b.needs.energy],['おなか',b.needs.food]].map(([label,value])=>`<label>${label}<meter min="0" max="100" value="${value}">${Math.round(value)}%</meter></label>`).join('')}</div>${last?`<p class="game-last-memory">${escape(eventText(world,last))}</p>`:''}${b.milestones.length?`<details class="game-milestones" data-game-details="milestones-${b.id}"><summary>ずっと覚えていること</summary><ul>${b.milestones.map(m=>`<li>${day(m.tick)}：${milestoneName[m.kind]}${m.otherId?`（${escape(birdName(world,m.otherId))}）`:''}</li>`).join('')}</ul></details>`:''}</details><div class="game-links"><button data-game-panel="relations">友達との関係</button><button data-game-panel="family">家族</button><button data-game-article="${b.action.kind==='bath'?'bathing':b.action.kind==='eat'?'food':'behavior'}">本当のしぐさを調べる</button></div></section>`;
  }
  function relations() {
    const key=`${world.worldId}:${selected}`;if(relationshipFocusKey!==key){relationshipPage=0;relationshipFocusKey=key;}
    return renderRelationshipMap(world,selected,{page:relationshipPage,portrait:smallBird,label:relationshipLabel});
  }
  function family() {
    const graph=familyLayout(world,selected),focus=findBird(world,graph.focusId);if(!familyZoomManual&&root.clientWidth)familyZoom=Math.max(.9,Math.min(1,Math.round(root.clientWidth/Math.max(300,Math.min(graph.children.length,4)*140+40)*10)/10));
    return `<section class="game-family-tree"><div class="game-family-heading"><h3>${escape(focus.name)}の家系図</h3><div class="game-family-zoom" aria-label="家系図の大きさ"><button data-family-zoom="-1" aria-label="家系図を縮小" ${familyZoom<=.7?'disabled':''}>−</button><output>${Math.round(familyZoom*100)}%</output><button data-family-zoom="1" aria-label="家系図を拡大" ${familyZoom>=1.2?'disabled':''}>＋</button></div></div><p class="game-family-legend"><span>━━ 親子</span><span>┄┄ つがい</span><small>左右に動かして、家族を見よう</small></p><div class="game-family-pan" tabindex="0" aria-label="家族の図。左右にスクロールできます"><div class="game-family-stage" style="width:${graph.width*familyZoom}px;height:${graph.height*familyZoom}px"><div class="game-family-canvas" style="width:${graph.width}px;height:${graph.height}px;transform:scale(${familyZoom})"><svg class="game-family-lines" width="${graph.width}" height="${graph.height}" viewBox="0 0 ${graph.width} ${graph.height}" aria-hidden="true">${graph.edges.map(e=>`<path class="family-edge-${e.kind}" d="${e.path}"/>`).join('')}</svg>${graph.nodes.map(n=>{const b=findBird(world,n.id);return `<button class="game-family-node ${n.role==='focus'?'is-focus':''}" data-family-focus="${b.id}" style="left:${n.x-graph.cardW/2}px;top:${n.y}px" aria-label="${escape(b.name)}、${STAGES[b.stage]}。この文鳥の家族を見る">${smallBird(b)}<strong>${escape(b.name)}</strong><small>${colorName[b.color]}・${STAGES[b.stage]}</small></button>`;}).join('')}</div></div></div><div class="game-profile-actions"><button data-game-panel="profile">${escape(focus.name)}の紹介</button><button data-game-art="${focus.id}">家族の記念カード</button></div><details data-game-details="family-text"><summary>家族をことばで読む・みんなの名簿</summary><ul>${world.birds.map(b=>`<li><button data-family-focus="${b.id}">${escape(b.name)}</button>：${b.parents.length?'親 '+b.parents.map(id=>escape(birdName(world,id))).join(' と '):'庭の外から来た文鳥'}${b.partner?'／つがい '+escape(birdName(world,b.partner)):''}</li>`).join('')}</ul><p class="game-small">実線は血縁、点線はつがい。近い親せき同士はつがいになりません。</p></details></section>`;
  }
  function resizeFamily(){if(panel==='family'){render();centerFamily();}else if(panel==='garden'&&!interactionActive())render();}
  function centerFamily(){const pan=root.querySelector('.game-family-pan'),canvas=root.querySelector('.game-family-canvas');if(pan&&canvas)pan.scrollLeft=Math.max(0,parseFloat(canvas.style.width)*familyZoom/2-pan.clientWidth/2);}
  function diary() {
    const all=world.events.slice().reverse(),important=all.filter(e=>['pair','egg','hatch','grow','adopt','movein','depart'].includes(e.kind));
    const rows=(events,scope)=>events.map(e=>`<li><time datetime="${new Date(e.at).toISOString()}">${day(e.tick)}</time><p>${escape(eventText(world,e))}</p><details data-game-details="diary-${scope}-${e.id}"><summary>くわしく</summary><p>${escape(e.condition)}。${escape(e.result)}。</p><p>${new Date(e.at).toLocaleString('ja-JP')}</p></details>${['egg','hatch','grow','pair'].includes(e.kind)?`<button data-game-event-art="${e.id}">記念カード</button>`:''}</li>`).join('');
    return `<section><h3>大切なできごと</h3><ol class="game-diary">${rows(important.slice(0,12),'milestone')||'<li>家族の節目が、ここに残ります。</li>'}</ol><details class="game-full-diary" data-game-details="full-diary"><summary>すべての日記 · ${all.length}件</summary><ol class="game-diary">${rows(all,'all')}</ol><p class="game-small">新しい240件を保存。名前・家系・つがいは名簿にも残ります。</p></details></section>`;
  }
  function roster() {return `<section><h3>みんなの名簿</h3>${['resident','visitor','departed'].map(home=>`<h4>${homeName[home]}</h4><div class="game-roster">${world.birds.filter(b=>b.home===home).map(b=>birdButton(b)).join('')||'<p>まだいないよ。</p>'}</div>`).join('')}<p class="game-small">庭には10羽、訪問中は2羽まで。名簿は128羽まで残します。上限に達したら新しい誕生・新規来訪をお休みし、今いる仲間との暮らしと再会を楽しめます。</p></section>`;}
  function ownerName(){return loadOwnerProfile().name;}
  function settings() {return `<section class="game-settings"><h3>暮らしの設定</h3><button class="game-owner-setting" data-game-panel="owner">${renderOwnerPortrait(loadOwnerProfile(),{decorative:true})}<span>${escape(ownerName())}<small>見た目と名前を選ぶ</small></span></button><div data-settings-music></div>${soundControl()}<fieldset class="game-adoption-settings"><legend>友達のお迎え</legend><button data-adoption-mode="ask" aria-pressed="${world.settings.adoptionMode==='ask'}">そのつど選ぶ</button><button data-adoption-mode="auto" aria-pressed="${world.settings.adoptionMode==='auto'}">文鳥たちに任せる</button><small>友達の来訪はどちらでも続きます。</small></fieldset><label class="game-check"><input type="checkbox" data-game-motion ${world.settings.motion?'checked':''}> 文鳥の小さな動きを表示</label><details class="game-wallet-details" data-game-details="wallet"><summary>もちものの数</summary><p>Gems：${world.decor.points.toLocaleString('ja-JP')}<br>Gold：${world.economy.gold.toLocaleString('ja-JP')}</p></details><details class="game-settings-management" data-game-details="management"><summary>保存とリセット</summary><p>この端末のこのブラウザに保存します。ほかの端末へは自動で同期しません。大切な物語は「保存ファイルを書き出す」で保管してね。</p><button data-game-action="reset-state">リセットするものを選ぶ</button><button data-game-action="export">保存ファイルを書き出す</button><label class="game-import-label" for="game-import">保存ファイルを読み込む（今の庭と入れ替え）</label><input id="game-import" type="file" accept="application/json,.json"><p class="game-small">読み込み前に形式・版・血縁・人数を検査します。不正なファイルで今の庭は壊れません。読み込む前に、今の保存も書き出しておくと安心です。</p></details><p class="game-care-disclosure">合成音は架空のゲームの声です。実際のおもちの声ではありません。音をOFFにすると、再生中の音もすぐに止まります。</p><button data-game-action="pause">${world.paused?'時間を動かす':'時間を一時停止'}</button><details data-game-details="save-help"><summary>保存と時間のしくみ</summary><p>実際の15秒がゲームの1時間、6分が1日です。卵からひなは12時間、幼鳥へ24時間、成鳥へ48時間（すべてゲーム時間）。現実の成長や繁殖の手順ではありません。</p><p>閉じたあとは動き続けません。次に開いた時に、最大24ゲーム日（実際の2時間24分）ぶんを順番に計算します。それより長く留守にしても、不利益はありません。一時停止中の時間は進みません。</p><p>複数のタブの更新は保存処理を一列にして、同じ時間を二重に進めません。保存形式は版${SAVE_VERSION}。検査できた以前の保存は、名前・家族・日記・Gem・お飾りを残して引き継ぎ、新しいお世話時刻と名前の情報を加えます。古い版の画面が開いたままなら、読み直してください。将来対応しない版は保存を変えずに拒否します。</p><p>色はゲームの表現として選ばれます。羽色の遺伝を再現するものではありません。</p></details>${new URLSearchParams(location.search).get('qa')==='1'?'<details data-game-details="qa"><summary>検証用（通常の遊びには不要）</summary><button data-game-action="qa-step">1000時間を検証する</button><p>世代・家系・上限の確認用です。先に保存を書き出してください。</p></details>':''}</section>`;}
  function help() {return `<section class="game-help"><details data-game-details="help-care"><summary>お世話・音・創作について</summary><p>日本時間の7時・17時・20時に、またお世話できます。土日と日本の祝日は12時にも。ごはんはおなか、名前を呼ぶ・なでる・お話は元気がいっぱいになるまで。物語を一時停止していても、お世話の時間は来ます。長く来られなくても減るのは一回分だけ。${escape(careWindow(world.careSchedule.seenAt).coverageMessage)}</p><p>なでる操作は創作です。本物の文鳥に無理に触らず、様子を見守ってください。音はゲーム用の合成音で、実際のおもちや文鳥の声ではありません。</p><p class="game-art-disclosure">文鳥は写真のような生成画像、籠と公園は生成イラストです。実際のおもちの写真や、現実の観察記録ではありません。</p><p>友達はこの端末の物語のNPCです。ほかの利用者との通信・対戦はありません。</p></details><h3>ようこそ、おもちの文鳥ぐらしへ</h3><ol><li><strong>まずは見る。</strong>枝、巣、ごはん、水浴び場で、みんなが自分で過ごすよ。</li><li><strong>お客さんを迎える。</strong>最初に来るのはオスの文鳥。名前を決めて「おうちに迎える」を押せるよ。新しい暮らしでは、お迎えするか選べるよ。設定で文鳥たちに任せることもできます。</li><li><strong>話しかける。</strong>文鳥をえらんで、ことばのボタンを押そう。気分や好み、友達、記憶で返事が変わるよ。</li><li><strong>家族を見守る。</strong>気持ちが通じた成鳥はつがいに。信頼・元気・時間・場所がそろうと卵が生まれることがあるよ。必ずつがいになるわけではないし、友達のままでもすてき。</li><li><strong>記念に残す。</strong>家系図や日記の「記念カード」からアート工房へ。ゲームの家族のお祝いをつくろう。</li></ol><p>食事も休息も自分でできるので、来られない日があっても大丈夫。死亡・課金・広告・連続ログインの条件はありません。</p><p>会話は名前・状態・関係・記憶と、いくつかのことばに反応するルールです。何でも理解するAIではなく、外部へ入力を送りません。</p><p>実在のおもちは、娘さんのメスの白文鳥です。この庭の性格・会話・家族・成長は創作。現実の飼育や繁殖の方法を示すものではありません。</p></section>`;}
  function render() {
    // A background refresh replaces the panel node. Keep the reader's place
    // only when the same panel remains open; navigation starts at the top.
    const oldPanelScroll=root.querySelector('.game-app')?.dataset.panel===panel
      ? root.querySelector('.game-panel-overlay[open] > .game-panel')?.scrollTop : undefined;
    const ownerFocus=ownerEditor?.contains(document.activeElement)?document.activeElement:null;if(ownerEditor)ownerEditor.remove();
    document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-will-render'));
    if(!poseEnabled())poseClock.hold();
    refreshPending=false;
    const oldFriendScroll=root.querySelector('.game-friend-houses')?.scrollLeft;
    const oldFamilyScroll=root.querySelector('.game-family-pan')?.scrollLeft;
    const decorSlots=root.querySelector('.game-decor-slots');
    const oldDecorScroll=panel==='decorate'&&decorSlots?{
      slots:decorSlots.scrollLeft,
      collection:decorSlots.querySelector('[aria-pressed=true]')?.dataset.decorSlot===decorSlot
        &&root.querySelector('[data-decor-tier][aria-pressed=true]')?.dataset.decorTier===decorTier
        &&root.querySelector('[data-decor-filter][aria-pressed=true]')?.dataset.decorFilter===decorFilter
        ?root.querySelector('.game-collection')?.scrollTop:0,
    }:null;
    const openDetails=new Set([...root.querySelectorAll("details[open][data-game-details]")].map(d=>d.dataset.gameDetails));
    const oldBirdPositions=new Map([...root.querySelectorAll('.game-room-bird')].map(el=>[el.dataset.birdId,el.getBoundingClientRect()]));
    const focus=document.activeElement,focusBird=root.contains(focus)?focus.dataset?.gameSelect:null,focusIndex=root.contains(focus)?[...root.querySelectorAll('button,input,select,summary')].indexOf(focus):-1,focusId=root.contains(focus)?focus.id:null,focusValue=focusId&&'value'in focus&&(!focus.dataset.gameDraftBird||(focus.dataset.gameDraftBird===selected&&focus.dataset.gameDraftWorld===world.worldId&&drafts.get(draftKey())?.[focusId]!==undefined))?focus.value:null,selectionStart=focus?.selectionStart,selectionEnd=focus?.selectionEnd;
    const panels={outdoors:()=>'<div data-encounter-slot></div>',notebook:()=>'<div data-encounter-slot></div>',garden:()=>garden(),decorate:()=>decorationRoom(),friends:()=>friendRooms(),profile:()=>profile(),owner:()=>'<div data-owner-editor-slot></div>',relations,family,diary,roster,settings,help};
    if(!root.querySelector('.game-main'))root.innerHTML='<div class="game-app"><div class="game-main"></div><dialog class="game-panel-overlay" aria-label="文鳥ぐらしの遊び"></dialog><dialog class="game-bird-sheet" aria-labelledby="game-sheet-title"></dialog></div>';
    root.querySelector('.game-app').dataset.panel=panel;
    root.querySelector('.game-main').inert=panel==='outdoors';
    root.querySelector('.game-app').dataset.careMotion=world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'on':'off';
    root.querySelector('.game-main').innerHTML=`<header class="game-heading"><div class="game-status"><span>${day(world.tick)}</span><span>${world.paused?'おやすみ中':'のんびり進行中'}</span><button data-game-action="pause">${world.paused?'つづける':'一時停止'}</button></div></header>${store.mode==='memory'?'<p class="game-warning" role="alert">このブラウザでは端末保存が使えません。いまのタブだけで遊べます。閉じる前に設定から保存ファイルを書き出してください。</p>':''}${automaticGift()}${adoptionInvitation()}${welcomeCard()}<p class="game-message ${error?'is-error':''}" role="status">${escape(error||message)}</p><div class="${panel==='garden'?'game-panel':'game-scene-base'}">${garden(panel!=='garden')}</div>${panel==='garden'?sceneCaption():''}`;
    const overlay=root.querySelector('.game-panel-overlay');
    // Removing the host while replacing the overlay resets nested scroll offsets.
    const encounterScroll=encounterRoot?.scrollTop;
    const gardenSelectorScroll=encounterRoot?.querySelector('.finch-garden-selector')?.scrollLeft;
    if(panel!=='garden'){
      overlay.innerHTML=`<div class="game-overlay-head"><button data-game-close-panel>${panel==='owner'?'設定に戻る':panel==='outdoors'?'おうちへ':'もどる'}</button></div><div class="game-panel">${error||message?`<p class="game-overlay-message" role="status">${escape(error||message)}</p>`:''}${panels[panel]()}</div>`;
      const fullScene=panel==='outdoors';if(overlay.open&&overlay.dataset.scene!==String(fullScene))overlay.close();overlay.dataset.scene=String(fullScene);if(!overlay.open){if(fullScene)overlay.show();else overlay.showModal();}
    }else{if(overlay.open)overlay.close();overlay.innerHTML='';}
    if(['outdoors','notebook'].includes(panel)){
      if(!encounterRoot){
        encounterRoot=document.createElement('div');encounterRoot.className='game-encounter-host';
        encounterController=mountEncounterPanel(encounterRoot,{initialMode:panel==='outdoors'?'garden':'notebook',getWorld:()=>world,getSelectedBirdId:()=>selected,onHouseholdBird:id=>openBirdSheet(id),meetFriend:(w,id,action,token)=>meetGardenFriendReward(w,id,action,token),completeEncounter:(w,id,action,token)=>completeEncounterReward(w,id,action,token),onReward:amount=>showGemReward(amount),onHome:async isCurrent=>{const view=fieldViewRequest,valid=()=>alive&&isCurrent()&&fieldViewRequest===view;const committed=await mutate(w=>{travelTo(w,'home');encounterSystem.leaveGarden(w,{worldId:w.worldId,revision:w.revision});return w;},'',valid,{bump:false,advanceCurrent:false});if(committed&&valid()){fieldViewRequest++;panel='garden';render();}},base:new URL('../',GAME_ART).href,transact:async (operation,options={})=>{
          const committed=await mutate(operation,'',()=>alive,{bump:false,advanceCurrent:false,renderAfter:!options.gesture});
          if(!committed)throw new Error('記録できませんでした。');return world;
        },onGardenChanged:({gardenId,worldId})=>document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-garden',{detail:{gardenId,worldId}}))});
      }
      overlay.querySelector('[data-encounter-slot]').append(encounterRoot);
      if(encounterScroll!==undefined)encounterRoot.scrollTop=encounterScroll;
      const gardenSelector=encounterRoot.querySelector('.finch-garden-selector');
      if(gardenSelector&&gardenSelectorScroll!=null)gardenSelector.scrollLeft=gardenSelectorScroll;
      if(encounterMode!==panel){encounterMode=panel;if(panel==='outdoors')queueMicrotask(()=>{if(alive&&panel==='outdoors')encounterController?.garden();});else encounterController.notebook();}
      else if(!interactionActive())encounterController.refresh();
    }else if(encounterRoot){encounterController?.destroy();encounterController=null;encounterRoot=null;encounterMode=null;document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-garden',{detail:{gardenId:null,worldId:world.worldId}}));}
    if(panel==='owner'){
      if(!ownerEditor){ownerEditor=document.createElement('div');ownerEditor.className='game-owner-editor';ownerCleanup=mountOwnerProfile(ownerEditor,{onSave:()=>{panel='settings';message='新しい装いになったよ。';render();focusPanel();},onCancel:()=>{panel='settings';render();focusPanel();}});}
      overlay.querySelector('[data-owner-editor-slot]').append(ownerEditor);ownerFocus?.focus({preventScroll:true});
    }else if(ownerEditor){ownerCleanup?.dispose();ownerCleanup=null;ownerEditor=null;}
    syncDrawResult();
    document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-panel',{detail:panel}));
    const sheet=root.querySelector('.game-bird-sheet'),opening=sheetOpen&&!sheet.open;
    const oldSheetScroll=sheetOpen&&sheet.dataset.birdId===selected?sheet.scrollTop:0;
    if(sheetOpen){sheet.dataset.birdId=selected;sheet.innerHTML=birdSheet();if(opening)sheet.showModal();}else{if(sheet.open)sheet.close();sheet.innerHTML='';delete sheet.dataset.birdId;}
    for(const [id,value] of Object.entries(drafts.get(draftKey())||{})){const input=root.querySelector(`#${id}`);if(input)input.value=value;}
    root.querySelectorAll('details[data-game-details]').forEach(d=>{if(openDetails.has(d.dataset.gameDetails))d.open=true;});
    if(sheetOpen)sheet.scrollTop=oldSheetScroll;
    if(oldPanelScroll!==undefined&&panel!=='garden')overlay.querySelector(':scope > .game-panel').scrollTop=oldPanelScroll;
    if(oldFriendScroll!==undefined&&root.querySelector('.game-friend-houses'))root.querySelector('.game-friend-houses').scrollLeft=oldFriendScroll;
    if(oldFamilyScroll!==undefined&&root.querySelector('.game-family-pan'))root.querySelector('.game-family-pan').scrollLeft=oldFamilyScroll;
    // Replacing the decoration DOM must not move the next item under a finger.
    // Keep both scroll tracks across preview, equip and background refresh.
    if(panel==='decorate'){
      const slots=root.querySelector('.game-decor-slots'),collection=root.querySelector('.game-collection');
      if(oldDecorScroll){slots.scrollLeft=oldDecorScroll.slots;collection.scrollTop=oldDecorScroll.collection||0;}
      else if(slots){
        const active=slots.querySelector('[aria-pressed=true]'),track=slots.getBoundingClientRect(),item=active?.getBoundingClientRect();
        if(item&&item.right>track.right)slots.scrollLeft+=item.right-track.right;
        else if(item&&item.left<track.left)slots.scrollLeft+=item.left-track.left;
      }
    }
    const room=root.querySelector('.game-room');
    if(room){
      const tall=globalThis.matchMedia?.('(max-width: 600px)').matches;
      room.dataset.layout=tall?'tall':'wide';
    }
    if(world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      for(const el of root.querySelectorAll('.game-room-bird:not(.game-nestling)')){
        const old=oldBirdPositions.get(el.dataset.birdId),next=el.getBoundingClientRect();
        if(!old||!el.animate)continue;
        const dx=old.left-next.left,dy=old.top-next.top;
        if(Math.abs(dx)<1&&Math.abs(dy)<1)continue;
        const base='translate(calc(-1 * var(--foot-x)), calc(-1 * var(--foot-y)))';
        const scene=room?.getBoundingClientRect();
        if(scene&&(Math.hypot(dx,dy)>scene.width*.27||Math.abs(dy)>scene.height*.24)){
          // A still sprite cannot show a true flight cycle. Distant changes use
          // a brief dissolve rather than pretending to glide with closed wings.
          el.animate([{opacity:.15},{opacity:1}],{duration:220,easing:'ease-out'});
          continue;
        }
        // One brief arc and landing, not continuous breathing/bobbing or a
        // slow glide. The feet start and finish at verified contact anchors.
        el.animate([
          {transform:`${base} translate(${dx}px,${dy}px)`,offset:0},
          {transform:`${base} translate(${dx*.55}px,${dy*.55-14}px)`,offset:.43},
          {transform:`${base} translate(${dx*.12}px,${dy*.12-5}px)`,offset:.78},
          {transform:base,offset:1},
        ],{duration:420,easing:'cubic-bezier(.25,.6,.3,1)'});
      }
    }
    if(focusBird&&!sheetOpen){const el=root.querySelector(`button[data-game-select="${focusBird}"]`);el?.focus({preventScroll:true});}
    if(!opening&&!focusBird&&!focusId&&focusIndex>=0){const el=root.querySelectorAll('button,input,select,summary')[focusIndex];if(el&&el.tagName===focus.tagName&&el.textContent===focus.textContent)el.focus({preventScroll:true});}
    if(focusId){const el=root.querySelector(`#${focusId}`);if(el&&el.tagName===focus.tagName){if(focusValue!==null&&el.type!=='file')el.value=focusValue;el.focus({preventScroll:true});if(typeof selectionStart==='number'&&el.setSelectionRange)try{el.setSelectionRange(selectionStart,selectionEnd);}catch{}}}
    placeSceneCaption();
    if(opening)root.querySelector('#game-sheet-close')?.focus({preventScroll:true});
    const welcome=root.querySelector('#game-welcome-close'),welcomeKey=world.offlineSummary?`${world.worldId}:${world.offlineSummary.fromTick}:${world.offlineSummary.toTick}`:null;if(welcome&&welcomeKey!==welcomeFocusKey&&panel==='garden'&&!sheetOpen){welcomeFocusKey=welcomeKey;welcome.focus({preventScroll:true});}
  }
  function artPayload(b, e) { const family=[b,...b.parents.map(id=>findBird(world,id)),...(b.partner?[findBird(world,b.partner)]:[])].filter(Boolean); return {title:e?eventText(world,e):`${b.name}の家族`,name:b.name,names:family.map(x=>x.name),birds:family.map(x=>({id:x.id,name:x.name,color:x.color,stage:x.stage})),date:day(e?.tick??world.tick),event:e?.kind||'family',source:'game',caption:'おもちの文鳥ぐらし・ゲームの記念カード'}; }
  // Only our captured poll may advance this gesture's token. Never adopt an
  // arbitrary newer revision: a peer write must still fail the engine guard.
  function reserveCareIntent(){
    if(pendingCareIntent)return null;
    return pendingCareIntent={token:economyToken(world),poll:pollFlight};
  }
  function releaseCareIntent(intent){if(pendingCareIntent===intent)pendingCareIntent=null;}
  async function afterCarePoll(intent,current){
    const flight=intent.poll;await flight.promise;
    if(pendingCareIntent!==intent||!current())return null;
    const before=flight.before,after=flight.after;
    if(!before||!after||before.worldId!==intent.token.worldId||before.revision!==intent.token.revision||after.worldId!==intent.token.worldId||world.worldId!==after.worldId||world.revision!==after.revision){
      message='お部屋が変わったよ。もう一度選んでね。';render();return null;
    }
    return {worldId:after.worldId,revision:after.revision};
  }
  async function careAction(button) {
    const kind=button.dataset.gameCare, birdId=button.dataset.careBirdId || null;
    const expectedWorldId=world.worldId, expectedSelection=selected, expectedPanel=panel, generation=careGeneration, gestureAt=Date.now();
    if(!['feed','pet','clean'].includes(kind)||button.disabled)return;
    const intent=reserveCareIntent();if(!intent)return;
    try{
      const current=()=>alive&&root.isConnected&&world.worldId===expectedWorldId&&selected===expectedSelection&&panel===expectedPanel&&generation===careGeneration;
      // Unlock starts synchronously in this click; no sound plays before commit.
      const unlocked=careSoundEnabled()?audio.unlockFromGesture():Promise.resolve(false);
      const token=intent.poll?await afterCarePoll(intent,current):intent.token;if(!token)return;
      let feedback;
      const committed=await mutate(w=>{
        if(w.worldId!==expectedWorldId)throw new Error('庭が変わりました。もう一度えらんでね。');
        feedback=kind==='feed'?feedBird(w,birdId,gestureAt,token):kind==='pet'?petBird(w,birdId,gestureAt,token):cleanGarden(w);
        // Feedback is deliberately NOT returned: transactions require the world.
      },'',()=>alive&&root.isConnected,{bump:false,advancePaused:false,advanceCurrent:false});
      releaseCareIntent(intent);
      if(!committed||!feedback||!current())return;
      if(!feedback.birdId&&feedback.kind!=='clean'&&feedback.message){message=feedback.message;render();return;}
      careFeedback=feedback;message='';
      if(['pet','feed'].includes(kind)&&feedback.changed){
        careGesture={birdId,worldId:expectedWorldId,kind};clearTimeout(gestureTimer);
        gestureTimer=setTimeout(()=>{if(!current())return;careGesture=null;render();},850);
      }
      render();
      showGemReward(feedback.gemAward,undefined,feedback.goldAward);
      if(feedback.changed&&careSoundEnabled()){
        const canPlay=()=>current()&&!document.hidden&&Date.now()-gestureAt<=1500&&careSoundEnabled();
        const opened=await unlocked;
        if(!canPlay())return;
        const played=opened&&await audio.chirp(canPlay);
        if(!played&&canPlay()){message='この端末では合成音を鳴らせませんでした。ことばの返事はそのまま楽しめます。';render();}
      }
    }finally{releaseCareIntent(intent);}
  }
  async function changeCareSound(enabled) {
    const request=++soundRequest,expectedWorldId=world.worldId;
    explicitSound=enabled;soundChoice=enabled;cancelCareEffects();audio.setEnabled(enabled);
    try { localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled})); } catch { /* The immediate mute remains effective even if device preferences cannot save. */ }
    if(enabled)audio.unlockFromGesture(); // gesture only; enabling does not chirp
    const guard=()=>alive&&root.isConnected&&request===soundRequest&&world.worldId===expectedWorldId;
    const committed=await mutate(w=>{w.settings.careSound=enabled;},enabled?'合成音をONにしました。ふれあいを選ぶと短い音が鳴ります。':'合成音を止めました。',guard);
    if(!guard())return;
    if(committed)soundChoice=null; // failed mute remains muted in this view
    audio.setEnabled(careSoundEnabled());render();
  }
  function closeGameMenu(){const menu=root.querySelector('.game-secondary-menu');if(!menu)return;menu.open=false;(root.querySelector('[data-game-open-menu]')||menu.querySelector('summary')).focus({preventScroll:true});}
  function menuKeydown(ev){
    if(ev.key==='Escape'&&ev.target.closest('.game-welcome')){ev.preventDefault();dismissWelcome();return;}
    if(ev.key==='Escape'&&panel==='outdoors'&&!sheetOpen){ev.preventDefault();closePanel();return;}
    if(ev.key==='Escape'&&root.querySelector('.game-adoption-dialog[open]')){ev.preventDefault();if(!adoptionBusy)closeAdoptionDialog();return;}
    if(ev.key==='Escape'&&root.querySelector('.game-reset-dialog[open]')){ev.preventDefault();if(!resetPending)closeResetDialog();return;}
    const sheet=root.querySelector('.game-reset-dialog[open],.game-adoption-dialog[open],.game-bird-sheet[open]');
    if(sheet&&ev.key==='Tab'){
      const controls=[...sheet.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]')].filter(el=>{
        if(el.disabled||el.tabIndex<0||!el.getClientRects().length||el.closest('[hidden],[inert]'))return false;
        for(let node=el.parentElement;node&&node!==sheet;node=node.parentElement){if(node.tagName==='DETAILS'&&!node.open){const summary=node.querySelector(':scope > summary');if(el!==summary&&!summary?.contains(el))return false;}}
        return true;
      });
      const index=controls.indexOf(document.activeElement);
      if(controls.length){ev.preventDefault();const next=index<0?(ev.shiftKey?controls.length-1:0):(index+(ev.shiftKey?-1:1)+controls.length)%controls.length;controls[next].focus({preventScroll:true});}
      return;
    }
    if(ev.key==='Escape'&&ev.target.closest('.game-secondary-menu[open]')){ev.preventDefault();closeGameMenu();}
  }
  function syncCarePreference(ev) {
    if(ev.key!=='buncho.care-sound-choice.v1')return;
    try {const p=JSON.parse(ev.newValue||'null');if(p?.explicit!==true||typeof p.enabled!=='boolean')return;explicitSound=p.enabled;soundChoice=null;cancelCareEffects();audio.setEnabled(careSoundEnabled());render();} catch {}
  }
  function unlockCareCapture(ev) {
    if(ev.isTrusted&&alive&&root.isConnected&&ev.target.closest?.('#game-root,[data-game-title-slot],[data-game-world-control]')&&careSoundEnabled())audio.unlockFromGesture();
  }
  async function click(ev) {
    const suggestionButton=ev.target.closest?.('[data-game-name-suggest],[data-game-name-cancel]');
    if(suggestionButton){
      const b=chosen(),input=root.querySelector('#game-name');
      if(!input||input.dataset.gameDraftBird!==b.id||input.dataset.gameDraftWorld!==world.worldId)return;
      if(suggestionButton.dataset.gameNameCancel){input.value=b.name;const draft=drafts.get(draftKey());if(draft)delete draft['game-name'];nameSuggestionOrigins.delete(draftKey());}
      else{
        const suggestion=suggestLegacyNumberedNames(world).find(item=>item.birdId===b.id);
        if(!suggestion||suggestionButton.dataset.gameNameSuggest!==b.id||suggestionButton.dataset.nameBefore!==b.name||suggestionButton.dataset.nameWorld!==world.worldId){render();return;}
        input.value=suggestion.newSuggestion;rememberDraft({target:input});nameSuggestionOrigins.set(draftKey(),{worldId:world.worldId,birdId:b.id,oldName:b.name});
      }
      input.focus({preventScroll:true});input.select();return;
    }

    if(Date.now()<suppressSwipeClickUntil){ev.preventDefault();return;}
    if(ev.target.matches('.game-bird-sheet')){const r=ev.target.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closeBirdSheet();return;}
    const button=ev.target.closest('button');if(!button||!root.contains(button))return;
    if(button.hasAttribute('data-draw-result-close')){dismissDrawResult();return;}
    if(button.hasAttribute('data-adoption-open')){openAdoptionDialog();return;}
    if(button.hasAttribute('data-adoption-cancel')){if(!adoptionBusy)closeAdoptionDialog();return;}
    if(button.dataset.adoptionDecision){await adoptionDecision(button);return;}
    if(button.dataset.adoptionMode){const token=economyToken(world);await mutate(w=>{setAdoptionMode(w,button.dataset.adoptionMode,token);},'',()=>alive,{bump:false,advanceCurrent:false});return;}
    if(button.dataset.friendStep){const track=root.querySelector('.game-friend-houses'),card=track?.querySelector('.game-friend-house');if(track&&card)track.scrollBy({left:Number(button.dataset.friendStep)*(card.getBoundingClientRect().width+16),behavior:reducedMotion?.matches?'instant':'smooth'});return;}
    if(button.dataset.familyFocus){cancelCareEffects();selected=button.dataset.familyFocus;familyZoomManual=false;render();centerFamily();root.querySelector('.game-family-node.is-focus')?.focus({preventScroll:true});return;}
    if(button.dataset.familyZoom){familyZoomManual=true;familyZoom=Math.max(.7,Math.min(1.2,Math.round((familyZoom+Number(button.dataset.familyZoom)*.1)*10)/10));render();centerFamily();return;}
    if(button.dataset.birdStep){switchBird(Number(button.dataset.birdStep));return;}
    if(button.dataset.gemCollect){await collectGem(button);return;}
    if(button.hasAttribute('data-auto-gift')||button.hasAttribute('data-gold-buy')){await economyAction(button);return;}
    if(button.hasAttribute('data-game-open-menu')){const menu=root.querySelector('.game-secondary-menu');menu.open=!menu.open;if(menu.open)menu.querySelector('button')?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-game-close-panel')){closePanel();return;}
    if(button.hasAttribute('data-game-close-bird')){closeBirdSheet();return;}
    if(button.hasAttribute('data-game-open-bird')){openBirdSheet(selected);return;}
    if(button.hasAttribute('data-game-close-menu')){closeGameMenu();return;}
    if(button.dataset.gamePanel==='garden'&&world.field.place==='home'){fieldViewRequest++;cancelCareEffects();panel='garden';render();}
    if(button.hasAttribute('data-field-travel')||button.dataset.fieldInvite||button.dataset.decorDraw||button.dataset.decorEquip){await fieldAction(button);return;}
    if(button.dataset.decorFilter){fieldViewRequest++;decorFilter=button.dataset.decorFilter;render();return;}
    if(button.dataset.decorTier){fieldViewRequest++;decorTier=button.dataset.decorTier;render();return;}
    if(button.dataset.decorSlot){fieldViewRequest++;decorSlot=button.dataset.decorSlot;previewItem=null;drawResult=null;message='';render();return;}
    if(button.dataset.decorPreview){fieldViewRequest++;previewItem=button.dataset.decorPreview;message='';render();return;}
    if(button.hasAttribute('data-decor-cancel')){fieldViewRequest++;previewItem=null;drawResult=null;render();return;}
    if(button.dataset.gameCare){await careAction(button);return;}
    if(button.dataset.gamePanel){const menu=root.querySelector('.game-secondary-menu');if(menu)menu.open=false;sheetOpen=false;fieldViewRequest++;cancelCareEffects();panel=button.dataset.gamePanel;message='';render();focusPanel();if(panel==='family')centerFamily();return;}
    if(button.hasAttribute('data-cage-guest')){const id=button.dataset.cageGuest;panel='notebook';render();encounterController?.entry(id);return;}
    if(button.dataset.gameSelect&&button.hasAttribute('data-game-scene-select')){openBirdSheet(button.dataset.gameSelect);return;}
    if(button.dataset.gameSelect){sheetOpen=false;fieldViewRequest++;cancelCareEffects();selected=button.dataset.gameSelect;panel='profile';lastReply='';render();focusPanel();if(panel==='family')centerFamily();return;}
    if(button.dataset.gameArticle){cancelCareEffects();goArticle(button.dataset.gameArticle);return;}
    if(button.dataset.gameArt){cancelCareEffects();const b=findBird(world,button.dataset.gameArt);if(b)goArt(artPayload(b));return;}
    if(button.dataset.gameEventArt){cancelCareEffects();const e=world.events.find(e=>e.id===button.dataset.gameEventArt);if(e)goArt(artPayload(findBird(world,e.ids[0]),e));return;}
    if(button.dataset.gameTalk){await talkAction(button.dataset.gameTalk);return;}
    const action=button.dataset.gameAction;
    if(button.dataset.resetKind){if(!resetPending){resetKind=button.dataset.resetKind;resetStage=1;resetDialogContent();}return;}
    if(action==='reset-back'){if(!resetPending){resetKind=null;resetStage=0;resetDialogContent();}return;}
    if(action==='reset-state'){openResetDialog();return;}
    if(action==='reset-cancel'){if(!resetPending)closeResetDialog();return;}
    if(action==='reset-confirm'){await confirmStateReset();return;}
    if(action==='pause')await mutate(w=>{w.paused=!w.paused;markCurrentTime(w);});
    if(action==='dismiss-welcome')await dismissWelcome();
    if(action==='adopt'){const name=root.querySelector('#game-name')?.value,birdId=selected;await mutate(w=>{adoptBird(w,birdId,name);},'新しい仲間を迎えたよ。');}
    if(action==='export') {try{const current=await store.transact(w=>advanceTo(w));if(!alive||!root.isConnected)return;latest(current);const blob=new Blob([serializeWorld(current)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`buncho-garden-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message='保存ファイルを書き出しました。';render();}catch(e){if(alive){error=e.message;render();}}}
    if(action==='qa-step'&&new URLSearchParams(location.search).get('qa')==='1')await mutate(w=>{const paused=w.paused;w.paused=false;advanceTicks(w,1000);w.paused=paused;markCurrentTime(w);},'検証用に1000時間を進めました。');
  }
  async function talkAction(text){
    const birdId=selected,generation=careGeneration,worldId=world.worldId,expectedPanel=panel,gestureAt=Date.now();
    const intent=reserveCareIntent();if(!intent)return false;
    try{
      let answer,gemAward,goldAward,careChanged=false;
      const eligible=['adult','juvenile'].includes(findBird(world,birdId)?.stage)&&findBird(world,birdId)?.home!=='departed';
      const unlocked=eligible&&careSoundEnabled()?audio.unlockFromGesture():Promise.resolve(false);
      const current=()=>alive&&root.isConnected&&generation===careGeneration&&selected===birdId&&world.worldId===worldId&&panel===expectedPanel;
      const token=intent.poll?await afterCarePoll(intent,current):intent.token;if(!token)return false;
      const committed=await mutate(w=>{const b=findBird(w,birdId);const reply=talkToBird(w,birdId,text==='名前を呼ぶ'?b.name:text,gestureAt,token);answer=reply.answer;gemAward=reply.gemAward;goldAward=reply.goldAward;careChanged=reply.careChanged;},'',()=>alive,{bump:false,advanceCurrent:false});
      releaseCareIntent(intent);
      if(committed&&generation===careGeneration&&selected===birdId&&world.worldId===worldId){lastReply=answer;replyBird=birdId;render();showGemReward(gemAward,undefined,goldAward);}
      if(committed&&eligible&&careChanged&&careSoundEnabled()){
        const current=()=>alive&&root.isConnected&&generation===careGeneration&&selected===birdId&&world.worldId===worldId&&!document.hidden&&careSoundEnabled()&&Date.now()-gestureAt<=1500;
        if(await unlocked&&current())await audio.chirp(current);
      }
      return committed;
    }finally{releaseCareIntent(intent);}
  }
  async function submit(ev){
    const form=ev.target.closest('form');if(!form)return;ev.preventDefault();

    const data=new FormData(form),birdId=selected,key=draftKey(birdId);
    if(form.dataset.gameForm==='rename'){
      const value=data.get('name'),origin=nameSuggestionOrigins.get(key);let nameConflict=false,nameConflictWorld=null;
      const committed=await mutate(w=>{
        if(origin&&(w.worldId!==origin.worldId||birdId!==origin.birdId||findBird(w,birdId)?.name!==origin.oldName)){nameConflict=true;nameConflictWorld=w;throw new Error('名前が変わったよ。今の名前を見て、もう一度選んでね。');}
        renameBird(w,birdId,value);
      },'名前を保存しました。');
      if(nameConflict){if(nameConflictWorld)latest(nameConflictWorld);const draft=drafts.get(key);if(draft)delete draft['game-name'];nameSuggestionOrigins.delete(key);render();}
      else if(committed){nameSuggestionOrigins.delete(key);if(drafts.get(key)?.['game-name']===value)delete drafts.get(key)['game-name'];}
    }
    if(form.dataset.gameForm==='talk'){
      const value=data.get('words');
      if(!String(value||'').trim()){lastReply='ひとこと入れてね。';replyBird=birdId;render();return;}
      const committed=await talkAction(value);
      if(committed&&drafts.get(key)?.['game-words']===value){delete drafts.get(key)['game-words'];if(key===draftKey()){const input=root.querySelector('#game-words');if(input)input.value='';}}
    }
  }
  async function change(ev){if(ev.target.matches('[data-game-care-sound]')){await changeCareSound(ev.target.checked);return;}if(ev.target.matches('[data-game-choose], [data-game-scene-choose]')){cancelCareEffects();selected=ev.target.value;render();}if(ev.target.matches('[data-game-motion]'))await mutate(w=>{w.settings.motion=ev.target.checked;});if(ev.target.id==='game-import'&&ev.target.files?.[0]){cancelCareEffects();const file=ev.target.files[0],request=++importRequest;const currentRequest=()=>alive&&root.isConnected&&request===importRequest;try{if(file.size>MAX_SAVE_BYTES)throw new Error('4MB以下の保存ファイルを選んでね。');const text=await file.text();if(!currentRequest())return;const imported=parseSave(text);if(!confirm(`「${imported.birds[0].name}」の庭（${imported.birds.length}羽）を読み込み、今の庭と入れ替えますか？`)){ev.target.value='';return;}const now=Date.now();if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw new Error('端末の日時を確認してから、もう一度読み込んでください。');const expectedWorld=world.worldId;busy++;try{const replacement=await store.replaceWorld(expectedWorld,imported,now,{guard:currentRequest});if(currentRequest()){latest(replacement);message='保存ファイルから庭を復元しました。';channel?.postMessage({revision:world.revision});render();}}finally{busy--;}}catch(e){if(!currentRequest())return;error=`読み込めませんでした。今の保存はそのままです。 ${e.message}`;render();}}}
  const worldAction=event=>{if(!alive||!root.isConnected||!['settings','help','music'].includes(event.detail))return;sheetOpen=false;fieldViewRequest++;cancelCareEffects();panel=event.detail==='music'?'settings':event.detail;message='';render();focusPanel();};
  document.addEventListener('buncho-world-action',worldAction);
  root.ownerDocument.defaultView.addEventListener('storage',syncCarePreference);
  document.addEventListener('click',unlockCareCapture,true);
  root.ownerDocument.defaultView.addEventListener('pagehide',cancelCareEffects);
  const disposeRelations=bindRelationshipNavigation(root,action=>{
    if(panel!=='relations')return;const focusId=document.activeElement?.id;
    const next=navigateRelationships(world,{selectedId:selected,page:relationshipPage},action);
    cancelCareEffects();fieldViewRequest++;selected=next.selectedId;relationshipPage=next.page;relationshipFocusKey=`${world.worldId}:${selected}`;lastReply='';replyBird=null;render();
    const control=focusId?root.querySelector(`#${focusId}`):null;
    (control&&!control.disabled?control:root.querySelector('[data-rel-map]'))?.focus({preventScroll:true});
  });
  root.addEventListener('cancel',sheetCancel,true);root.addEventListener('keydown',menuKeydown);root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('change',change);root.addEventListener('input',rememberDraft);root.addEventListener('pointerdown',pointerStart);document.addEventListener('pointerup',pointerEnd);document.addEventListener('pointercancel',pointerEnd);
  if(globalThis.BroadcastChannel){channel=new BroadcastChannel('buncho-garden-updates');channel.onmessage=()=>poll();}
  async function poll(){
    if(!alive||busy||document.hidden)return;
    busy++;const flight={before:null,after:null,promise:null};pollFlight=flight;
    flight.promise=(async()=>{
      try{
        const next=await store.transact(w=>{flight.before=economyToken(w);return advanceTo(w);});
        flight.after=economyToken(next);
        const replaced=next.worldId!==world.worldId,changed=replaced||next.revision!==world.revision||next.paused!==world.paused||refreshPending;
        if(!alive)return;latest(next);
        if(changed){if(!replaced&&interactionActive())refreshPending=true;else render();}
      }catch(e){if(alive){error=e.message;render();}}
      finally{busy--;if(pollFlight===flight)pollFlight=null;}
    })();
    await flight.promise;
  }
  const captionObserver=new document.defaultView.MutationObserver(placeSceneCaption);
  captionObserver.observe(document.body,{attributes:true,attributeFilter:['data-scene-controls']});
  timer=setInterval(poll,3000);render();document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-ready'));
  const poseTimer=setInterval(updatePoses,600);
  root.ownerDocument.defaultView.addEventListener('resize',resizeFamily);
  document.addEventListener('visibilitychange',holdPoses);reducedMotion?.addEventListener?.('change',holdPoses);poseLayout?.addEventListener?.('change',reframePoses);compactLayout?.addEventListener?.('change',reframeCompact);
  return ()=>{captionObserver.disconnect();const resultDialog=root.querySelector('.game-draw-result');if(resultDialog?.open)resultDialog.close();resultDialog?.remove();closeAdoptionDialog(false);encounterController?.destroy();encounterController=null;encounterRoot=null;document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-garden',{detail:{gardenId:null,worldId:world.worldId}}));ownerCleanup?.dispose();ownerCleanup=null;ownerEditor=null;closeResetDialog(false);document.removeEventListener('buncho-world-action',worldAction);disposeRelations();root.ownerDocument.defaultView.removeEventListener('storage',syncCarePreference);document.removeEventListener('click',unlockCareCapture,true);root.ownerDocument.defaultView.removeEventListener('pagehide',cancelCareEffects);alive=false;importRequest++;soundRequest++;cancelCareEffects();audio.close();clearInterval(timer);clearInterval(poseTimer);root.ownerDocument.defaultView.removeEventListener('resize',resizeFamily);document.removeEventListener('visibilitychange',holdPoses);reducedMotion?.removeEventListener?.('change',holdPoses);poseLayout?.removeEventListener?.('change',reframePoses);compactLayout?.removeEventListener?.('change',reframeCompact);channel?.close();store.close();root.querySelector('.game-bird-sheet')?.close();root.removeEventListener('cancel',sheetCancel,true);root.removeEventListener('keydown',menuKeydown);root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('change',change);root.removeEventListener('input',rememberDraft);root.removeEventListener('pointerdown',pointerStart);document.removeEventListener('pointerup',pointerEnd);document.removeEventListener('pointercancel',pointerEnd);clearTimeout(releaseTimer);pressedPointers.clear();drafts.clear();};
}


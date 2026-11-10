import {pairProposals,resolvePairProposal} from './engine.js';
import {allBirds,activateBird} from './world-birds.js';
import {GACHA_MACHINES,gachaMachine} from './gacha-machines.js';
import {mountGachaMotion,primeGachaAudio} from './gacha-motion.js';
import {careGuidance,cleaningGuidance} from './care-guidance.js';
import {friendCage} from './friend-cages.js';
import {renderPreservationBox} from './preservation-box.js';
import {renderConsultationLetter} from './consultation-letter.js';
import { renderDiaryPaper } from './diary-paper.js';
import { LIFE_MENU_ITEMS, renderLifeMenuIcon } from './life-menu-icons.js';
import {renderGameHelp} from './game-help.js';
import { createFeedbackTimer } from './game-feedback.js';
import {mountGardenRaptors} from './garden-raptor-controller.js';
import {renderRaptorNotice,updateRaptorNotice} from './garden-raptor-ui.js';
import {escapeGardenRaptor,raptorToken} from './garden-raptors.js';
import {getProtagonistId,getProtagonistBird,protagonistStatus,familySuccessorCandidates} from './protagonist.js';
import {renderLifeCarePanel,renderMemorialPanel,renderLifeSummary,renderProtagonistSummary} from './life-care-ui.js';
import {isAlive,lifeStatus} from './life-care.js';
import {encounterCageActors,renderEncounterCageGuest} from './encounter-ui.js';
import {mountEncounterPanel} from './encounter-controller.js';
import {encounterSystem,cageVisitorCount} from './encounters.js';
import { renderRelationshipMap, navigateRelationships, bindRelationshipNavigation } from './relationship-map.js';
import { suggestLegacyNumberedNames } from './bird-names.js';
import { familyLayout } from './family-layout.js';
import { chooseFamilyProtagonist, independenceCandidates, acceptIndependence, treatBird, hireCaretaker, honorBird, dismissHomeFriend, endHomeVisits, homeVisitsClosed, completeEncounterReward, meetGardenFriendReward, setAdoptionMode, resolveAdoption, economyToken, householdIncomeStatus, claimHouseholdIncome, claimAutomaticGift, buyOrdinaryFurniture, ordinaryFurnitureCatalog, SAVE_VERSION, createWorld, resetTemporaryState, resetFurniturePlacement, bumpRevision, advanceTo, advanceTicks, findBird, birdName, adoptBird, renameBird, talkToBird, relationshipLabel, eventText, parseSave, serializeWorld, validateWorld, ACTIONS, STAGES, LIMITS, TICK_MS, MAX_SAVE_BYTES, DECOR_SLOTS, DECOR_COLORS, DECOR_TIERS, decorLevel, decorOdds, decorDrawStatus, drawDecoration, equipDecoration, travelTo, fieldBirds, inviteFriend, feedBird, petBird, cleanGarden, getFullness, getCleanliness, collectDropping, careWindow, reconcileImportedCare } from './engine.js';

import { createCareAudio } from './care-audio.js';
import { openGameStore } from './game-store.js';
import { SPRITE_CONTACT } from './habitat-layout.js';
import { fieldPositions, furnitureSvg, furnitureSceneSvg, friendFurnishing, furnitureFormIndex, furnitureFormName } from './field-visuals.js';
import { poseGeometry, birdPose, createPoseClock, refreshPoseSubtrees } from './bird-poses.js';
export function formatGameAmount(value){return value>=100000000?`${Math.floor(value/10000000)/10}億`:value>=10000?`${Math.floor(value/1000)/10}万`:value.toLocaleString('ja-JP');}
const escape = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colorName = {white:'白文鳥',sakura:'桜文鳥',silver:'シルバー',cinnamon:'シナモン'};
const milestoneName = {welcome:'庭の暮らしが始まった',adopt:'庭に迎えられた',movein:'庭の仲間になった',pair:'つがいになった',egg:'家族の卵が生まれた',hatch:'家族の卵がかえった',grow:'家族が成長した',depart:'新しい庭へ旅立った'};
const homeName = {resident:'家族',visitor:'遊びに来たお友達',departed:'別の庭に暮らす仲間'};
// The saved protagonist remains the player after renaming or selecting another bird.
const homeRole = (world,bird) => bird.id===getProtagonistId(world)?'自分':bird.home==='resident'?'家族':'お友達';
const homeBadge = (role,name='') => {const self=role==='自分',family=role==='家族',label=self?`自分＝${name}`:role;return `<span class="game-home-role" data-home-role="${self?'self':family?'family':'friend'}" aria-hidden="true"><svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${self?'<path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L7.6 7Z"/>':family?'<path d="M2 9l8-6 8 6M4 8v9h12V8M8 17v-5h4v5"/>':'<path d="M4 15c-1-7 3-11 13-11 0 10-4 14-11 12M3 18L13 8"/>'}</svg><span class="game-home-role-label">${escape(label)}</span></span>`;};
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

/** Care-only illustrations match the garden finches. The room/pose atlas stays unchanged. */
export function gameCareBirdSvg(color='white',stage='adult') {
  const safeColor=Object.hasOwn(colorName,color)?color:'white';
  const safeStage=Object.hasOwn(STAGES,stage)?stage:'adult';
  if(safeStage==='egg')return gameBirdSvg(safeColor,safeStage);
  const asset=safeStage==='chick'?'chick':`${safeColor}-${safeStage}`;
  return `<span class="game-sprite game-care-illustration" data-stage="${safeStage}" data-color="${safeColor}" data-asset="care-illustrations/${asset}" data-art-style="finch-illustration" aria-hidden="true"><img src="${GAME_ART}care-illustrations/${asset}.webp" alt="" draggable="false" decoding="sync"></span>`;
}

export function careFloorOpacity(cleanliness) {
  const value = Number.isFinite(cleanliness) ? Math.max(0, Math.min(100, cleanliness)) : 100;
  return Math.min(.22, Math.max(0, (100 - value) / 100 * .22));
}
export async function mountGame(root, { birdSvg = gameBirdSvg, goArticle = () => {}, goArt = () => {}, audioFactory = createCareAudio, raptorRandom = Math.random, predatorRandom = Math.random } = {}) {
  let sheetOpen=false, sheetReturn=null, welcomeFocusKey=null;
  let adoptionDialogToken=null,adoptionBusy=false;
  let independenceDialogToken=null,independenceBusy=false;
  let successorDialogToken=null,successorBusy=false;
  let resetPending=false, resetWorldId=null, resetKind=null, resetStage=0, resetBackupAvailable=false;
  let decorFilter='all', decorTier='cozy';
  let machineChoice='house';try{const saved=localStorage.getItem('buncho.gacha-machine.v1');if(GACHA_MACHINES.some(m=>m.id===saved))machineChoice=saved;}catch{}
  let drawMotion=null,pendingGachaAudio=null;
  let decorSlot='perch', previewItem=null, drawResult=null, fieldPending=false, fieldViewRequest=0;
  let alive=true, store, world, panel='garden', selected='b1', message='', error='', busy=0, lastReply='', replyBird=null, timer, channel, importRequest=0;
  root.innerHTML='<div class="game-loading" role="status">文鳥たちの庭をひらいているよ…</div>';
  // Older false values were the old default, not proof of an explicit mute.
  // Keep the explicit device preference separate from interchangeable world saves.
  let explicitSound=null;
  try { const p=JSON.parse(localStorage.getItem('buncho.care-sound-choice.v1')||'null');if(p?.explicit===true&&typeof p.enabled==='boolean')explicitSound=p.enabled; } catch {}
  const feedbackTimer=createFeedbackTimer(()=>{
    message='';
    if(!alive||!root.isConnected)return;
    // Update only feedback nodes. Do not redraw or move a scrolled panel.
    if(!error)for(const node of root.querySelectorAll('.game-message,.game-overlay-message,.game-sheet-message,.game-name-feedback')){node.textContent='';node.hidden=true;}
  });
  function setMessage(text,options){message=text||'';feedbackTimer.set(message,options);}
  try { store=await openGameStore();world=await store.transact(w=>{advanceTo(w);const desired=explicitSound??true;if(w.settings.careSound!==desired){w.settings.careSound=desired;bumpRevision(w);}return w;}); } catch(e){store?.close();if(!root.isConnected)return()=>{};root.innerHTML=`<div role="alert"><h2>保存を開けませんでした</h2><p>${escape(e.message)}</p><p>いまの保存は削除していません。ほかのタブを閉じて、再読み込みしてください。</p></div>`;return()=>{};}
  if(!alive||!root.isConnected){store.close();return()=>{};}
  selected=getProtagonistId(world);
  if(world.encounters.raptor?.active)panel='outdoors';
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
  let birdSwipe=null,careRub=null,suppressSwipeClickUntil=0,familyZoom=1,familyZoomManual=false;
  function clearCareRub(){const rub=careRub;careRub=null;rub?.target.removeAttribute('data-rubbing');if(rub?.target.hasPointerCapture?.(rub.id))try{rub.target.releasePointerCapture(rub.id);}catch{}}
  const insideCareBird=(target,x,y)=>{const box=(target.querySelector('.game-sprite')||target).getBoundingClientRect();return x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom;};
  const careRubCurrent=rub=>alive&&rub.target.isConnected&&!rub.target.disabled&&rub.worldId===world.worldId&&rub.birdId===selected&&rub.generation===careGeneration&&sheetOpen;
  function moveCareRub(ev){
    const rub=careRub;if(!rub||ev.pointerId!==rub.id)return;
    if(!careRubCurrent(rub)){clearCareRub();return;}
    const inside=insideCareBird(rub.target,ev.clientX,ev.clientY);
    // Re-entry cannot count a large jump across the blank area. Sparse events
    // still count real travel, so slow devices do not depend on frame count.
    if(inside&&rub.inside)rub.distance+=Math.min(96,Math.hypot(ev.clientX-rub.x,ev.clientY-rub.y));
    else rub.distance=0;
    rub.x=ev.clientX;rub.y=ev.clientY;rub.inside=inside;
    if(inside){ev.preventDefault();rub.target.dataset.rubbing=rub.distance>=48?'ready':'active';}
    else rub.target.removeAttribute('data-rubbing');
  }
  function lostCareRub(ev){if(careRub?.id===ev.pointerId)clearCareRub();}
  function blurCareRub(){clearCareRub();pressedPointers.clear();birdSwipe=null;}
  function careRubKey(ev){if(ev.target.closest?.('[data-care-rub]')&&['Enter',' '].includes(ev.key)&&ev.repeat)ev.preventDefault();}

  const pointerStart=ev=>{
    pressedPointers.add(ev.pointerId);
    const surface=ev.target.closest?.('.game-profile,.game-bird-sheet,.game-bird-carousel');
    if(pressedPointers.size!==1){birdSwipe=null;clearCareRub();return;}
    const target=ev.target.closest?.('[data-care-rub]');
    if(target&&root.contains(target)&&!target.disabled&&sheetOpen&&ev.isPrimary!==false&&(ev.button===undefined||ev.button===0)&&!pendingCareIntent&&insideCareBird(target,ev.clientX,ev.clientY)){
      ev.preventDefault();birdSwipe=null;target.focus({preventScroll:true});
      careRub={target,id:ev.pointerId,x:ev.clientX,y:ev.clientY,distance:0,inside:true,worldId:world.worldId,birdId:selected,generation:careGeneration};
      target.dataset.rubbing='active';try{target.setPointerCapture?.(ev.pointerId);}catch{}return;
    }
    if(surface&&!ev.target.closest('button,input,select,textarea,a,summary,label')&&(ev.button===undefined||ev.button===0))birdSwipe={id:ev.pointerId,x:ev.clientX,y:ev.clientY,at:Date.now(),worldId:world.worldId,birdId:selected,surface};
  };
  const pointerEnd=ev=>{
    pressedPointers.delete(ev.pointerId);
    const rub=careRub;if(rub?.id===ev.pointerId){
      const complete=ev.type==='pointerup'&&rub.distance>=48&&rub.inside&&insideCareBird(rub.target,ev.clientX,ev.clientY)&&careRubCurrent(rub);
      clearCareRub();if(complete)void careAction(rub.target);
    }
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
  function cancelCareEffects() { clearCareRub();pendingCareIntent=null;careGeneration++;audio.cancel();clearTimeout(gestureTimer);careGesture=null;careFeedback=null;root.querySelectorAll('.game-care-cheer,.game-gem-reward').forEach(node=>node.remove()); }
  const latest = w => {
    const changedProtagonist=getProtagonistId(world)!==getProtagonistId(w),replacedWorld=world.worldId!==w.worldId;
    if(findBird(world,selected)?.name!==findBird(w,selected)?.name){lastReply='';replyBird=null;}
    if (world.worldId !== w.worldId) { if(!resetPending)closeResetDialog(false);sheetOpen=false;sheetReturn=null;poseClock.reset();drafts.clear();nameSuggestionOrigins.clear();previewItem=null;drawResult=null;lastReply='';replyBird=null;cancelCareEffects();soundRequest++;soundChoice=null; }
    world=w;
    if(changedProtagonist||replacedWorld){cancelCareEffects();selected=getProtagonistId(world);sheetOpen=false;sheetReturn=null;lastReply='';replyBird=null;}
    if(adoptionDialogToken&&(adoptionDialogToken.worldId!==w.worldId||w.adoption.pending?.birdId!==adoptionDialogToken.birdId))closeAdoptionDialog(false);
    if(independenceDialogToken&&(independenceDialogToken.worldId!==w.worldId||independenceDialogToken.revision!==w.revision))closeIndependenceDialog(false);
    if(successorDialogToken&&(successorDialogToken.worldId!==w.worldId||successorDialogToken.revision!==w.revision))closeSuccessorDialog(false);
    if(!findBird(world,selected)){cancelCareEffects();selected=getProtagonistId(world);}
    audio.setEnabled(careSoundEnabled());
  };
  audio.setEnabled(careSoundEnabled());
  async function mutate(fn, success='', guard=()=>true, {bump=true,advancePaused=true,advanceCurrent=true,renderAfter=true}={}) {
    if(!alive||!guard())return false;
    let committed=false;
    const expectedWorldId=world.worldId;
    busy++;error='';
    try { latest(await store.transact(w=>{if(!guard())return w;if(w.worldId!==expectedWorldId)throw new Error('別のタブで別の庭が読み込まれました。画面の更新を待ってから、もう一度選んでください。');if(advanceCurrent&&(!w.paused||advancePaused))advanceTo(w);const next=fn(w)||w;if(bump)bumpRevision(next);return next;})); committed=true;if(alive&&guard()){if(success)setMessage(success);channel?.postMessage({revision:world.revision});} }
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
    const copy={care:['状態をリセットしますか？家族・Gem・家具などは残ります。','戻すもの：おなか・元気は80、気分70・遊び60まで回復し、庭をきれいにします。既に高い値は下げません。','残るもの：家族・名前・卵・成長・関係・日記・Gem・家具・図鑑・お世話時刻・音の設定。'],furniture:['家具の配置だけ初期化しますか？','戻すもの：9種類の道具を最初の持ち物に付け替えます。','残るもの：所有家具・Gem・家族・状態・日記・図鑑・設定。'],all:['エド1羽から、最初から始めますか？','消えるもの：今の家族・名前・卵・成長・関係・日記・Gem・所有家具・配置・図鑑・進行。',`残るもの：サイトの観察ノート・音楽と音量・音と動きの設定。直前の庭は、${store.mode==='memory'?'この画面を閉じるまで':'このブラウザに'}1件バックアップします。`],restore:['リセット直前の庭に戻しますか？','今の庭を、保存された直前の家族・Gem・家具・進行に戻します。','サイトの観察ノート・音楽設定は変えません。']}[resetKind];
    if(!copy){dialog.innerHTML=`<h3 id="game-reset-title">何をリセットする？</h3><div class="game-reset-options"><button data-reset-kind="care">お世話の状態だけ回復</button><button data-reset-kind="furniture">家具の配置だけ初期化</button><button class="game-reset-danger" data-reset-kind="all">エド1羽から、最初から</button><button data-reset-kind="restore" ${resetBackupAvailable?'':'disabled'}>直前の庭を復元</button></div>`+cancel;}
    else{dialog.innerHTML=`<h3 id="game-reset-title">${resetKind==='all'&&resetStage===2?'最後の確認：今の家族と進行をリセットします。':copy[0]}</h3><p>${copy[1]}</p><p>${copy[2]}</p>${resetKind==='all'&&resetStage===2?'<p>エド1羽の新しい庭になります。続けますか？</p>':''}${cancel}<button data-game-action="reset-back">選び直す</button><button data-game-action="reset-confirm">${resetKind==='all'?(resetStage===2?'確認して、最初から始める':'内容を確認して次へ'):resetKind==='restore'?'直前の庭に戻す':'リセットする'}</button>`;}
    updateRaptorNotice(root,world);dialog.querySelector('[data-game-action="reset-cancel"]').focus({preventScroll:true});
  }
  function openResetDialog(){
    if(resetPending)return;let dialog=root.querySelector('.game-reset-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.className='game-reset-dialog';dialog.setAttribute('aria-labelledby','game-reset-title');root.querySelector('.game-app').append(dialog);}
    resetWorldId=world.worldId;resetKind=null;resetStage=0;resetBackupAvailable=false;resetDialogContent();dialog.showModal();updateRaptorNotice(root,world);dialog.querySelector('[autofocus]').focus({preventScroll:true});const expected=resetWorldId;store.hasResetBackup().then(available=>{if(!alive||resetWorldId!==expected||!dialog.open)return;resetBackupAvailable=available;const button=dialog.querySelector('[data-reset-kind=restore]');if(button)button.disabled=!available;}).catch(()=>{});
  }
  async function confirmStateReset(){
    const dialog=root.querySelector('.game-reset-dialog');if(!dialog?.open||resetPending||!resetKind||resetWorldId!==world.worldId)return;
    if(resetKind==='all'&&resetStage<2){resetStage=2;resetDialogContent();return;}
    const expected=resetWorldId,kind=resetKind;resetPending=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);cancelCareEffects();
    if(kind==='all'||kind==='restore'){
      busy++;error='';try{const next=await (kind==='all'?store.resetWorld(expected):store.restoreResetBackup(expected));if(alive){latest(next);selected=getProtagonistId(world);panel='settings';setMessage(kind==='all'?'エドとの新しい暮らしが始まったよ。':'直前の庭に戻ったよ。');channel?.postMessage({revision:world.revision});}}catch(e){if(alive)error=e.message||'保存できませんでした。今の庭はそのままです。';}finally{busy--;if(alive)render();}
    }else await mutate(w=>{if(w.worldId!==expected)throw new Error('庭が変わりました。もう一度確認してください。');(kind==='care'?resetTemporaryState:resetFurniturePlacement)(w);return w;},kind==='care'?'みんなの調子を整えたよ。':'最初の道具を飾ったよ。',()=>alive&&root.isConnected,{bump:false,advanceCurrent:false});
    resetPending=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);closeResetDialog();
  }
  function adoptionInvitation(){const request=world.adoption.pending,b=request&&findBird(world,request.birdId);return b?`<button class="game-adoption-invitation" data-adoption-open>${escape(b.name)}から相談 ♡</button>`:'';}
  function dismissDrawResult(){
    drawMotion?.destroy();drawMotion=null;pendingGachaAudio?.close()?.catch(()=>{});pendingGachaAudio=null;drawResult=null;
    const dialog=root.querySelector('.game-draw-result');
    if(dialog?.open)dialog.close();
    dialog?.remove();
    (root.querySelector('[data-decor-draw]:not(:disabled)')||root.querySelector('[data-decor-slot][aria-pressed=true]'))?.focus({preventScroll:true});
  }
  function syncDrawResult(){
    let dialog=root.querySelector('.game-draw-result');
    if(!drawResult||panel!=='decorate'){
      drawMotion?.destroy();drawMotion=null;
      if(dialog?.open)dialog.close();
      dialog?.remove();
      return;
    }
    if(dialog)return;
    dialog=document.createElement('dialog');
    dialog.className='game-draw-result';
    dialog.setAttribute('aria-labelledby','game-draw-result-title');
    dialog.innerHTML=`<strong id="game-draw-result-title">${drawResult.duplicate?'もう持っている色でした':'新しいお飾り！'}</strong><p>${escape(itemName(drawResult.item))}</p><p>${escape(drawResult.message)}</p><button type="button" data-draw-result-close autofocus>とじる</button>`;
    root.querySelector('.game-app').append(dialog);
    dialog.showModal();drawMotion=mountGachaMotion(dialog,{machineId:drawResult.machineId||'house',base:GAME_ART+'gacha/',getSound:()=>careSoundEnabled(),motion:world.settings.motion,audioContext:pendingGachaAudio});pendingGachaAudio=null;updateRaptorNotice(root,world);
    dialog.querySelector('[data-draw-result-close]').focus({preventScroll:true});
  }
  function closeAdoptionDialog(restore=true){const dialog=root.querySelector('.game-adoption-dialog');if(dialog?.open)dialog.close();adoptionDialogToken=null;if(restore)root.querySelector('[data-adoption-open]')?.focus({preventScroll:true});}
  function openAdoptionDialog(){
    const request=world.adoption.pending,b=request&&findBird(world,request.birdId);if(!b||adoptionBusy)return;
    let dialog=root.querySelector('.game-adoption-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.className='game-adoption-dialog';dialog.setAttribute('aria-labelledby','game-adoption-title');root.querySelector('.game-app').append(dialog);}
    adoptionDialogToken={...economyToken(world),birdId:b.id};dialog.innerHTML=renderConsultationLetter({
  kind:'adoption', title:`${b.name}と暮らす？`,
  letter:'このおうちの仲間に迎えます。今は友達のままでも、また遊びに来てくれるよ。',
  signature:b.name, trustedBirdMarkup:smallBird(b),
  changes:'「いっしょに暮らす」を選ぶと、このおうちの仲間に迎えます。「また遊ぼう」を選ぶと、今回のお迎えの相談を終えます。',
  remains:'「また遊ぼう」を選んだときは、お友達のままです。',
  warning:'「あとで決める」は、お迎えを決めずにこの相談を閉じます。',
  acceptLabel:'いっしょに暮らす'
});dialog.showModal();updateRaptorNotice(root,world);dialog.querySelector('[autofocus]').focus({preventScroll:true});
  }
  async function adoptionDecision(button){
    if(adoptionBusy||!adoptionDialogToken||button.disabled)return;const token={...adoptionDialogToken},dialog=root.querySelector('.game-adoption-dialog');adoptionBusy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);let result;
    try{const committed=await mutate(w=>{result=resolveAdoption(w,token.birdId,button.dataset.adoptionDecision,token);},'',()=>alive,{bump:false,advanceCurrent:false});if(committed){setMessage(result?.message||'');closeAdoptionDialog(false);render();root.querySelector('[data-game-open-menu]')?.focus({preventScroll:true});}else if(dialog.open)dialog.querySelector('[data-adoption-notice]').textContent=error;}
    finally{adoptionBusy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function independenceConsultations(){
    const count=allBirds(world).filter(b=>b.home==='resident').length;if(count<LIMITS.residents)return '';
    const groups=independenceCandidates(world),safeHome=world.field.place==='home'&&!world.encounters.garden.open&&!world.encounters.raptor?.active;
    return `<details class="game-independence" data-game-details="independence"><summary>家族の独立相談（今${count}羽）</summary><h4>これからの暮らしを相談しよう</h4><p>家族は今${count}羽。新しいお迎えや誕生は6羽までです。独立しても、名前・家系・思い出は残り、友達としてまた招けます。</p>${groups.length?`<div class="game-independence-choices">${groups.map(g=>`<button type="button" data-independence-open="${g.ids[0]}">${g.names.map(escape).join('と')}から独立の相談</button>`).join('')}</div>`:`<p>${safeHome?'今は相談できる成鳥がいないよ。成長や子育て、体調をゆっくり見守ろう。':'おうちに戻ってから相談しよう。'}</p>`}<p class="game-small">承諾するまで家族は独立しません。主人公とその伴侶、育児中・療養中の家族は残ります。</p></details>`;
  }
  function closeIndependenceDialog(restore=true){
    const token=independenceDialogToken,dialog=root.querySelector('.game-independence-dialog');if(dialog?.open)dialog.close();independenceDialogToken=null;
    if(restore&&alive){focusIndependence(token?.ids[0]);void poll();}
  }
  function focusIndependence(id){
    const button=root.querySelector(`[data-independence-open="${id}"]`),summary=root.querySelector('.game-independence>summary');
    const target=button?.closest('details')?.open?button:summary;
    if(target)target.focus({preventScroll:true});else focusPanel();
  }
  function openIndependenceDialog(id){
    if(busy||pollFlight||independenceBusy||panel!=='family')return;
    const group=independenceCandidates(world).find(g=>g.ids[0]===id);if(!group)return;
    let dialog=root.querySelector('.game-independence-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.className='game-independence-dialog';dialog.setAttribute('aria-labelledby','game-independence-title');root.querySelector('.game-app').append(dialog);}
    independenceDialogToken={...economyToken(world),ids:[...group.ids]};
    dialog.innerHTML=renderConsultationLetter({
  kind:'independence', title:`${group.names.join('と')}から独立の相談`,
  letter:`「${group.ids.length===2?'ふたりで':'新しい'}おうちで暮らしてみたいな。また遊びに来るね。」`,
  signature:group.names.join('と'),
  trustedBirdMarkup:group.ids.map(id=>smallBird(findBird(world,id))).join(''),
  changes:`${group.ids.length}羽が家族の枠を空け、別のおうちで暮らします。`,
  remains:'名前・血縁・つがい・日記・持ち物は消えません。',
  warning:'自動お迎えには戻らず、もう一度家族に迎えたいときは「紹介」から選べます。',
  acceptLabel:'相談を承諾して、見送る'
});
    dialog.showModal();dialog.querySelector('[autofocus]').focus();
  }
  async function independenceDecision(button){
    if(independenceBusy||!independenceDialogToken||button.disabled)return;
    const token={...independenceDialogToken,ids:[...independenceDialogToken.ids]},dialog=root.querySelector('.game-independence-dialog');independenceBusy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);let result;
    try{
      const committed=await mutate(w=>{result=acceptIndependence(w,token.ids,token);},'',()=>alive,{bump:false,advanceCurrent:false});
      if(committed){setMessage(result?.message||'');closeIndependenceDialog(false);render();focusPanel();}
      else if(dialog.open)dialog.querySelector('[data-independence-notice]').textContent=error;
    }finally{independenceBusy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function focusSuccessor(id){
    const target=root.querySelector(`[data-successor-open="${id}"]`);
    if(target&&!target.disabled)target.focus();else focusPanel();
  }
  function closeSuccessorDialog(restore=true){
    const token=successorDialogToken,dialog=root.querySelector('.game-successor-dialog');
    if(dialog?.open)dialog.close();successorDialogToken=null;
    if(restore&&alive){focusSuccessor(token?.birdId);void poll();}
  }
  function openSuccessorDialog(id){
    if(busy||pollFlight||successorBusy||!['health','memorial','family'].includes(panel))return;
    const candidate=familySuccessorCandidates(world).find(c=>c.bird.id===id&&!c.reason);if(!candidate)return;
    let dialog=root.querySelector('.game-successor-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.className='game-successor-dialog';dialog.setAttribute('aria-labelledby','game-successor-title');root.querySelector('.game-app').append(dialog);}
    successorDialogToken={...economyToken(world),fromId:getProtagonistId(world),birdId:id,panel};
    dialog.innerHTML=renderConsultationLetter({
  kind:'successor', title:`${candidate.bird.name}に物語を引き継ぐ？`,
  letter:`この家族を次の主人公にします。${candidate.bird.home!=='resident'?'同じ文鳥が、おうちに帰ってきます。':''}`,
  signature:candidate.bird.name, trustedBirdMarkup:smallBird(candidate.bird),
  changes:`この家族を次の主人公にします。${candidate.bird.home!=='resident'?'同じ文鳥が、おうちに帰ってきます。':''}`,
  remains:'先代のお墓、名前・血縁・つがい・日記・持ち物は残ります。GoldやGemsは使いません。',
  warning:'確認後は、この文鳥が旅立つまで主人公になります。',
  acceptLabel:`${candidate.bird.name}に引き継ぐ`
});
    dialog.showModal();dialog.querySelector('[autofocus]').focus();
  }
  async function successorDecision(button){
    if(successorBusy||!successorDialogToken||button.disabled)return;
    const token={...successorDialogToken},dialog=root.querySelector('.game-successor-dialog');successorBusy=true;
    dialog.querySelectorAll('button').forEach(b=>b.disabled=true);let result;
    try{
      const committed=await mutate(w=>{result=chooseFamilyProtagonist(w,token.birdId,token);},'',()=>alive,{bump:false,advanceCurrent:false});
      if(committed){setMessage(result?.message||'');closeSuccessorDialog(false);render();focusPanel();}
      else if(dialog.open)dialog.querySelector('[data-successor-notice]').textContent=error;
    }finally{successorBusy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function chosen(){return findBird(world,selected)||allBirds(world)[0];}
  const smallBird = b => `<span class="game-mini-bird">${birdSvg(b.color,b.stage,birdPose(b,{worldId:world.worldId,elapsed:0}))}</span>`;
  function birdButton(b, extra=''){return `<button class="game-bird-link" data-game-select="${b.id}">${smallBird(b)}<span>${escape(b.name)}<small>${colorName[b.color]} · ${STAGES[b.stage]} · ${isAlive(world,b)?homeName[b.home]:'思い出の庭の仲間'}</small></span>${extra}</button>`;}
  function soundControl() {
    return `<label class="game-check game-care-sound game-switch-card"><span class="game-switch-copy"><strong>ふれあいの音</strong><span id="game-care-sound-state">${careSoundEnabled()?'音を鳴らす':'音を鳴らさない'}</span></span><input id="game-care-sound-switch" type="checkbox" role="switch" aria-label="ふれあいの音" aria-describedby="game-care-sound-state" data-game-care-sound ${careSoundEnabled()?'checked':''}><span class="game-switch-track" aria-hidden="true"></span></label>`;
  }
  function careMessage(feedback){if(feedback.kind==='clean')return feedback.changed?'ぴかぴかになったよ。':'もうきれいだよ。';if(feedback.reason==='cooldown')return `${feedback.kind==='feed'?'さっき食べたところ。':'ひとやすみ。'}${world.paused?'再開すると、また遊べます。':'もう少ししたら、またね。'}`;if(feedback.reason==='full')return feedback.kind==='feed'?'いまは、おなかいっぱい。':'いまは、元気いっぱい。';return feedback.kind==='feed'?'もぐもぐ♪ ごちそうさま。':'ぴっ♪ うれしそう。';}
  function nextCareLabel(){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(careWindow(world.careSchedule.seenAt).nextAt));}
  function canTalk(b){return b.home!=='departed'&&['juvenile','adult'].includes(b.stage);}
  function carePortrait(b) {
    const eligible=b.home!=='departed'&&['juvenile','adult'].includes(b.stage);
    return `<div class="game-care-petting"><p id="game-care-pet-help" class="game-care-pet-help">${isAlive(world,b)&&eligible?(b.needs.energy>=100?'元気いっぱい。なでてふれ合えるよ。':'文鳥を指やマウスでやさしくこすって、なでよう'):'文鳥をそっと見守ろう'}</p><button id="game-care-pet" class="game-care-pet-bird" type="button" data-care-rub data-game-care="pet" data-care-bird-id="${b.id}" aria-label="${escape(b.name)}をなでる" aria-describedby="game-care-pet-help game-care-pet-keyboard" ${isAlive(world,b)&&canTalk(b)?'':'disabled'}>${gameCareBirdSvg(b.color,b.stage)}<span class="game-care-rub-note" aria-hidden="true">${careGesture?.birdId===b.id&&careGesture.kind==='pet'?'♪':''}</span></button><small id="game-care-pet-keyboard">キーボードでは文鳥を選び、Enter または Space</small></div>`;
  }
  function careControls(b) {
    const eligible=b.home!=='departed'&&['juvenile','adult'].includes(b.stage);
    const explanation=!isAlive(world,b)?'お墓でお線香とお祈りができます。名前と家族はずっと残ります。':b.home==='departed'?'別の庭に巣立った仲間です。思い出を見守ろう。':['egg','chick'].includes(b.stage)?'巣で育つ時間。お世話は親にまかせよう。':'';
    return `<section class="game-care" aria-label="${escape(b.name)}のお世話"><div class="game-fullness"><div class="game-care-meter"><div class="game-care-meter-heading"><span>おなか</span><output data-game-fullness>${Math.round(getFullness(world,b.id))} / 100</output></div><meter aria-label="おなか" min="0" max="100" value="${Math.round(getFullness(world,b.id))}">${Math.round(getFullness(world,b.id))} / 100</meter></div><div class="game-care-meter game-care-meter-energy"><div class="game-care-meter-heading"><span>元気</span><output data-game-energy>${Math.round(b.needs.energy)} / 100</output></div><meter aria-label="元気" min="0" max="100" value="${Math.round(b.needs.energy)}">${Math.round(b.needs.energy)} / 100</meter></div></div>${eligible&&(b.needs.food>=100||b.needs.energy>=100)?`<p class="game-small" data-next-care>次のお世話 ${nextCareLabel()}（日本時間）</p>`:''}<p class="game-care-guidance game-small" data-care-guidance data-guidance-bird="${b.id}">${escape(careGuidance(world,b.id))}</p><div class="game-care-actions"><button id="game-care-feed" type="button" data-game-care="feed" data-care-bird-id="${b.id}" ${eligible&&b.needs.food<100?'':'disabled'}>ごはん</button><button id="game-talk-call" type="button" data-game-talk="名前を呼ぶ" ${canTalk(b)?'':'disabled'}>名前を呼ぶ</button></div>${explanation?`<p id="game-care-explanation" class="game-small">${explanation}</p>`:''}${careFeedback&&careFeedback.birdId===b.id?`<p class="game-care-feedback" role="status">${escape(careMessage(careFeedback))}</p>`:''}</section>`;
  }
  function gardenCare() {
    const cleanliness=getCleanliness(world);
    return `<div class="game-garden-care" aria-label="おうちのおそうじ"><button type="button" data-game-care="clean">そうじ</button><meter aria-label="床のきれいさ" min="0" max="100" value="${cleanliness}" data-game-cleanliness>${cleanliness}</meter><output data-game-cleanliness-value>${cleanliness} / 100</output>${cleaningGuidance(world)?`<span class="game-clean-guidance">${escape(cleaningGuidance(world))}</span>`:''}${careFeedback?.kind==='clean'?`<span class="game-care-feedback" role="status">${escape(careMessage(careFeedback))}</span>`:''}</div>`;
  }
  function talkControls(b){return `<div class="game-talk"><div class="game-talk-choices">${['あそぼう','水浴びしよう','ともだちは？','おやすみ'].map((t,i)=>`<button id="game-talk-${i}" data-game-talk="${t}" ${canTalk(b)?'':'disabled'}>${t}</button>`).join('')}</div><form data-game-form="talk"><label class="game-sr-only" for="game-words">じゆうに話しかける</label><div class="game-input-row"><input id="game-words" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="words" maxlength="100" required ${canTalk(b)?'':'disabled'} placeholder="ことばをかける…"><button id="game-talk-send" ${canTalk(b)?'':'disabled'}>話す</button></div></form></div>`;}
  function switchableBirds(){return panel==='garden'?fieldBirds(world):allBirds(world).filter(b=>b.home!=='departed'||b.id===selected);}
  function birdSwitchControls(){const birds=switchableBirds(),index=birds.findIndex(b=>b.id===selected);return `<nav class="game-bird-switch" aria-label="文鳥を切り替える"><button type="button" data-bird-step="-1" aria-label="前の文鳥" ${birds.length<2?'disabled':''}>‹</button><span>${index+1} / ${birds.length}</span><button type="button" data-bird-step="1" aria-label="次の文鳥" ${birds.length<2?'disabled':''}>›</button></nav>`;}
  function switchBird(direction){const birds=switchableBirds();if(birds.length<2)return;const i=birds.findIndex(b=>b.id===selected);cancelCareEffects();fieldViewRequest++;selected=birds[(i+direction+birds.length)%birds.length].id;lastReply='';replyBird=null;setMessage('');error='';render();const heading=root.querySelector(sheetOpen?'#game-sheet-title':panel==='garden'?'.game-bird-carousel-face':'.game-profile h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  function friendGoodbye(b){
    if(world.field.place!=='home'||b.home!=='visitor'||b.id===getProtagonistId(world)||!isAlive(world,b))return '';
    return `<section class="game-friend-goodbye" aria-label="${escape(b.name)}のお見送り"><button type="button" data-home-goodbye="${b.id}" data-goodbye-world="${escape(world.worldId)}" data-goodbye-revision="${world.revision}" aria-label="${escape(b.name)}とお別れする。自分のおうちへ帰ってもらう">お別れする</button><p class="game-small">自分のおうちへ帰ります。友達の記録は残り、また招けます。</p></section>`;
  }
  function birdSheet(){
    const b=chosen();
    return `<header class="game-sheet-heading"><div>${carePortrait(b)}<div><h2 id="game-sheet-title">${escape(b.name)}</h2><p>${STAGES[b.stage]} · ${ACTIONS[b.action.kind]}</p></div></div><button id="game-sheet-close" type="button" data-game-close-bird aria-label="文鳥の操作をとじる">とじる</button></header>${birdSwitchControls()}${careGesture?.birdId===b.id?`<span class="game-sheet-cheer" aria-hidden="true">${careGesture.kind==='feed'?'もぐもぐ':'♪'}</span>`:''}${renderLifeSummary(world,b)}<button id="game-sheet-health" type="button" data-game-panel="${isAlive(world,b)?'health':'memorial'}">${isAlive(world,b)?'健康・病院・お留守番':'思い出の庭へ'}</button>${careControls(b)}${friendGoodbye(b)}${lastReply&&replyBird===b.id?`<p class="game-reply" role="status">${escape(lastReply)}</p>`:''}<details class="game-sheet-talk" data-game-details="sheet-talk"><summary>もっと話す</summary>${talkControls(b)}</details><footer class="game-sheet-footer"><button data-game-panel="settings">音・暮らしの設定</button><button type="button" data-game-panel="profile">${b.home==='visitor'?'名前・お迎え':'紹介・名前'}</button></footer>${error?`<p class="game-warning" role="alert">${escape(error)}</p>`:message?`<p class="game-sheet-message" role="status">${escape(message)}</p>`:''}`;
  }
  function openBirdSheet(birdId){fieldViewRequest++;cancelCareEffects();selected=birdId;sheetOpen=true;sheetReturn={birdId,worldId:world.worldId};lastReply='';setMessage('');render();}
  function closeBirdSheet(restore=true){
    const back=sheetReturn;sheetOpen=false;cancelCareEffects();root.querySelector('.game-panel-overlay')?.close();root.querySelector('.game-bird-sheet')?.close();
    render();if(restore&&back?.worldId===world.worldId){
      const generation=careGeneration,view=fieldViewRequest;
      const focusBack=(deferred=false)=>{if(!alive||sheetOpen||generation!==careGeneration||view!==fieldViewRequest||back.worldId!==world.worldId)return;const active=document.activeElement;if(deferred&&active?.isConnected&&active!==document.body&&active!==document.documentElement&&!active.closest('.game-bird-sheet'))return;const target=root.querySelector(`[data-garden-household="${back.birdId}"]`)||root.querySelector('.game-panel-overlay[open] [data-game-open-bird]')||root.querySelector(`[data-game-scene-select][data-bird-id="${back.birdId}"]`)||root.querySelector('#game-open-bird');target?.focus({preventScroll:true});};
      focusBack();root.ownerDocument.defaultView.requestAnimationFrame(()=>focusBack(true));
    }
  }
  function sheetCancel(ev){if(ev.target.matches('.game-successor-dialog')){ev.preventDefault();if(!successorBusy)closeSuccessorDialog();return;}if(ev.target.matches('.game-independence-dialog')){ev.preventDefault();if(!independenceBusy)closeIndependenceDialog();return;}if(ev.target.matches('.game-draw-result')){ev.preventDefault();dismissDrawResult();return;}if(ev.target.matches('.game-adoption-dialog')){ev.preventDefault();if(!adoptionBusy)closeAdoptionDialog();return;}if(ev.target.matches('.game-panel-overlay')){ev.preventDefault();closePanel();return;}if(ev.target.matches('.game-reset-dialog')){ev.preventDefault();if(!resetPending)closeResetDialog();return;}if(ev.target.matches('.game-bird-sheet')){ev.preventDefault();closeBirdSheet();}}
  async function returnRaptorHome(isCurrent=()=>true){
    if(!alive||!isCurrent())return false;
    const view=++fieldViewRequest,valid=()=>alive&&isCurrent()&&view===fieldViewRequest;
    cancelCareEffects();sheetOpen=false;closeResetDialog(false);closeAdoptionDialog(false);closeIndependenceDialog(false);drawResult=null;const draw=root.querySelector('.game-draw-result');if(draw?.open)draw.close();
    const committed=await mutate(w=>{if(w.encounters.raptor?.active)escapeGardenRaptor(w,raptorToken(w));travelTo(w,'home');encounterSystem.leaveGarden(w,{worldId:w.worldId,revision:w.revision});return w;},'おうちに戻ったよ。ここなら安心。',valid,{bump:false,advanceCurrent:false});
    if(committed&&valid()){panel='garden';render();updateRaptorNotice(root,world);root.querySelector('[data-game-open-bird]')?.focus({preventScroll:true});}return committed;
  }
  async function closePanel(){if(independenceBusy||successorBusy)return;closeIndependenceDialog(false);closeSuccessorDialog(false);if(world.encounters.raptor?.active){await returnRaptorHome();return;}fieldViewRequest++;if(['outdoors','notebook'].includes(panel)&&world.encounters.garden.open){const expected={worldId:world.worldId,revision:world.revision};await mutate(w=>{encounterSystem.leaveGarden(w,expected);},'',()=>alive,{bump:false,advanceCurrent:false});}sheetOpen=false;cancelCareEffects();panel='garden';render();root.querySelector('[data-game-open-menu]')?.focus({preventScroll:true});}
  // Match the existing close handler: dismiss an overlay or name its actual destination.
  function panelCloseText(){
    if(world.encounters.raptor?.active||panel==='outdoors'||panel==='notebook'&&world.encounters.garden.open)return 'おうちへ';
    return 'とじる';
  }
  function focusPanel(){const surface=root.querySelector('.game-panel-overlay[open] .game-panel')||root.querySelector('.game-panel');const heading=surface?.querySelector('h3')||surface;if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  const itemColor=item=>DECOR_COLORS.find(c=>c.id===item?.color)||DECOR_COLORS[0];
  const itemTier=item=>DECOR_TIERS.find(t=>t.id===item?.tier)||DECOR_TIERS[0];
  const itemArt=item=>furnitureSvg(item.slot,itemColor(item).hex,DECOR_TIERS.findIndex(t=>t.id===item.tier)+1);
  const itemName=item=>`${itemColor(item).label}の${furnitureFormName(item.slot,itemColor(item).hex)}・${itemTier(item).label}`;
  function fieldTitle(){return world.field.place==='park'?'みんなの文鳥公園':world.field.place==='friend'?`${birdName(world,world.field.hostId)}のおうち`:`${birdName(world,getProtagonistId(world))}たちのおうち`;}
  function fieldControls(){return `<nav class="game-field-nav" aria-label="文鳥のおでかけ"><button data-field-travel="home" data-game-panel="garden" aria-label="おうちへ" aria-pressed="${panel==='garden'&&world.field.place==='home'}">おうち</button><button data-game-panel="outdoors" aria-label="おにわへ遊びに行く" aria-pressed="${panel==='outdoors'}">おにわ</button><button data-game-panel="friends" aria-label="友だちのおうちへ" aria-pressed="${panel==='friends'||panel==='garden'&&world.field.place==='friend'}">友だち</button></nav><div class="game-play-actions"><button data-game-panel="decorate" aria-label="おうちを飾る" aria-pressed="${panel==='decorate'}"><span aria-hidden="true">✧</span> お飾りガチャ</button></div>`;}
  function secondaryMenu(){
    return `<details class="game-secondary-menu" data-game-details="navigation"><summary id="game-nav-summary">文鳥のこと・家族・記録</summary><div class="game-menu-heading"><strong>暮らしのメニュー</strong><button class="game-menu-close" data-game-close-menu aria-label="メニューをとじる">とじる</button></div>${householdIncome()}<nav class="game-tabs" aria-label="文鳥ぐらしのメニュー">${LIFE_MENU_ITEMS.map(([id,label])=>`<button id="game-menu-${id}" data-game-panel="${id}" aria-pressed="${panel===id}">${renderLifeMenuIcon(id)}<span>${label}</span></button>`).join('')}</nav></details>`;
  }
  function lifeNotice(){
    const sick=allBirds(world).filter(b=>b.home==='resident'&&lifeStatus(world,b)?.condition),dead=world.lifecycle.birds.filter(s=>s.death);
    if(!sick.length&&!dead.length)return '';
    // One compact header shortcut leaves room for the logo and scene controls.
    // Health takes priority; the memorial remains available from the menu.
    const urgent=sick.length>0,count=urgent?sick.length:dead.length,target=urgent?'health':'memorial',label=urgent?`${count}羽に体調の変化。病院へ`:`思い出の庭。${count}羽`;
    return `<div class="life-game-notice" role="status"><button type="button" data-game-panel="${target}" data-life-notice="${target}" aria-label="${label}" title="${label}"><span>${urgent?'病院へ':'思い出'}</span><small>${count}羽</small></button></div>`;
  }
  function welcomeCard(){
    const summary=world.offlineSummary;if(!summary||panel!=='garden')return '';
    const elapsed=summary.ticks<24?`${summary.ticks}時間`:`${Math.floor(summary.ticks/24)}日${summary.ticks%24?`と${summary.ticks%24}時間`:''}`;
    return `<section class="game-welcome" role="dialog" aria-modal="false" aria-labelledby="game-welcome-title"><strong id="game-welcome-title">おかえりなさい</strong><p>${summary.ticks?`留守のあいだに、庭の時間が${elapsed}進んだよ。`:'文鳥たちの様子を見てみよう。'}</p>${summary.newBirds?`<p>${summary.newBirds}羽との出会いがあったよ。</p>`:''}${summary.skipped?'<p>長いお休みのぶんは、ゆっくり待っていたよ。</p>':''}<button id="game-welcome-close" data-game-action="dismiss-welcome" aria-label="おかえりメッセージをとじる">とじる</button></section>`;
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
    const friends=allBirds(world).filter(b=>b.home!=='resident'&&b.stage==='adult'&&isAlive(world,b));
    const metFriends=allBirds(world).length>1||world.events.some(e=>['visit','revisit','adopt','movein'].includes(e.kind));
    return `<section class="game-friends"><div class="game-section-title"><div><p class="game-eyebrow">A LITTLE VISIT</p><h3>友達のおうち</h3></div></div><div class="game-friend-carousel-controls"><button data-friend-step="-1" aria-label="前の友達">‹</button><span>友達のおうちをめくる</span><button data-friend-step="1" aria-label="次の友達">›</button></div><div class="game-friend-houses" tabindex="0" aria-label="友達のおうち。横にスワイプして選ぶ">${friends.map(b=>`<article class="game-friend-house" data-friend-card="${b.id}"><div class="game-house-portrait"><img class="game-friend-cage-preview" src="${GAME_ART}${friendCage(world,b.id).file}" alt="${escape(friendCage(world,b.id).title)}の鳥かご" loading="lazy">${smallBird(b)}</div><h4>${escape(b.name)}のおうち</h4><p>${b.sex==='male'?'オス':'メス'} · ${colorName[b.color]}<br>${b.home==='visitor'?'いま、こちらのおうちに遊びに来ています':'また会える、なじみのお友達'}</p><div><button data-field-travel="friend" data-field-host="${b.id}">会いに行く</button><button data-field-invite="${b.id}" ${b.home==='visitor'?'disabled':''}>おうちに招く</button></div></article>`).join('')||`<div class="game-empty-home"><h4>${metFriends?'いま訪ねられる友達はいません':'友達が来るのを待とう'}</h4><p>${metFriends?'仲間たちは、このおうちで暮らしています。':'時間を動かすと、友達が訪ねてきます。'}</p><button data-game-panel="outdoors">庭へ</button><button data-field-travel="home">おうちへ</button></div>`}</div></section>`;
  }
  function decorationRoom(){
    const slot=DECOR_SLOTS.find(s=>s.id===decorSlot)||DECOR_SLOTS[0],owned=world.decor.inventory.filter(i=>i.slot===slot.id);
    const collection=DECOR_TIERS.flatMap(tier=>DECOR_COLORS.map(color=>({id:`${slot.id}-${color.id}-${tier.id}`,slot:slot.id,color:color.id,tier:tier.id})));
    const preview=collection.find(i=>i.id===previewItem)||world.decor.inventory.find(i=>i.id===world.decor.equipped[slot.id]);
    const previewOwned=owned.some(i=>i.id===preview.id),previewUnlocked=decorLevel(world)>=itemTier(preview).level,shopItem=ordinaryFurnitureCatalog(world).find(i=>i.id===preview.id);
    const machine=gachaMachine(machineChoice),drawStatus=decorDrawStatus(world,slot.id,machineChoice);
    const canDraw=!drawStatus.complete&&!fieldPending&&world.decor.points>=machine.cost&&decorLevel(world)>=machine.level&&world.decor.lastDrawTick!==world.tick;
    const drawProgress=drawStatus.complete?(drawStatus.nextTier?`いまの種類はコンプリート！ 次はLv.${drawStatus.nextTier.level}。`:'全24種類コンプリート！'):drawStatus.guaranteed?'次回は未所持確定！':`かぶり ${drawStatus.duplicateStreak} / 2。2回続くと次は未所持確定！`;
    const drawOdds=drawStatus.guaranteed?`新作確定の抽選：${drawStatus.probabilities.map(o=>`${DECOR_TIERS.find(t=>t.id===o.tierId).label} ${Math.round(o.probability*1000)/10}%`).join(' / ')}。解放済みの未所持だけを、通常の出現率に比例して抽選します。色の確率も所持状況によって変わります。`:`通常の抽選：色は8色それぞれ12.5%。仕上げは ${decorOdds(world,machineChoice).map(o=>`${DECOR_TIERS.find(t=>t.id===o.tierId).label} ${Math.round(o.probability*100)}%`).join(' / ')}。色と仕上げは別々に抽選します。`;
    return `<section class="game-decoration"><div class="game-section-title"><div><p class="game-eyebrow">MAKE ROOM FOR JOY</p><h3>お飾りガチャ</h3></div></div><div class="game-decor-intro"><p>お飾りガチャ</p>${wallet()}</div><fieldset class="game-gacha-machines"><legend>ガチャを選ぶ</legend>${GACHA_MACHINES.map(m=>`<button type="button" data-gacha-machine="${m.id}" aria-pressed="${machineChoice===m.id}" ${decorLevel(world)<m.level?'disabled':''}><img src="${GAME_ART}gacha/${m.image}" alt="" width="1199" height="1312" loading="lazy"><strong>${m.name}</strong><span>${m.cost} Gems${decorLevel(world)<m.level?` · Lv.${m.level}`:''}</span></button>`).join('')}</fieldset><div class="game-decor-slots" aria-label="9種類のお飾り">${DECOR_SLOTS.map(s=>`<button data-decor-slot="${s.id}" aria-pressed="${s.id===slot.id}">${furnitureSvg(s.id,'#b5c8ad')}<span>${s.label}</span></button>`).join('')}</div><div class="game-decor-workbench"><div class="game-decor-preview" data-preview-item="${preview.id}"><div class="game-room-preview"><picture><source media="(max-width:600px)" srcset="${GAME_ART}field-home-tall.webp"><img src="${GAME_ART}field-home-wide.webp" alt="道具を試しに置いたおうち" width="1600" height="1000"></picture>${sceneFurniture(preview,true)}</div><div class="game-item-art">${itemArt(preview)}</div><p>${escape(itemName(preview))}</p><small>${world.decor.equipped[slot.id]===preview.id?'使用中':previewOwned?'試着中':previewUnlocked?'いつか、おうちに':'Lv.'+itemTier(preview).level+'で出会える'}</small>${!previewOwned&&shopItem?`<button data-gold-buy="${preview.id}" data-economy-world="${escape(world.worldId)}" data-economy-revision="${world.revision}" ${world.economy.gold<shopItem.gold||economyPending?'disabled':''}>選んで迎える · ${shopItem.gold} Gold</button>`:''}${previewOwned&&world.decor.equipped[slot.id]!==preview.id?`<div><button data-decor-equip="${preview.id}">これでOK</button><button data-decor-cancel>やめる</button></div>`:''}</div><div class="game-decor-draw"><h4>${slot.label}のお飾りガチャ</h4><button class="game-draw-button" data-decor-draw="${slot.id}" ${canDraw?'':'disabled'}><svg class="game-gacha-icon" viewBox="0 0 80 86" aria-hidden="true" fill="none"><path d="M13 45h54l5 35H8z" fill="#fff9ef" stroke="currentColor" stroke-width="3"/><path d="M12 33a28 28 0 1 1 56 0v13H12z" fill="#fffdf7" stroke="currentColor" stroke-width="3"/><circle cx="27" cy="34" r="10" fill="#e2ecdf" stroke="currentColor" stroke-width="2"/><path d="M17 34h20" stroke="currentColor" stroke-width="2"/><circle cx="48" cy="25" r="10" fill="#f7e3b1" stroke="currentColor" stroke-width="2"/><path d="m39 29 18-8" stroke="currentColor" stroke-width="2"/><circle cx="53" cy="42" r="9" fill="#f5c9b8" stroke="currentColor" stroke-width="2"/><path d="M44 42h18" stroke="currentColor" stroke-width="2"/><circle cx="40" cy="59" r="8" fill="#75614f"/><path d="m35 63 10-8" stroke="#fffdf7" stroke-width="3" stroke-linecap="round"/><path d="M26 74h28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg><span class="game-gacha-label">${drawStatus.complete?'コンプリート！':drawStatus.guaranteed?'新しいお飾りを迎える':'ガチャをまわす'}</span><span class="game-gacha-cost">${drawStatus.complete?'Gems消費なし':'1回 · '+machine.cost+' Gems'}</span></button><p class="game-small" data-decor-guarantee="${drawStatus.complete?'complete':drawStatus.guaranteed?'ready':drawStatus.duplicateStreak}" role="status"><strong>${escape(drawProgress)}</strong>${drawStatus.complete?'':world.decor.lastDrawTick===world.tick?(world.paused?' 再開すると引けるよ。':' 次の時間にもう一度。'):world.decor.points<machine.cost?` ${machine.cost} Gemsを集めよう。`:''}</p><details data-game-details="draw-odds"><summary>確率・Gemsのしくみ</summary><p>Gemsだけで遊べます。お金・広告・購入はありません。選んだ${escape(machine.name)}は1回${machine.cost} Gems、同じお飾りは${machine.refund} Gems返却。持っているお飾りが同じカテゴリで2回続いたら、次は解放済みの未所持が必ず出ます。カテゴリを変えたり閉じたりしても回数は残り、新しいお飾りが出るとそのカテゴリの回数は0に戻ります。すべて持っているときはGemsを使いません。</p><p>${escape(drawOdds)}</p><p>Lv.1 ほっこり / Lv.3 とっておき / Lv.6 きらめき。家族の節目は入居10・つがい30・産卵25・孵化35・成長20 Gems。交流の贈り物とは別に加点します。自動の贈り物は日本時間で平日30、土日祝40 Gemsまで。タップで受け取り、最大40 Gemsを期限なく置いておけます。獲得合計80 Gemsごとにレベルアップ。ごはん6 Gems、なでる5 Gems、お話5 Gems。暮らしを確認し、家族のごはん・元気をいっぱいにして必要な掃除を終えると、家庭で日本時間1日30 Goldを受け取れます。飼育員のお世話も対象で、通院は条件ではありません。来なかった日のお取り置きはありません。Gemsのお世話報酬はこれまでどおりです。ふつうのお飾りは16 Goldで選べます。お世話は日本時間7時・17時・20時、土日祝は12時にも。おなか・元気がいっぱいになるまで遊べます。おなかいっぱいの後の落としものは、拾うと8 Gems。</p></details></div></div><div class="game-decor-filter" aria-label="所持品の表示"><button data-decor-filter="owned" aria-pressed="${decorFilter==='owned'}">持っている</button><button data-decor-filter="all" aria-pressed="${decorFilter==='all'}">すべて・24種類</button></div><div class="game-decor-tiers" aria-label="道具の仕上げ">${DECOR_TIERS.map(t=>`<button data-decor-tier="${t.id}" aria-pressed="${decorTier===t.id}">${t.label}<small>Lv.${t.level}</small></button>`).join('')}</div><h4 class="game-collection-heading">${slot.label}のコレクション <small>${owned.length} / 24</small></h4><div class="game-collection">${DECOR_TIERS.map(tier=>`<section class="game-collection-tier" ${tier.id===decorTier?'':'hidden'}><h5>${tier.label}<span>${decorLevel(world)>=tier.level?'出会えるお飾り':'Lv.'+tier.level+'のお楽しみ'}</span></h5><div class="game-owned-items">${collection.filter(item=>item.tier===tier.id).map(item=>{const has=owned.some(i=>i.id===item.id),locked=decorLevel(world)<tier.level;return `<button ${decorFilter==='owned'&&!has?'hidden':''} data-decor-preview="${item.id}" data-owned="${has}" data-locked="${locked}" aria-label="${itemName(item)}、${has?'持っている':locked?'Lv.'+tier.level+'で解放':'まだ持っていない'}" aria-pressed="${item.id===preview.id}">${itemArt(item)}<span>${escape(furnitureFormName(item.slot,itemColor(item).hex))}<small>${itemColor(item).label}</small><small>${world.decor.equipped[slot.id]===item.id?'使用中':has?'持っている':locked?'Lv.'+tier.level:'未入手'}</small></span></button>`;}).join('')}</div></section>`).join('')}</div></section>`;
  }
  async function fieldAction(button){
    if(fieldPending||button.disabled)return;
    fieldPending=true;button.disabled=true;if(button.dataset.decorDraw)pendingGachaAudio=primeGachaAudio(root.ownerDocument.defaultView,careSoundEnabled()&&world.settings.motion&&!reducedMotion?.matches);
    const expectedWorld=world.worldId,request=++fieldViewRequest;
    let feedback;
    try{
      const committed=await mutate(w=>{
        if(button.hasAttribute('data-field-travel')){if(button.dataset.fieldTravel==='home'&&w.encounters.raptor?.active)escapeGardenRaptor(w,raptorToken(w));if(w.encounters.garden.open)encounterSystem.leaveGarden(w,{worldId:w.worldId,revision:w.revision});feedback=travelTo(w,button.dataset.fieldTravel,button.dataset.fieldHost||null);}
        else if(button.dataset.fieldInvite)feedback=inviteFriend(w,button.dataset.fieldInvite);
        else if(button.dataset.decorDraw)feedback=drawDecoration(w,button.dataset.decorDraw,machineChoice);
        else feedback=equipDecoration(w,button.dataset.decorEquip);
      },'',()=>alive&&world.worldId===expectedWorld,{bump:false});
      if(committed&&feedback&&request===fieldViewRequest){setMessage(button.hasAttribute('data-field-travel')?'':feedback.message);if(button.hasAttribute('data-field-travel')){cancelCareEffects();panel='garden';previewItem=null;drawResult=null;}if(button.dataset.decorDraw&&feedback.changed){drawResult=feedback;decorTier=feedback.item?.tier||decorTier;previewItem=feedback.item.id;}if(button.dataset.decorEquip)previewItem=null;}
    }finally{if(!drawResult&&pendingGachaAudio){pendingGachaAudio.close()?.catch(()=>{});pendingGachaAudio=null;}fieldPending=false;if(alive){render();if(button.hasAttribute('data-field-travel')&&request===fieldViewRequest)focusPanel();}}
  }

  let economyPending=false;
  function pairConsultations(){return pairProposals(world).map(e=>`<section class="game-pair-consultation"><h4>新しいつがいの相談</h4><p>${e.ids.map(id=>escape(birdName(world,id))).join('と')}が、なかよくなったよ。これまでの家族と思い出も残ります。</p><button type="button" data-pair-decision="accept" data-pair-event="${e.id}">新しいつがいを見守る</button><button type="button" data-pair-decision="later" data-pair-event="${e.id}">今回は見守る</button></section>`).join('');}
  function householdIncome(){const status=householdIncomeStatus(world);return `<section class="game-household-income" aria-label="毎日のお世話のお礼"><div><strong>今日の暮らしと30 Gold</strong><p>${escape(status.message)}</p></div><button type="button" data-household-income data-economy-world="${escape(world.worldId)}" data-economy-revision="${world.revision}" ${!status.ready||economyPending?'disabled':''}>暮らしを確認して受け取る</button></section>`;}
  function automaticGift(){const gift=world.economy.pending;return (pairProposals(world).length?'<button class="game-pair-invitation" data-game-panel="family">新しいつがいの相談</button>':'')+(gift?`<button class="game-auto-gift" data-auto-gift="${escape(gift.id)}" data-economy-world="${escape(world.worldId)}" data-economy-revision="${world.revision}" aria-label="みんなからの贈り物 ${gift.amount} Gemsを受け取る">🎁 <span>${gift.amount} Gems</span></button>`:'');}
  async function economyAction(button){
    if(economyPending||button.disabled)return;economyPending=true;button.disabled=true;
    const token={worldId:button.dataset.economyWorld,revision:Number(button.dataset.economyRevision)};let result;
    try{const committed=await mutate(w=>{result=button.hasAttribute('data-household-income')?claimHouseholdIncome(w,token):button.dataset.autoGift?claimAutomaticGift(w,button.dataset.autoGift,token):buyOrdinaryFurniture(w,button.dataset.goldBuy,token);},'',()=>alive,{bump:false,advanceCurrent:false});
      if(committed&&result){setMessage(result.message||'');render();showGemReward(result.gemAward,undefined,result.goldAward);if(result.changed)root.querySelector(button.hasAttribute('data-household-income')?'.game-menu-close':button.dataset.autoGift?'[data-game-open-menu]':'[data-decor-preview="'+button.dataset.goldBuy+'"]')?.focus({preventScroll:true});}
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
    const home=world.field.place==='home',closing=home&&homeVisitsClosed(world)&&cageVisitorCount(world)===0;
    const icon=path=>`<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return `<nav class="game-bottom-dock" data-home-dock="${home}" aria-label="庭のあそび"><button data-game-panel="decorate" aria-pressed="${panel==='decorate'}">${icon('<path d="M5 12h22v15H5zM3 12l13-8 13 8M11 27v-9h10v9"/>')}<span>お飾り<br>ガチャ</span></button><button id="game-open-bird" data-game-open-bird>${icon('<path d="M24 10c-.2-3.3-2.5-5-5.5-5-3.7 0-6 3-6 6.5C9.5 13 7 16 6 19l-3 5 6-2c2 3 7 4 11 1 3-2 4.5-6 4-9m0-4 5 2-5 2zM12 24v4h-2m7-3v3h2"/><path d="M11 15c4-2 8 0 7 4-2 2-6 3-9 1"/><circle cx="20.5" cy="10" r="1" fill="currentColor" stroke="none"/>')}<span>ふれあう</span></button><button data-game-panel="family" aria-pressed="${panel==='family'}">${icon('<circle cx="10" cy="9" r="4"/><circle cx="23" cy="9" r="4"/><path d="M10 13v5h13v-5M16 18v5"/><circle cx="16" cy="27" r="3"/>')}<span>家族</span></button>${home?`<button type="button" id="game-home-close" data-home-close title="来客全員を見送り、翌日0時（日本時間）まで自動来訪をお休みします。家族や思い出は残ります。" ${closing?'disabled':''}>${icon('<path d="M9 25H5V5h17v10M10 5v20M14 21h14m-4-4 4 4-4 4"/>')}<span>今日はお開き</span></button>`:''}<button id="game-nav-open" data-game-open-menu>${icon('<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="24" cy="8" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="24" cy="16" r="2"/><circle cx="8" cy="24" r="2"/><circle cx="16" cy="24" r="2"/><circle cx="24" cy="24" r="2"/>')}<span>メニュー</span></button></nav>`;
  }
  function roomGeometry(kind){
    const win=root.ownerDocument.defaultView,width=win.innerWidth||390,height=Number.parseFloat(document.body.style.getPropertyValue('--game-viewport-height'))||win.innerHeight||844,ratio=kind==='tall'?.75:1.6;
    const planeWidth=Math.max(width,height*(world.field.place==='friend'?1.6:ratio)),planeHeight=Math.max(height,width/(world.field.place==='friend'?1.6:ratio)),top=Math.max(height-planeHeight,Math.min(0,height*.7-planeHeight*.79));
    return {width,height,planeWidth,planeHeight,top,left:(planeWidth-width)/2};
  }
  function visibleFieldPositions(birds,kind,place){
    const positions=fieldPositions(birds,place==='friend'?'wide':kind,place),g=roomGeometry(kind),fraction=g.width/g.planeWidth;
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
    const obstacles=[...root.querySelectorAll('.game-room-bird,.game-home-role,.finch-cage-guest>span,.game-scene-toolbar,.game-bottom-dock,.game-field-nav,.game-field-bar,.game-main>.game-heading,.game-auto-gift,.game-adoption-invitation'),document.querySelector('.game-scene-controls-toggle'),document.querySelector('.game-world-title')].filter(Boolean);
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
      const geometry=roomGeometry(kind),fraction=geometry.width/geometry.planeWidth;
      if(cageGuests.length<=2){
        const household=visibleFieldPositions(shown,kind,world.field.place);
        for(const b of shown)map.set(b.id,{...household.get(b.id),x:.5});
        cageGuests.forEach((guest,i)=>{const x=cageGuests.length===1?.75:i===0?.25:.75;map.set(guest.id,{...map.get(guest.id),x:(1-fraction)/2+x*fraction,y:.79});});
      }else{
        const columns=geometry.width>600?actors.length:4,rows=Math.ceil(actors.length/columns);
        actors.forEach((actor,i)=>{const row=Math.floor(i/columns),count=Math.min(columns,actors.length-row*columns),x=(i%columns+1)/(count+1),foot=rows===1?geometry.height*(geometry.width<=600&&geometry.height<=280 ? .57 : .68):geometry.height*.46+row*Math.max(90,geometry.height*.23);map.set(actor.id,{...map.get(actor.id),x:(1-fraction)/2+x*fraction,y:(Math.min(geometry.height-26,foot)-geometry.top)/geometry.planeHeight});});
      }
    }
    return `${fieldNavigation()}<div class="game-room" data-compact="${!!compactLayout?.matches}" data-many-guests="${cageGuests.length>2}" data-home-crowded="${world.field.place==='home'&&(actors.length>8||(compactLayout?.matches&&cageGuests.length>0))}" data-field="${world.field.place}" data-friend-cage="${world.field.place==='friend'?friendCage(world,world.field.hostId).id:''}" aria-label="${escape(fieldTitle())}。イラストのゲーム用風景です。">
      ${world.field.place==='friend'?`<picture class="game-habitat"><img src="${GAME_ART}${friendCage(world,world.field.hostId).file}" alt="" aria-hidden="true" width="1600" height="1000" decoding="async"></picture>`:`<picture class="game-habitat"><source media="(max-width: 600px)" srcset="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-tall.webp"><img src="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-wide.webp" alt="" aria-hidden="true" width="1600" height="1000" decoding="async"></picture>`}
      ${world.field.place==='home'?sceneFurniture():''}${gemCollectibles()}<span class="game-floor-soil" style="--care-soil-opacity:${careFloorOpacity(getCleanliness(world)).toFixed(3)}" aria-hidden="true"></span>
      ${shown.map(b=>{
        const pos=positions.get(b.id),mobile=mobilePositions.get(b.id),isSelected=b.id===selected;
        const pose=poseFor(b,globalThis.matchMedia?.('(max-width: 600px)').matches?mobilePositions:positions,shown);
        const style=`--bird-x:${(compactLayout?.matches&&!cageGuests.length?.5:pos.x)*100}%;--bird-y:${pos.y*100}%;--bird-width:${pos.width*100}%;--bird-depth:${Math.round(pos.y*100)};--bird-tall-x:${(compactLayout?.matches&&!cageGuests.length?.5:mobile.x)*100}%;--bird-tall-y:${mobile.y*100}%;--bird-tall-width:${mobile.width*100}%;--bird-tall-depth:${Math.round(mobile.y*100)};--foot-x:${SPRITE_CONTACT.x*100}%;--foot-y:${SPRITE_CONTACT.y*100}%`;
        const attrs=`class="game-room-bird ${isSelected?'is-selected':''} ${pos.interactive?'':'game-nestling'}" style="${style}" data-bird-id="${b.id}" data-anchor="${pos.id}" data-tall-anchor="${mobile.id}" data-action="${b.action.kind}"`;
        return pos.interactive?`<button ${attrs} type="button" data-game-select="${b.id}" data-game-scene-select aria-pressed="${isSelected}" aria-label="${escape(b.name)}、${homeRole(world,b)}、${STAGES[b.stage]}、${ACTIONS[b.action.kind]}">${birdSvg(b.color,b.stage,pose)}${homeBadge(homeRole(world,b),b.name)}${careGesture&&careGesture.birdId===b.id&&careGesture.worldId===world.worldId?'<span class="game-care-cheer" aria-hidden="true">♪</span>':''}</button>`:`<span ${attrs} aria-hidden="true">${birdSvg(b.color,b.stage,pose)}${homeBadge(homeRole(world,b),b.name)}</span>`;
      }).join('')}
      ${cageGuests.map(guest=>{const p=positions.get(guest.id),m=mobilePositions.get(guest.id);return renderEncounterCageGuest(guest.entry,{base:new URL('../',GAME_ART).href,style:`--bird-x:${p.x*100}%;--bird-y:${p.y*100}%;--bird-width:${p.width*100}%;--bird-depth:${Math.round(p.y*100)};--bird-tall-x:${m.x*100}%;--bird-tall-y:${m.y*100}%;--bird-tall-width:${m.width*100}%;--bird-tall-depth:${Math.round(m.y*100)};--foot-x:50%;--foot-y:100%`}).replace('</button>',`${homeBadge('お友達')}</button>`);}).join('')}

    </div>
    <div class="game-scene-toolbar"><div class="game-scene-picker game-bird-carousel" aria-label="スワイプで文鳥を選ぶ">${birdSwitchControls()}<div class="game-bird-carousel-face" data-bird-id="${current?.id||''}">${current?smallBird(current):''}<div><strong>${current?escape(current.name):''}</strong><small>${current?colorName[current.color]+'・'+STAGES[current.stage]:''}</small></div></div></div>${world.field.place==='home'?gardenCare():''}</div>${secondaryMenu()}${bottomDock()}`;
  }
  function profile() {
    const b=chosen(),nameSuggestion=suggestLegacyNumberedNames(world).find(item=>item.birdId===b.id),parentNames=b.parents.map(id=>birdName(world,id)),last=world.events.slice().reverse().find(e=>e.ids.includes(b.id));
    const personality=`${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}`;
    // A portrait identifies this bird even while its garden pose faces away.
    return `<section class="game-profile game-profile-card-screen">${birdSwitchControls()}<h2 class="game-profile-title">${escape(b.name)}の紹介</h2><p class="game-profile-subtitle">${colorName[b.color]} · ${b.sex==='female'?'メス':'オス'} · ${STAGES[b.stage]}</p><div class="game-profile-card"><div class="game-profile-heading"><span class="game-mini-bird game-profile-portrait">${birdSvg(b.color,b.stage,'left')}</span><div class="game-profile-identity"><h3>${escape(b.name)}</h3><p class="game-profile-now"><span>いま</span><strong>${isAlive(world,b)?escape(ACTIONS[b.action.kind]):'思い出の庭'}</strong></p><p class="game-profile-personality">${escape(personality)}</p></div></div><div class="game-profile-likes"><span>好きなこと</span><strong>${escape(b.preference)}</strong></div></div><div class="game-profile-actions"><button id="game-profile-open-bird" type="button" data-game-open-bird>ふれあう・話す</button><button data-game-art="${b.id}">記念カード</button></div><form class="game-name-form" data-game-form="rename"><label for="game-name">${b.home==='visitor'?'名前をつける':'名前'}</label><input id="game-name" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="name" maxlength="16" value="${escape(b.name)}" required><button type="submit">名前を保存</button>${nameSuggestion?`<button type="button" data-game-name-suggest="${b.id}" data-name-before="${escape(b.name)}" data-name-world="${escape(world.worldId)}">名前の候補を見る</button><button type="button" data-game-name-cancel="${b.id}">もとの名前</button>`:''}${b.home==='visitor'?'<button type="button" data-game-action="adopt">おうちに迎える</button>':''}</form>${friendGoodbye(b)}${['名前を保存しました。','新しい仲間を迎えたよ。'].includes(message)?`<p class="game-name-feedback" role="status">${message}</p>`:''}<details class="game-profile-details" data-game-details="profile-${b.id}"><summary>性格・家族・思い出</summary><dl class="game-facts"><div><dt>いま</dt><dd>${ACTIONS[b.action.kind]}</dd></div><div><dt>好きなこと</dt><dd>${b.preference}</dd></div><div><dt>性格</dt><dd>${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}</dd></div><div><dt>家族</dt><dd>${b.partner?`つがい：${escape(birdName(world,b.partner))}`:'つがいはまだいない'}${parentNames.length?`<br>親：${parentNames.map(escape).join(' と ')}`:''}</dd></div></dl><div class="game-meters">${[['気分',b.mood],['元気',b.needs.energy],['おなか',b.needs.food]].map(([label,value])=>`<label>${label}<meter min="0" max="100" value="${value}">${Math.round(value)}%</meter></label>`).join('')}</div>${last?`<p class="game-last-memory">${escape(eventText(world,last))}</p>`:''}${b.milestones.length?`<details class="game-milestones" data-game-details="milestones-${b.id}"><summary>ずっと覚えていること</summary><ul>${b.milestones.map(m=>`<li>${day(m.tick)}：${milestoneName[m.kind]}${m.otherId?`（${escape(birdName(world,m.otherId))}）`:''}</li>`).join('')}</ul></details>`:''}</details><div class="game-links"><button data-game-panel="relations">友達との関係</button><button data-game-panel="family">家族</button><button data-game-article="${b.action.kind==='bath'?'bathing':b.action.kind==='eat'?'food':'behavior'}">本当のしぐさを調べる</button></div><p class="game-profile-disclosure">名前や性格は、ゲームの中のものです。</p></section>`;
  }
  function relations() {
    const key=`${world.worldId}:${selected}`;if(relationshipFocusKey!==key){relationshipPage=0;relationshipFocusKey=key;}
    return renderRelationshipMap(world,selected,{page:relationshipPage,portrait:smallBird,label:relationshipLabel});
  }
  function family() {
    const graph=familyLayout(world,selected),focus=findBird(world,graph.focusId);if(!familyZoomManual&&root.clientWidth)familyZoom=Math.max(.9,Math.min(1,Math.round(root.clientWidth/Math.max(300,Math.min(graph.children.length,4)*140+40)*10)/10));
    return `${pairConsultations()}<section class="game-family-tree game-family-cards-a">${protagonistStatus(world).waiting==='no-child'?renderProtagonistSummary(world):''}${independenceConsultations()}<div class="game-family-heading"><h3>${escape(focus.name)}の家系図</h3></div><p class="game-family-legend"><span>━━ 親子</span><span>┄┄ つがい</span><small>左右に動かして、家族を見よう</small></p><div class="game-family-pan" tabindex="0" aria-label="家族の図。左右にスクロールできます"><div class="game-family-stage" style="width:${graph.width*familyZoom}px;height:${graph.height*familyZoom}px"><div class="game-family-canvas" style="width:${graph.width}px;height:${graph.height}px;transform:scale(${familyZoom})"><svg class="game-family-lines" width="${graph.width}" height="${graph.height}" viewBox="0 0 ${graph.width} ${graph.height}" aria-hidden="true">${graph.edges.map(e=>`<path class="family-edge-${e.kind}" d="${e.path}"/>`).join('')}</svg>${graph.nodes.map(n=>{const b=findBird(world,n.id);return `<button class="game-family-node ${n.role==='focus'?'is-focus':''}" data-family-focus="${b.id}" data-family-role="${n.role}" aria-pressed="${n.role==='focus'}" style="left:${n.x-graph.cardW/2}px;top:${n.y}px" aria-label="${escape(b.name)}、${STAGES[b.stage]}。この文鳥の家族を見る">${n.role==='focus'?'<span class="game-family-selected" aria-hidden="true">✓</span>':''}${smallBird(b)}<strong>${escape(b.name)}</strong><small>${colorName[b.color]}・${STAGES[b.stage]}</small></button>`;}).join('')}</div></div></div><div class="game-family-zoom" aria-label="家系図の大きさ"><button data-family-zoom="-1" aria-label="家系図を縮小" ${familyZoom<=.7?'disabled':''}>−</button><output>${Math.round(familyZoom*100)}%</output><button data-family-zoom="1" aria-label="家系図を拡大" ${familyZoom>=1.2?'disabled':''}>＋</button></div><div class="game-profile-actions"><button data-game-panel="profile">${escape(focus.name)}の紹介</button><button data-game-art="${focus.id}">家族の記念カード</button></div><details data-game-details="family-text"><summary>家族をことばで読む・みんなの名簿</summary><ul>${allBirds(world).map(b=>`<li><button data-family-focus="${b.id}">${escape(b.name)}</button>：${b.parents.length?'親 '+b.parents.map(id=>escape(birdName(world,id))).join(' と '):'庭の外から来た文鳥'}${b.partner?'／つがい '+escape(birdName(world,b.partner)):''}</li>`).join('')}</ul><p class="game-small">実線は血縁、点線はつがい。近い親せき同士はつがいになりません。</p></details></section>`;
  }
  function resizeFamily(){if(panel==='family'){render();centerFamily();}else if(panel==='garden'&&!interactionActive())render();}
  function centerFamily(){const pan=root.querySelector('.game-family-pan'),canvas=root.querySelector('.game-family-canvas');if(pan&&canvas)pan.scrollLeft=Math.max(0,parseFloat(canvas.style.width)*familyZoom/2-pan.clientWidth/2);}
  function diary() {
    return renderDiaryPaper(world, {portrait:b=>`<span class="game-mini-bird">${birdSvg(b.color,b.stage,'left')}</span>`});
  }
  function roster() {
    const current=chosen();
    // Identification portraits stay face-visible; everyday poses remain in the garden.
    const portrait=b=>`<span class="game-mini-bird">${birdSvg(b.color,b.stage,'left')}</span>`;
    const card=b=>`<button type="button" class="game-roster-card" data-game-select="${b.id}" aria-pressed="${b.id===selected}"><span class="game-roster-check" aria-hidden="true">${b.id===selected?'✓':''}</span>${portrait(b)}<strong>${escape(b.name)}</strong><small>${colorName[b.color]} · ${STAGES[b.stage]}</small><small class="game-roster-home">${isAlive(world,b)?homeName[b.home]:'思い出の庭の仲間'}</small></button>`;
    const group=home=>{
      const birds=allBirds(world).filter(b=>b.home===home);
      return `<section class="game-roster-group" data-roster-group="${home}" aria-labelledby="game-roster-${home}"><h4 id="game-roster-${home}"><span>${home==='resident'?'おうちの家族':homeName[home]}</span><span data-roster-count>${birds.length}羽</span></h4>${birds.length?`<div class="game-roster">${birds.map(card).join('')}</div>`:`<p class="game-roster-empty">まだいないよ。${home==='resident'?'名前も、家族も、ここに残っていきます。':'出会いは、これから。'}</p>`}${current?.home===home?`<p class="game-roster-current">✓ いま見ている子 ${escape(current.name)}</p>`:''}</section>`;
    };
    return `<section class="game-roster-catalog"><h3>みんなの名簿</h3><p class="game-roster-intro">名前を押すと、その子の紹介へ。</p>${['resident','visitor','departed'].map(group).join('')}<aside class="game-roster-note">${current?portrait(current):''}<p>少しずつ、にぎやかに。<br>名前も、家族も、<br>ここに残っていきます。</p></aside><details class="game-roster-capacity" data-game-details="roster-capacity"><summary>人数と名簿のしくみ</summary><p>家族は6羽、お友達の来訪は文鳥もほかの鳥も合わせて6羽まで。以前から7〜10羽の家族がいるおうちは、そのまま暮らせます。名簿は128羽まで残します。お迎え・誕生は家族6羽を上限に、新規来訪は名簿に空きがある間楽しめます。</p></details></section>`;
  }
  function settings() {return `<section class="game-settings game-switchbook"><h3 id="game-settings-title" tabindex="-1">暮らしの設定</h3><p class="game-settings-intro">いまの設定が、ひと目で。</p><div data-settings-music></div>${soundControl()}<label class="game-check game-motion-switch game-switch-card"><span class="game-switch-copy"><strong>文鳥の小さな動き</strong><span id="game-motion-state">${world.settings.motion?'動きを表示する':'動きを表示しない'}</span></span><input id="game-motion-switch" type="checkbox" role="switch" aria-label="文鳥の小さな動きを表示" aria-describedby="game-motion-state" data-game-motion ${world.settings.motion?'checked':''}><span class="game-switch-track" aria-hidden="true"></span></label><fieldset class="game-adoption-settings"><legend>友達のお迎え</legend><button id="game-adoption-ask" data-adoption-mode="ask" aria-pressed="${world.settings.adoptionMode==='ask'}"><span class="game-choice-check" aria-hidden="true">${world.settings.adoptionMode==='ask'?'✓':''}</span>そのつど選ぶ</button><button id="game-adoption-auto" data-adoption-mode="auto" aria-pressed="${world.settings.adoptionMode==='auto'}"><span class="game-choice-check" aria-hidden="true">${world.settings.adoptionMode==='auto'?'✓':''}</span>文鳥たちに任せる</button><small>友達の来訪はどちらでも続きます。独立した仲間や「また遊ぼう」を選んだ友達は、自動で家族にはなりません。</small></fieldset><details class="game-wallet-details" data-game-details="wallet"><summary>もちものの数</summary><p>Gems：${world.decor.points.toLocaleString('ja-JP')}<br>Gold：${world.economy.gold.toLocaleString('ja-JP')}</p></details><details class="game-settings-management" data-game-details="management"><summary>保存とリセット</summary>${renderPreservationBox()}<button type="button" data-game-action="export-growth-migration">成長更新前の保存を書き出す</button><button type="button" data-game-action="export-household-migration">Gold更新前の保存を書き出す</button><button type="button" data-game-action="export-migration">時刻更新前の保存を書き出す</button></details><p class="game-care-disclosure">合成音は架空のゲームの声です。実際のおもちの声ではありません。音をOFFにすると、再生中の音もすぐに止まります。</p><p class="game-settings-time" data-game-time-state>${world.paused?'時間は、一時停止中':'時間は、のんびり進行中'}</p><button data-game-action="pause">${world.paused?'時間を動かす':'時間を一時停止'}</button><details data-game-details="save-help"><summary>保存と時間のしくみ</summary><p>実際の1分がゲームの1時間、24分が1日です。新しい卵は産卵から約5時間36分で孵化し、孵化後約11時間12分で巣立ち、孵化後約3.5日で成鳥になって繁殖可能になります（実時間、一時停止中を除く）。更新前からいる卵・ひな・幼鳥は、それぞれ12・24・48分の従来の成長期間を維持します。現実の成長や繁殖の手順ではありません。</p><p>閉じている間も年齢と成長は進み、次に開いた時に反映します。留守中は新しい来客を増やしません。物語の時間は一時停止中に進みません。ただし、ごはんと通院の実時間の期限は、閉じている間や一時停止中も進みます。</p><p>複数のタブの更新は保存処理を一列にして、同じ時間を二重に進めません。保存形式は版${SAVE_VERSION}。検査できた以前の保存は、名前・家族・日記・Gem・お飾りを残して引き継ぎ、新しいお世話時刻と名前の情報を加えます。古い版の画面が開いたままなら、読み直してください。将来対応しない版は保存を変えずに拒否します。</p><p>色はゲームの表現として選ばれます。羽色の遺伝を再現するものではありません。</p></details>${new URLSearchParams(location.search).get('qa')==='1'?'<details data-game-details="qa"><summary>検証用（通常の遊びには不要）</summary><button data-game-action="qa-step">1000時間を検証する</button><p>世代・家系・上限の確認用です。先に保存を書き出してください。</p></details>':''}</section>`;}
  function help() {return renderGameHelp({holidayCoverageKnown:!careWindow(world.careSchedule.seenAt).coverageMessage});}
  function render() {
    if(panel!=='family'&&independenceDialogToken)closeIndependenceDialog(false);
    if(successorDialogToken&&panel!==successorDialogToken.panel)closeSuccessorDialog(false);
    // Keep an in-flight stroke attached when an earlier reply/audio timer or
    // unrelated refresh finishes. Navigation cancels the gesture first.
    if(careRub&&careRubCurrent(careRub)){refreshPending=true;return;}
    // A background refresh replaces the panel node. Keep the reader's place
    // only when the same panel remains open; navigation starts at the top.
    const oldPanelScroll=root.querySelector('.game-app')?.dataset.panel===panel
      ? root.querySelector('.game-panel-overlay[open] > .game-panel')?.scrollTop : undefined;
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
    const focusRoster=focusBird&&focus.classList.contains('game-roster-card');
    const panels={health:()=>renderLifeCarePanel(world,{birdSvg}),memorial:()=>renderMemorialPanel(world),outdoors:()=>'<div data-encounter-slot></div>',notebook:()=>'<div data-encounter-slot></div>',garden:()=>garden(),decorate:()=>decorationRoom(),friends:()=>friendRooms(),profile:()=>profile(),relations,family,diary,roster,settings,help};
    if(!root.querySelector('.game-main'))root.innerHTML='<div class="game-app"><div class="game-main"></div><dialog class="game-panel-overlay" aria-label="文鳥ぐらしの遊び"></dialog><dialog class="game-bird-sheet" aria-labelledby="game-sheet-title"></dialog></div>';
    root.querySelector('.game-app').dataset.panel=panel;
    root.querySelector('.game-main').inert=panel==='outdoors';
    root.querySelector('.game-app').dataset.careMotion=world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'on':'off';
    root.querySelector('.game-main').innerHTML=`<header class="game-heading"><div class="game-status"><span>${day(world.tick)}</span><span>${world.paused?'おやすみ中':'のんびり進行中'}</span><button data-game-action="pause">${world.paused?'つづける':'一時停止'}</button></div></header>${store.mode==='memory'?'<p class="game-warning" role="alert">このブラウザでは端末保存が使えません。いまのタブだけで遊べます。閉じる前に設定から保存ファイルを書き出してください。</p>':''}${panel==='garden'?renderRaptorNotice(world):''}${lifeNotice()}${automaticGift()}${adoptionInvitation()}${welcomeCard()}<p class="game-message ${error?'is-error':''}" role="status">${escape(error||message)}</p><div class="${panel==='garden'?'game-panel':'game-scene-base'}">${garden(panel!=='garden')}</div>${panel==='garden'?sceneCaption():''}`;
    const overlay=root.querySelector('.game-panel-overlay');
    overlay.setAttribute('aria-label','文鳥ぐらしの遊び');
    // Removing the host while replacing the overlay resets nested scroll offsets.
    const encounterScroll=encounterRoot?.scrollTop;
    const gardenSelectorScroll=encounterRoot?.querySelector('.finch-garden-selector')?.scrollLeft;
    if(panel!=='garden'){
      overlay.innerHTML=`${renderRaptorNotice(world)}<div class="game-overlay-head"><button data-game-close-panel>${panelCloseText()}</button></div><div class="game-panel">${error||message?`<p class="game-overlay-message" role="status">${escape(error||message)}</p>`:''}${panels[panel]()}</div>`;
      const fullScene=panel==='outdoors';if(overlay.open&&overlay.dataset.scene!==String(fullScene))overlay.close();overlay.dataset.scene=String(fullScene);if(!overlay.open){if(fullScene)overlay.show();else overlay.showModal();}
    }else{if(overlay.open)overlay.close();overlay.innerHTML='';}
    if(['outdoors','notebook'].includes(panel)){
      if(!encounterRoot){
        encounterRoot=document.createElement('div');encounterRoot.className='game-encounter-host';
        encounterController=mountEncounterPanel(encounterRoot,{initialMode:panel==='outdoors'?'garden':'notebook',getWorld:()=>world,getSelectedBirdId:()=>selected,onHouseholdBird:id=>openBirdSheet(id),meetFriend:(w,id,action,token)=>meetGardenFriendReward(w,id,action,token),completeEncounter:(w,id,action,token)=>completeEncounterReward(w,id,action,token),onReward:amount=>showGemReward(amount),onHome:returnRaptorHome,base:new URL('../',GAME_ART).href,transact:async (operation,options={})=>{
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
    syncDrawResult();
    document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-panel',{detail:panel}));
    const sheet=root.querySelector('.game-bird-sheet'),opening=sheetOpen&&!sheet.open;
    const oldSheetScroll=sheetOpen&&sheet.dataset.birdId===selected?sheet.scrollTop:0;
    if(sheetOpen){sheet.dataset.birdId=selected;sheet.innerHTML=renderRaptorNotice(world)+birdSheet();if(opening)sheet.showModal();}else{if(sheet.open)sheet.close();sheet.innerHTML='';delete sheet.dataset.birdId;}
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
    if(focusBird&&!sheetOpen){const el=root.querySelector(`${focusRoster?'.game-roster-catalog ':''}button[data-game-select="${focusBird}"]`);el?.focus({preventScroll:true});}
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
      setMessage('おうちが変わったよ。もう一度選んでね。');render();return null;
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
      if(!feedback.birdId&&feedback.kind!=='clean'&&feedback.message){setMessage(feedback.message);render();return;}
      careFeedback=feedback;setMessage('');
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
        if(!played&&canPlay()){setMessage('この端末では合成音を鳴らせませんでした。ことばの返事はそのまま楽しめます。');render();}
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
    if(ev.key==='Escape'&&root.querySelector('.game-successor-dialog[open]')){ev.preventDefault();if(!successorBusy)closeSuccessorDialog();return;}
    if(ev.key==='Escape'&&root.querySelector('.game-independence-dialog[open]')){ev.preventDefault();if(!independenceBusy)closeIndependenceDialog();return;}
    if(ev.key==='Escape'&&root.querySelector('.game-adoption-dialog[open]')){ev.preventDefault();if(!adoptionBusy)closeAdoptionDialog();return;}
    if(ev.key==='Escape'&&root.querySelector('.game-reset-dialog[open]')){ev.preventDefault();if(!resetPending)closeResetDialog();return;}
    const sheet=root.querySelector('.game-reset-dialog[open],.game-adoption-dialog[open],.game-independence-dialog[open],.game-successor-dialog[open],.game-bird-sheet[open]');
    if(sheet&&ev.key==='Tab'){
      const controls=[...sheet.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]')].filter(el=>{
        if(el.disabled||el.tabIndex<0||!el.getClientRects().length||el.closest('[hidden],[inert]'))return false;
        for(let node=el.parentElement;node&&node!==sheet;node=node.parentElement){if(node.tagName==='DETAILS'&&!node.open){const summary=node.querySelector(':scope > summary');if(el!==summary&&!summary?.contains(el))return false;}}
        return true;
      });
      const index=controls.indexOf(document.activeElement);
      if(controls.length){ev.preventDefault();const next=index<0?(ev.shiftKey?controls.length-1:0):(index+(ev.shiftKey?-1:1)+controls.length)%controls.length;controls[next].focus();}
      return;
    }
    // WebKit can leave native Tab on an open summary when the first action
    // is below this scrollable dialog. Preserve that one forward DOM-order step.
    if(panel==='health'&&ev.key==='Tab'&&!ev.shiftKey&&!ev.altKey&&!ev.ctrlKey&&!ev.metaKey){
      const summary=ev.target.closest('.life-caretaker-fold[open] > summary');
      const hire=summary?.closest('.game-panel-overlay[open]')&&summary.parentElement.querySelector('.caretaker-recruitment button[data-life-hire]:not(:disabled)');
      if(hire&&!hire.closest('[hidden],[inert]')){ev.preventDefault();hire.focus();return;}
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
  let lifeBusy=false;
  async function lifeAction(button){
    if(lifeBusy||button.disabled)return;lifeBusy=true;button.disabled=true;
    const token=economyToken(world),at=Date.now();let result;
    try{const committed=await mutate(w=>{result=button.dataset.lifeTreat?treatBird(w,button.dataset.lifeTreat,token,at):button.dataset.lifeHire?hireCaretaker(w,Number(button.dataset.lifeHire),token,at):honorBird(w,button.dataset.lifeIncense||button.dataset.lifePray,button.dataset.lifeIncense?'incense':'prayer',token,at);},'',()=>alive,{bump:false,advanceCurrent:false});if(committed){setMessage(result?.message||'');render();}}
    finally{lifeBusy=false;if(button.isConnected)button.disabled=false;}
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
    if(button.hasAttribute('data-game-raptor-home')){await returnRaptorHome();return;}
    if(button.hasAttribute('data-home-goodbye')){
      if(button.disabled||busy||world.field.place!=='home')return;
      const birdId=button.dataset.homeGoodbye,token={worldId:button.dataset.goodbyeWorld,revision:Number(button.dataset.goodbyeRevision)},view=fieldViewRequest,inSheet=sheetOpen,sourcePanel=panel;
      button.disabled=true;cancelCareEffects();let result;
      const current=()=>alive&&view===fieldViewRequest&&selected===birdId&&sheetOpen===inSheet&&panel===sourcePanel;
      const committed=await mutate(w=>{result=dismissHomeFriend(w,birdId,token);},'',current,{bump:false,advanceCurrent:false,renderAfter:false});
      if(alive&&current()){
        if(committed&&result?.changed){sheetOpen=false;sheetReturn=null;panel='garden';selected=getProtagonistId(world);fieldViewRequest++;}
        if(committed&&result)setMessage(result.message);render();
        if(committed&&result?.changed)(root.querySelector(`[data-game-scene-select][data-bird-id="${selected}"]`)||root.querySelector('#game-open-bird'))?.focus({preventScroll:true});
      }
      return;
    }
    if(button.hasAttribute('data-home-close')){
      if(button.disabled||panel!=='garden'||world.field.place!=='home')return;
      button.disabled=true;cancelCareEffects();const token=economyToken(world),view=fieldViewRequest;let result;
      const committed=await mutate(w=>{result=endHomeVisits(w,token);},'',()=>alive&&panel==='garden'&&view===fieldViewRequest,{bump:false,advanceCurrent:false});
      if(committed&&result&&alive&&view===fieldViewRequest){setMessage(result.message);render();(root.querySelector('#game-home-close:not(:disabled)')||root.querySelector('#game-open-bird'))?.focus({preventScroll:true});}return;
    }
    if(button.matches('[data-life-treat],[data-life-hire],[data-life-incense],[data-life-pray]')){await lifeAction(button);return;}
    if(button.hasAttribute('data-draw-result-close')){dismissDrawResult();return;}
    if(button.dataset.successorOpen){openSuccessorDialog(button.dataset.successorOpen);return;}
    if(button.hasAttribute('data-successor-cancel')){if(!successorBusy)closeSuccessorDialog();return;}
    if(button.hasAttribute('data-successor-accept')){await successorDecision(button);return;}
    if(button.dataset.independenceOpen){openIndependenceDialog(button.dataset.independenceOpen);return;}
    if(button.hasAttribute('data-independence-cancel')){if(!independenceBusy)closeIndependenceDialog();return;}
    if(button.hasAttribute('data-independence-accept')){await independenceDecision(button);return;}
    if(button.hasAttribute('data-adoption-open')){openAdoptionDialog();return;}
    if(button.hasAttribute('data-adoption-cancel')){if(!adoptionBusy)closeAdoptionDialog();return;}
    if(button.dataset.adoptionDecision){await adoptionDecision(button);return;}
    if(button.dataset.adoptionMode){const token=economyToken(world);await mutate(w=>{setAdoptionMode(w,button.dataset.adoptionMode,token);},'',()=>alive,{bump:false,advanceCurrent:false});return;}
    if(button.dataset.friendStep){const track=root.querySelector('.game-friend-houses'),card=track?.querySelector('.game-friend-house');if(track&&card)track.scrollBy({left:Number(button.dataset.friendStep)*(card.getBoundingClientRect().width+16),behavior:reducedMotion?.matches?'instant':'smooth'});return;}
    if(button.dataset.familyFocus){cancelCareEffects();selected=button.dataset.familyFocus;familyZoomManual=false;render();centerFamily();root.querySelector('.game-family-node.is-focus')?.focus({preventScroll:true});return;}
    if(button.dataset.familyZoom){familyZoomManual=true;familyZoom=Math.max(.7,Math.min(1.2,Math.round((familyZoom+Number(button.dataset.familyZoom)*.1)*10)/10));render();centerFamily();return;}
    if(button.dataset.birdStep){switchBird(Number(button.dataset.birdStep));return;}
    if(button.dataset.gemCollect){await collectGem(button);return;}
    if(button.hasAttribute('data-household-income')||button.hasAttribute('data-auto-gift')||button.hasAttribute('data-gold-buy')){await economyAction(button);return;}
    if(button.hasAttribute('data-game-open-menu')){const menu=root.querySelector('.game-secondary-menu');menu.open=!menu.open;if(menu.open)menu.querySelector('button')?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-game-close-panel')){closePanel();return;}
    if(button.hasAttribute('data-game-close-bird')){closeBirdSheet();return;}
    if(button.hasAttribute('data-game-open-bird')){openBirdSheet(selected);return;}
    if(button.hasAttribute('data-game-close-menu')){closeGameMenu();return;}
    if(button.dataset.gamePanel==='garden'&&world.field.place==='home'){fieldViewRequest++;cancelCareEffects();panel='garden';render();}
    if(button.hasAttribute('data-field-travel')||button.dataset.fieldInvite||button.dataset.decorDraw||button.dataset.decorEquip){await fieldAction(button);return;}
    if(button.dataset.decorFilter){fieldViewRequest++;decorFilter=button.dataset.decorFilter;render();return;}
    if(button.dataset.decorTier){fieldViewRequest++;decorTier=button.dataset.decorTier;render();return;}
    if(button.dataset.gachaMachine){if(!fieldPending){const m=gachaMachine(button.dataset.gachaMachine);if(decorLevel(world)>=m.level){machineChoice=m.id;try{localStorage.setItem('buncho.gacha-machine.v1',m.id);}catch{}drawResult=null;drawMotion?.destroy();drawMotion=null;render();}}return;}
    if(button.dataset.decorSlot){fieldViewRequest++;decorSlot=button.dataset.decorSlot;previewItem=null;drawResult=null;setMessage('');render();return;}
    if(button.dataset.decorPreview){fieldViewRequest++;previewItem=button.dataset.decorPreview;setMessage('');render();return;}
    if(button.hasAttribute('data-decor-cancel')){fieldViewRequest++;previewItem=null;drawResult=null;render();return;}
    if(button.dataset.gameCare){if(button.hasAttribute('data-care-rub')&&ev.detail>0){ev.preventDefault();return;}await careAction(button);return;}
    if(button.dataset.gamePanel){if(button.dataset.gamePanel==='owner')return;const menu=root.querySelector('.game-secondary-menu');if(menu)menu.open=false;sheetOpen=false;fieldViewRequest++;cancelCareEffects();panel=button.dataset.gamePanel;setMessage('');render();focusPanel();if(panel==='family')centerFamily();return;}
    if(button.hasAttribute('data-cage-guest')){const id=button.dataset.cageGuest;panel='notebook';render();encounterController?.entry(id);return;}
    if(button.dataset.gameSelect&&button.hasAttribute('data-game-scene-select')){openBirdSheet(button.dataset.gameSelect);return;}
    if(button.dataset.gameSelect){sheetOpen=false;fieldViewRequest++;cancelCareEffects();selected=button.dataset.gameSelect;panel='profile';lastReply='';render();focusPanel();if(panel==='family')centerFamily();return;}
    if(button.dataset.gameArticle){cancelCareEffects();goArticle(button.dataset.gameArticle);return;}
    if(button.dataset.gameArt){cancelCareEffects();const b=findBird(world,button.dataset.gameArt);if(b)goArt(artPayload(b));return;}
    if(button.dataset.gameEventArt){cancelCareEffects();const e=[...(world.journal||[]),...world.events].find(e=>e.id===button.dataset.gameEventArt);if(e)goArt(artPayload(findBird(world,e.ids[0]),e));return;}
    if(button.dataset.pairDecision){let result;await mutate(w=>{result=resolvePairProposal(w,button.dataset.pairEvent,button.dataset.pairDecision==='accept',economyToken(w));return w;},'',undefined,{bump:false});if(result?.changed){setMessage(result.message);render();}return;}
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
    if(action==='export-migration'||action==='export-household-migration'||action==='export-growth-migration'){try{const growth=action==='export-growth-migration',household=action==='export-household-migration',saved=await store.migrationBackup(growth?13:household?12:11);if(!saved){setMessage('更新前の保存はありません。');render();return;}const url=URL.createObjectURL(new Blob([JSON.stringify(saved)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=growth?'buncho-before-growth-update.json':household?'buncho-before-household-gold.json':'buncho-before-clock-update.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){error=e.message;render();}return;}
    if(action==='export') {try{const current=await store.transact(w=>advanceTo(w));if(!alive||!root.isConnected)return;latest(current);const blob=new Blob([serializeWorld(current)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`buncho-garden-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setMessage('保存ファイルを書き出しました。');render();}catch(e){if(alive){error=e.message;render();}}}
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
  async function change(ev){if(ev.target.matches('[data-game-care-sound]')){await changeCareSound(ev.target.checked);return;}if(ev.target.matches('[data-game-choose], [data-game-scene-choose]')){cancelCareEffects();selected=ev.target.value;render();}if(ev.target.matches('[data-game-motion]'))await mutate(w=>{w.settings.motion=ev.target.checked;});if(ev.target.id==='game-import'&&ev.target.files?.[0]){cancelCareEffects();const file=ev.target.files[0],request=++importRequest;const currentRequest=()=>alive&&root.isConnected&&request===importRequest;try{if(file.size>MAX_SAVE_BYTES)throw new Error('64MB以下の保存ファイルを選んでね。');const text=await file.text();if(!currentRequest())return;const imported=parseSave(text);if(!confirm(`「${getProtagonistBird(imported)?.name||imported.birds[0].name}」の庭（${allBirds(imported).length}羽）を読み込み、今の庭と入れ替えますか？`)){ev.target.value='';return;}const now=Date.now();if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw new Error('端末の日時を確認してから、もう一度読み込んでください。');const expectedWorld=world.worldId;busy++;try{const replacement=await store.replaceWorld(expectedWorld,imported,now,{guard:currentRequest});if(currentRequest()){latest(replacement);setMessage('保存ファイルから庭を復元しました。');channel?.postMessage({revision:world.revision});render();}}finally{busy--;}}catch(e){if(!currentRequest())return;error=`読み込めませんでした。今の保存はそのままです。 ${e.message}`;render();}}}
  const worldAction=event=>{if(!alive||!root.isConnected||!['settings','help','music'].includes(event.detail))return;sheetOpen=false;fieldViewRequest++;cancelCareEffects();panel=event.detail==='music'?'settings':event.detail;setMessage('');render();focusPanel();};
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
  root.addEventListener('cancel',sheetCancel,true);root.addEventListener('keydown',menuKeydown);root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('change',change);root.addEventListener('input',rememberDraft);root.addEventListener('pointerdown',pointerStart);root.addEventListener('keydown',careRubKey);root.addEventListener('lostpointercapture',lostCareRub);root.ownerDocument.defaultView.addEventListener('blur',blurCareRub);document.addEventListener('pointermove',moveCareRub,{passive:false});document.addEventListener('pointerup',pointerEnd);document.addEventListener('pointercancel',pointerEnd);
  if(globalThis.BroadcastChannel){channel=new BroadcastChannel('buncho-garden-updates');channel.onmessage=()=>poll();}
  async function poll(){
    if(!alive||busy||document.hidden)return;
    busy++;const flight={before:null,after:null,promise:null};pollFlight=flight;
    flight.promise=(async()=>{
      try{
        const next=await store.transact(w=>{flight.before=economyToken(w);return independenceDialogToken||successorDialogToken?w:advanceTo(w);});
        flight.after=economyToken(next);
        const replaced=next.worldId!==world.worldId,changed=replaced||next.revision!==world.revision||next.paused!==world.paused||refreshPending;
        if(!alive)return;const consentId=independenceDialogToken?.ids[0],successorId=successorDialogToken?.birdId;latest(next);
        if(changed){if(!replaced&&interactionActive())refreshPending=true;else{render();if(consentId&&!independenceDialogToken)focusIndependence(consentId);if(successorId&&!successorDialogToken)focusSuccessor(successorId);}}
      }catch(e){if(alive){error=e.message;render();}}
      finally{busy--;if(pollFlight===flight)pollFlight=null;}
    })();
    await flight.promise;
  }
  const captionObserver=new document.defaultView.MutationObserver(placeSceneCaption);
  captionObserver.observe(document.body,{attributes:true,attributeFilter:['data-scene-controls']});
  timer=setInterval(poll,3000);render();document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-ready'));
  const raptorController=mountGardenRaptors(root,{getWorld:()=>world,random:raptorRandom,predatorRandom,canStartCrowWarning:()=>encounterController?.canStartCrowWarning()||false,startCrowWarning:id=>encounterController?.startCrowWarning(id)||false,isAvailable:()=>!busy,hasCrowPending:()=>encounterController?.hasCrowPending()||false,transact:async operation=>{
    const committed=await mutate(operation,'',()=>alive,{bump:false,advanceCurrent:false,renderAfter:false});if(!committed)throw new Error('保存できませんでした。');return world;
  },onChange:({result,structural,error:raptorError})=>{
    if(raptorError){error='猛禽との記録を保存できませんでした。残り時間と保存を保持しています。おうちへ戻ってもう一度試してください。';render();return;}
    if(structural){if(result?.deathBirdId){panel='memorial';setMessage('主人公が事故で旅立ちました。思い出の庭にお墓を残しています。',{persistent:true});}render();}updateRaptorNotice(root,world);
  }});
  const poseTimer=setInterval(updatePoses,600);
  root.ownerDocument.defaultView.addEventListener('resize',resizeFamily);
  document.addEventListener('visibilitychange',holdPoses);reducedMotion?.addEventListener?.('change',holdPoses);poseLayout?.addEventListener?.('change',reframePoses);compactLayout?.addEventListener?.('change',reframeCompact);
  return ()=>{pendingGachaAudio?.close()?.catch(()=>{});drawMotion?.destroy();feedbackTimer.destroy();raptorController.destroy();captionObserver.disconnect();const resultDialog=root.querySelector('.game-draw-result');if(resultDialog?.open)resultDialog.close();resultDialog?.remove();closeAdoptionDialog(false);closeIndependenceDialog(false);closeSuccessorDialog(false);encounterController?.destroy();encounterController=null;encounterRoot=null;document.dispatchEvent(new document.defaultView.CustomEvent('buncho-game-garden',{detail:{gardenId:null,worldId:world.worldId}}));closeResetDialog(false);document.removeEventListener('buncho-world-action',worldAction);disposeRelations();root.ownerDocument.defaultView.removeEventListener('storage',syncCarePreference);document.removeEventListener('click',unlockCareCapture,true);root.ownerDocument.defaultView.removeEventListener('pagehide',cancelCareEffects);alive=false;importRequest++;soundRequest++;cancelCareEffects();audio.close();clearInterval(timer);clearInterval(poseTimer);root.ownerDocument.defaultView.removeEventListener('resize',resizeFamily);document.removeEventListener('visibilitychange',holdPoses);reducedMotion?.removeEventListener?.('change',holdPoses);poseLayout?.removeEventListener?.('change',reframePoses);compactLayout?.removeEventListener?.('change',reframeCompact);channel?.close();store.close();root.querySelector('.game-bird-sheet')?.close();root.removeEventListener('cancel',sheetCancel,true);root.removeEventListener('keydown',menuKeydown);root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('change',change);root.removeEventListener('input',rememberDraft);root.removeEventListener('pointerdown',pointerStart);root.removeEventListener('keydown',careRubKey);root.removeEventListener('lostpointercapture',lostCareRub);root.ownerDocument.defaultView.removeEventListener('blur',blurCareRub);document.removeEventListener('pointermove',moveCareRub);document.removeEventListener('pointerup',pointerEnd);document.removeEventListener('pointercancel',pointerEnd);clearTimeout(releaseTimer);pressedPointers.clear();drafts.clear();};
}


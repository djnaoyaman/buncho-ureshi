import { createWorld, bumpRevision, advanceTo, advanceTicks, findBird, birdName, adoptBird, renameBird, talkToBird, relationshipLabel, eventText, parseSave, serializeWorld, validateWorld, ACTIONS, STAGES, LIMITS, TICK_MS, MAX_SAVE_BYTES, DECOR_SLOTS, DECOR_COLORS, DECOR_TIERS, DECOR_DRAW_COST, decorLevel, decorOdds, drawDecoration, equipDecoration, travelTo, fieldBirds, inviteFriend, feedBird, petBird, cleanGarden, getFullness, getCleanliness } from './engine.js';

import { createCareAudio } from './care-audio.js';
import { openGameStore } from './game-store.js';
import { SPRITE_CONTACT } from './habitat-layout.js';
import { fieldPositions, furnitureSvg, furnitureSceneSvg, friendFurnishing } from './field-visuals.js';
import { poseGeometry, birdPose, createPoseClock, refreshPoseSubtrees } from './bird-poses.js';
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
  let decorSlot='perch', previewItem=null, drawResult=null, fieldPending=false, fieldViewRequest=0;
  let alive=true, store, world, panel='garden', selected='b1', message='', error='', busy=0, lastReply='', replyBird=null, timer, channel, importRequest=0;
  root.innerHTML='<div class="game-loading" role="status">文鳥たちの庭をひらいているよ…</div>';
  try { store=await openGameStore();world=await store.transact(w=>advanceTo(w)); } catch(e){store?.close();if(!root.isConnected)return()=>{};root.innerHTML=`<div role="alert"><h2>保存を開けませんでした</h2><p>${escape(e.message)}</p><p>いまの保存は削除していません。ほかのタブを閉じて、再読み込みしてください。</p></div>`;return()=>{};}
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
  const pointerStart=ev=>{pressedPointers.add(ev.pointerId);};
  const pointerEnd=ev=>{
    pressedPointers.delete(ev.pointerId);
    clearTimeout(releaseTimer);
    // Native click/form submission follows pointerup; never replace its target
    // in the pointerup handler itself. Cancellation uses the same safe flush.
    releaseTimer=setTimeout(()=>{if(alive&&refreshPending&&!busy&&!interactionActive())render();},0);
  };
  const drafts = new Map();
  const draftKey = (birdId = selected) => `${world.worldId}:${birdId}`;
  function rememberDraft(ev) {
    const input = ev.target;
    if (!['game-name','game-words'].includes(input.id) || !root.contains(input)) return;
    const key = draftKey(), current = drafts.get(key) || {};
    current[input.id] = input.value;
    drafts.set(key,current);
  }
  const poseClock=createPoseClock(),reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),poseLayout=globalThis.matchMedia?.('(max-width: 600px)');
  const poseEnabled=()=>alive&&root.isConnected&&panel==='garden'&&!document.hidden&&world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!reducedMotion?.matches;
  const holdPoses=()=>poseClock.hold();
  const poseFor=(bird,positions,birds)=>birdPose(bird,{worldId:world.worldId,elapsed:poseClock.elapsed,positions,birds});
  function updatePoses(force=false){
    poseClock.advance(poseEnabled());if((!force&&!poseEnabled())||!alive||!root.isConnected||panel!=='garden')return;
    const birds=fieldBirds(world),positions=fieldPositions(birds,globalThis.matchMedia?.('(max-width: 600px)').matches?'tall':'wide',world.field.place);
    refreshPoseSubtrees(root,birds,bird=>poseFor(bird,positions,birds),birdSvg);
  }
  const reframePoses=()=>updatePoses(true);
  const audio = audioFactory();
  let careGeneration=0, soundRequest=0, soundChoice=null, careFeedback=null, careGesture=null, gestureTimer;
  const careSoundEnabled = () => soundChoice === null ? world.settings.careSound : soundChoice;
  function cancelCareEffects() { careGeneration++;audio.cancel();clearTimeout(gestureTimer);careGesture=null;careFeedback=null;root.querySelectorAll('.game-care-cheer').forEach(node=>node.remove()); }
  const latest = w => {
    if (world.worldId !== w.worldId) { poseClock.reset();drafts.clear();previewItem=null;drawResult=null;lastReply='';replyBird=null;cancelCareEffects();soundRequest++;soundChoice=null; }
    world=w;
    if(!findBird(world,selected)){cancelCareEffects();selected=world.birds[0].id;}
    audio.setEnabled(careSoundEnabled());
  };
  audio.setEnabled(careSoundEnabled());
  async function mutate(fn, success='', guard=()=>true, {bump=true,advancePaused=true}={}) {
    if(!alive||!guard())return false;
    let committed=false;
    const expectedWorldId=world.worldId;
    busy++;error='';
    try { latest(await store.transact(w=>{if(!guard())return w;if(w.worldId!==expectedWorldId)throw new Error('別のタブで別の庭が読み込まれました。画面の更新を待ってから、もう一度選んでください。');if(!w.paused||advancePaused)advanceTo(w);const next=fn(w)||w;if(bump)bumpRevision(next);return next;})); committed=true;if(alive&&guard()){if(success)message=success;channel?.postMessage({revision:world.revision});} }
    catch(e){error=e.message||'保存できませんでした。もう一度試してください。';}
    finally{busy--;if(alive)render();}
    return committed;
  }
  function chosen(){return findBird(world,selected)||world.birds[0];}
  const smallBird = b => `<span class="game-mini-bird">${birdSvg(b.color,b.stage,birdPose(b,{worldId:world.worldId,elapsed:0}))}</span>`;
  function birdButton(b, extra=''){return `<button class="game-bird-link" data-game-select="${b.id}">${smallBird(b)}<span>${escape(b.name)}<small>${STAGES[b.stage]} · ${homeName[b.home]}</small></span>${extra}</button>`;}
  function soundControl() {
    return `<label class="game-check game-care-sound"><input type="checkbox" data-game-care-sound ${careSoundEnabled()?'checked':''}> ふれあいの合成音を鳴らす（最初はOFF）</label><p class="game-small">音は「なでる」を押したときだけ。保存を開いたり、留守の時間を進めたりしても鳴りません。</p>`;
  }
  function careControls(b) {
    const eligible=b.home!=='departed'&&['juvenile','adult'].includes(b.stage);
    const explanation=b.home==='departed'?'別の庭に巣立った仲間です。ここからお世話はせず、思い出を見守ろう。':['egg','chick'].includes(b.stage)?'卵やひなは、巣で育つ時間です。ごはんやふれあいは親にまかせて、そっと見守ろう。':'ごはんは2ゲーム時間、ふれあいは1ゲーム時間あけてね。一時停止中は待ち時間も止まります。';
    return `<section class="game-care" aria-labelledby="game-care-title"><h4 id="game-care-title">${escape(b.name)}の、ゲームのお世話</h4><p class="game-fullness"><ruby>満腹<rt>まんぷく</rt></ruby>ぐあい <output data-game-fullness>${Math.round(getFullness(world,b.id))} / 100</output> <small>大きいほど、おなかいっぱい</small></p><div class="game-care-actions"><button type="button" data-game-care="feed" data-care-bird-id="${b.id}" aria-describedby="game-care-explanation" ${eligible?'':'disabled'}>ごはんをあげる</button><button type="button" data-game-care="pet" data-care-bird-id="${b.id}" aria-describedby="game-care-explanation" ${eligible?'':'disabled'}>なでる（ゲームのふれあい）</button></div><p id="game-care-explanation" class="game-small">${explanation}</p>${careFeedback&&careFeedback.birdId===b.id?`<p class="game-care-feedback" role="status">${escape(careFeedback.message)}</p>`:''}${soundControl()}<p class="game-care-disclosure">「なでる」は創作の遊びです。本物の文鳥は触れられるのを嫌がることがあります。無理に触らず、様子を見守ってください。音はこのゲーム用の合成音で、実際のおもちや文鳥の鳴き声ではありません。</p></section>`;
  }
  function gardenCare() {
    const cleanliness=getCleanliness(world);
    return `<section class="game-garden-care" aria-label="ゲームの床のおそうじ"><label>床のきれいさ <meter min="0" max="100" value="${cleanliness}" data-game-cleanliness>${cleanliness}</meter><output data-game-cleanliness-value>${cleanliness} / 100</output></label><button type="button" data-game-care="clean">床をそうじする（無料）</button><p class="game-small">うすい黄色はゲームだけの床の表現です。そうじしない日があっても、文鳥の体調や気持ちは悪くなりません。</p>${careFeedback?.kind==='clean'?`<p class="game-care-feedback" role="status">${escape(careFeedback.message)}</p>`:''}</section>`;
  }
  const itemColor=item=>DECOR_COLORS.find(c=>c.id===item?.color)||DECOR_COLORS[0];
  const itemTier=item=>DECOR_TIERS.find(t=>t.id===item?.tier)||DECOR_TIERS[0];
  const itemArt=item=>furnitureSvg(item.slot,itemColor(item).hex,DECOR_TIERS.findIndex(t=>t.id===item.tier)+1);
  const itemName=item=>`${itemColor(item).label}の${DECOR_SLOTS.find(s=>s.id===item.slot)?.label}・${itemTier(item).label}`;
  function fieldTitle(){return world.field.place==='park'?'みんなの文鳥公園':world.field.place==='friend'?`${birdName(world,world.field.hostId)}のお部屋`:'おもちたちの籠のおうち';}
  function fieldControls(){return `<nav class="game-field-nav" aria-label="文鳥のおでかけ"><button data-field-travel="home" data-game-panel="garden" aria-label="籠のおうちへ" aria-pressed="${panel==='garden'&&world.field.place==='home'}">おうち</button><button data-field-travel="park" aria-label="文鳥公園へ" aria-pressed="${panel==='garden'&&world.field.place==='park'}">公園</button><button data-game-panel="friends" aria-label="友達のお部屋へ" aria-pressed="${panel==='friends'||panel==='garden'&&world.field.place==='friend'}">友達</button><button data-game-panel="decorate" aria-label="お部屋を飾る" aria-pressed="${panel==='decorate'}">飾る</button></nav>`;}
  function secondaryMenu(){return `<details class="game-secondary-menu" data-game-details="navigation"><summary id="game-nav-summary">文鳥のこと・家族・記録</summary><nav class="game-tabs" aria-label="文鳥ぐらしのメニュー">${[['profile','文鳥の紹介'],['relations','関係図'],['family','家系図'],['diary','日記'],['roster','名簿'],['settings','保存・設定'],['help','あそびかた']].map(([id,label])=>`<button id="game-menu-${id}" data-game-panel="${id}" aria-pressed="${panel===id}">${label}</button>`).join('')}</nav><button class="game-menu-close" data-game-close-menu>メニューを閉じる</button></details>`;}
  function fieldNavigation(){
    const level=decorLevel(world),next=level<20?80-(world.decor.lifetimePoints%80):0;
    return `<div class="game-field-bar"><div><p class="game-eyebrow">${world.field.place==='park'?'BUNCHO PARK':'LITTLE HOME'}</p><h3>${escape(fieldTitle())}</h3></div><div class="game-wallet"><strong data-decor-points>${world.decor.points}<small> pt</small></strong><span>Lv.${level}</span></div></div>${fieldControls()}<p class="game-progression">${next?`次のレベルまで ${next} pt。`:'ゆたかな暮らしの達人。'}おしゃべり・遊び・家族の節目が、お飾りにつながるよ。</p>`;
  }
  function sceneFurniture(){
    return `<div class="game-furnishings" aria-hidden="true">${DECOR_SLOTS.map(slot=>{
      const own=world.decor.inventory.find(i=>i.id===world.decor.equipped[slot.id]);
      const item=world.field.place==='friend'?friendFurnishing(findBird(world,world.field.hostId),slot.id,DECOR_COLORS,DECOR_TIERS):own;
      return `<span class="game-furnishing furnishing-${slot.id}" data-equipped-slot="${slot.id}" data-equipped-item="${item.id}">${furnitureSceneSvg(slot.id,itemColor(item).hex,DECOR_TIERS.findIndex(t=>t.id===item.tier)+1)}</span>`;
    }).join('')}</div>`;
  }
  function fieldStory(){
    const recent=world.events.slice().reverse().find(e=>['pair','egg','hatch','grow','play','reconcile'].includes(e.kind));
    const first=world.tick<8;
    return `<aside class="game-field-story"><span aria-hidden="true">${first?'✦':'♡'}</span><p>${first?'ようこそ。はじめのお祝いは20ポイント。お部屋をひとつ飾ったら、公園やお友達の籠へ出かけてみよう。':recent?escape(eventText(world,recent)):'友達と同じ場所で過ごすと、少しずつ気持ちが育つよ。'}<small>${world.field.place==='home'?'長く一緒に過ごす成鳥は、気持ちが通うと家族になることも。':'卵とひなは、おうちの巣でお留守番。いつでも籠へ帰れます。'}</small></p></aside>`;
  }
  function friendRooms(){
    const friends=world.birds.filter(b=>b.home!=='resident'&&b.stage==='adult');
    return `<section class="game-friends"><div class="game-section-title"><div><p class="game-eyebrow">A LITTLE VISIT</p><h3>お友達の籠へ、おでかけ</h3></div></div><p>これは、この端末の物語に暮らす文鳥たち。ほかの利用者との通信や対戦ではありません。</p><div class="game-friend-houses">${friends.map(b=>`<article class="game-friend-house"><div class="game-house-portrait">${smallBird(b)}</div><h4>${escape(b.name)}のお部屋</h4><p>${b.sex==='male'?'オス':'メス'} · ${colorName[b.color]}<br>${b.home==='visitor'?'いま、こちらの籠に遊びに来ています':'また会える、なじみのお友達'}</p><div><button data-field-travel="friend" data-field-host="${b.id}">会いに行く</button><button data-field-invite="${b.id}" ${b.home==='visitor'?'disabled':''}>籠に招く</button></div></article>`).join('')||'<div class="game-empty-home"><h4>最初のお客さんを待っているよ</h4><p>時間を動かすと、最初のゲーム時間にオスのお友達が訪ねてきます。15秒ほど、籠や公園で待ってみよう。</p><button data-field-travel="park">公園を見に行く</button></div>'}</div></section>`;
  }
  function decorationRoom(){
    const slot=DECOR_SLOTS.find(s=>s.id===decorSlot)||DECOR_SLOTS[0],owned=world.decor.inventory.filter(i=>i.slot===slot.id);
    const preview=world.decor.inventory.find(i=>i.id===previewItem&&i.slot===slot.id)||world.decor.inventory.find(i=>i.id===world.decor.equipped[slot.id]);
    const canDraw=!fieldPending&&world.decor.points>=DECOR_DRAW_COST&&world.decor.lastDrawTick!==world.tick;
    return `<section class="game-decoration"><div class="game-section-title"><div><p class="game-eyebrow">MAKE ROOM FOR JOY</p><h3>小さな籠に、好きな色を。</h3></div></div><div class="game-decor-intro"><p>交流と家族の節目でたまったポイントだけを使います。お金・広告・購入はありません。</p><div class="game-wallet"><strong data-decor-points>${world.decor.points}<small> pt</small></strong><span>Lv.${decorLevel(world)}</span></div></div><div class="game-decor-slots" aria-label="9種類のお飾り">${DECOR_SLOTS.map(s=>`<button data-decor-slot="${s.id}" aria-pressed="${s.id===slot.id}">${furnitureSvg(s.id,'#b5c8ad')}<span>${s.label}</span></button>`).join('')}</div><div class="game-decor-workbench"><div class="game-decor-preview" data-preview-item="${preview.id}"><div class="game-item-art">${itemArt(preview)}</div><p>${escape(itemName(preview))}</p><small>${world.decor.equipped[slot.id]===preview.id?'いま籠に飾っているお飾り':'お試し表示 · まだ籠は変わっていません'}</small>${world.decor.equipped[slot.id]!==preview.id?`<div><button data-decor-equip="${preview.id}">これを籠に飾る</button><button data-decor-cancel>やめる</button></div>`:''}</div><div class="game-decor-draw"><h4>${slot.label}のお飾りガチャ</h4><p>8色から、ひとつ。レベルが上がると<br>上質な仕上げにも出会えます。</p><button class="game-draw-button" data-decor-draw="${slot.id}" ${canDraw?'':'disabled'}>ひとつ開ける · ${DECOR_DRAW_COST} pt</button><p class="game-small">${world.decor.lastDrawTick===world.tick?'次のゲーム時間（15秒）にまた開けられます。一時停止中は待ち時間も止まります。':world.decor.points<DECOR_DRAW_COST?'友達と遊んだり、家族の成長を見守るとポイントが増えます。':'同じお飾りが出たら8 ptを返します。'}</p>${drawResult?`<div class="game-draw-result" role="status"><strong>${drawResult.duplicate?'もう持っている色でした':'新しいお飾り！'}</strong><p>${escape(itemName(drawResult.item))}</p><p>${escape(drawResult.message)}</p></div>`:''}<details data-game-details="draw-odds"><summary>色・仕上げの確率とポイント</summary><p>色は8色それぞれ12.5%。仕上げは ${decorOdds(world).map(o=>`${DECOR_TIERS.find(t=>t.id===o.tierId).label} ${Math.round(o.probability*100)}%`).join(' / ')}。色と仕上げは別々に抽選します。</p><p>Lv.1 ほっこり / Lv.3 とっておき / Lv.6 きらめき。交流・水浴び2 pt、仲直り3 pt、仲間入り10 pt、つがい30 pt、卵25 pt、ふ化35 pt、成長20 pt。獲得合計80 ptごとにレベルアップ。クリックや移動だけでは増えません。</p></details></div></div><h4>持っている${slot.label} <small>${owned.length} / 24</small></h4><div class="game-owned-items">${owned.map(item=>`<button data-decor-preview="${item.id}" aria-pressed="${item.id===preview.id}">${itemArt(item)}<span>${itemColor(item).label}<small>${itemTier(item).label}${world.decor.equipped[slot.id]===item.id?' · 使用中':''}</small></span></button>`).join('')}</div></section>`;
  }
  async function fieldAction(button){
    if(fieldPending||button.disabled)return;
    fieldPending=true;button.disabled=true;
    const expectedWorld=world.worldId,request=++fieldViewRequest;
    let feedback;
    try{
      const committed=await mutate(w=>{
        if(button.hasAttribute('data-field-travel'))feedback=travelTo(w,button.dataset.fieldTravel,button.dataset.fieldHost||null);
        else if(button.dataset.fieldInvite)feedback=inviteFriend(w,button.dataset.fieldInvite);
        else if(button.dataset.decorDraw)feedback=drawDecoration(w,button.dataset.decorDraw);
        else feedback=equipDecoration(w,button.dataset.decorEquip);
      },'',()=>alive&&world.worldId===expectedWorld,{bump:false});
      if(committed&&feedback&&request===fieldViewRequest){message=feedback.message;if(button.hasAttribute('data-field-travel')){cancelCareEffects();panel='garden';previewItem=null;drawResult=null;}if(button.dataset.decorDraw&&feedback.changed){drawResult=feedback;previewItem=feedback.item.id;}if(button.dataset.decorEquip)previewItem=null;}
    }finally{fieldPending=false;if(alive)render();}
  }

  function garden() {
    const active=fieldBirds(world);
    const positions=fieldPositions(active,'wide',world.field.place), mobilePositions=fieldPositions(active,'tall',world.field.place);
    // Returning from a visitor/departed profile must not show a different bird
    // in the picker, scene caption and compact profile.
    if(!active.some(b=>b.id===selected)&&active.length){cancelCareEffects();selected=active[0].id;}
    const current=active.find(b=>b.id===selected)||active[0];
    const related=current&&world.events.slice(-8).reverse().find(e=>e.ids.includes(current.id)&&world.tick-e.tick<2&&['play','bath','declined','pair','reconcile'].includes(e.kind));
    const selectedSpeech=related?(related.kind==='declined'?'またあとでね':related.kind==='pair'?'これからも一緒':'いっしょに♪'):'';
    return `${fieldNavigation()}<div class="game-room" data-field="${world.field.place}" aria-label="${escape(fieldTitle())}。イラストのゲーム用風景です。">
      <picture class="game-habitat"><source media="(max-width: 600px)" srcset="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-tall.webp"><img src="${GAME_ART}${world.field.place==='park'?'field-park':'field-home'}-wide.webp" alt="" aria-hidden="true" width="1600" height="1000" decoding="async"></picture>
      ${world.field.place!=='park'?sceneFurniture():''}<span class="game-floor-soil" style="--care-soil-opacity:${careFloorOpacity(getCleanliness(world)).toFixed(3)}" aria-hidden="true"></span>
      ${active.map(b=>{
        const pos=positions.get(b.id),mobile=mobilePositions.get(b.id),isSelected=b.id===selected;
        const pose=poseFor(b,globalThis.matchMedia?.('(max-width: 600px)').matches?mobilePositions:positions,active);
        const style=`--bird-x:${pos.x*100}%;--bird-y:${pos.y*100}%;--bird-width:${pos.width*100}%;--bird-depth:${Math.round(pos.y*100)};--bird-tall-x:${mobile.x*100}%;--bird-tall-y:${mobile.y*100}%;--bird-tall-width:${mobile.width*100}%;--bird-tall-depth:${Math.round(mobile.y*100)};--foot-x:${SPRITE_CONTACT.x*100}%;--foot-y:${SPRITE_CONTACT.y*100}%`;
        const attrs=`class="game-room-bird ${isSelected?'is-selected':''} ${pos.interactive?'':'game-nestling'}" style="${style}" data-bird-id="${b.id}" data-anchor="${pos.id}" data-tall-anchor="${mobile.id}" data-action="${b.action.kind}"`;
        return pos.interactive?`<button ${attrs} type="button" data-game-select="${b.id}" data-game-scene-select aria-pressed="${isSelected}" aria-label="${escape(b.name)}、${STAGES[b.stage]}、${ACTIONS[b.action.kind]}">${birdSvg(b.color,b.stage,pose)}${careGesture&&careGesture.birdId===b.id&&careGesture.worldId===world.worldId?'<span class="game-care-cheer" aria-hidden="true">♪</span>':''}</button>`:`<span ${attrs} aria-hidden="true">${birdSvg(b.color,b.stage,pose)}</span>`;
      }).join('')}
      ${current?`<div class="game-scene-caption" aria-hidden="true"><strong>${escape(current.name)}</strong><span>${current.stage==='egg'?'巣で育っているよ':ACTIONS[current.action.kind]}</span>${selectedSpeech?`<span class="game-bubble">${selectedSpeech}</span>`:''}</div>`:''}
    </div>
    ${secondaryMenu()}${fieldStory()}<div class="game-scene-picker"><label for="game-scene-resident">だれを見守る？</label><select id="game-scene-resident" data-game-scene-choose>${active.map(b=>`<option value="${b.id}" ${b.id===selected?'selected':''}>${escape(b.name)} · ${STAGES[b.stage]}</option>`).join('')}</select><button data-game-panel="profile">紹介をひらく</button></div>
    <p class="game-room-hint">文鳥や名前の一覧からえらんで、話しかけてみよう。ひなと卵は巣で過ごし、名前の一覧からえらべるよ。</p>
    <p class="game-art-disclosure">文鳥は写真のような生成画像、籠と公園は生成イラストです。実際のおもちの写真や、現実の観察記録ではありません。</p>
    <div class="game-visitor-box"><h3>遊びに来たおともだち</h3>${world.birds.filter(b=>b.home==='visitor').map(b=>birdButton(b,'<span class="game-pill">名前をつけて迎えよう</span>')).join('')||'<p>次のお客さんを、のんびり待とう。</p>'}</div><details class="game-care-drawer" data-game-details="home-care"><summary>お部屋のおそうじ</summary>${gardenCare()}</details>${profile(true)}`;
  }
  function profile(compact=false) {
    const b=chosen(),parentNames=b.parents.map(id=>birdName(world,id));const memory=b.memories.at(-1),last=world.events.slice().reverse().find(e=>e.ids.includes(b.id));
    return `<section class="game-profile"><div class="game-profile-heading">${smallBird(b)}<div><p class="game-eyebrow">${homeName[b.home]} · 第${b.generation+1}世代</p><h3>${escape(b.name)}</h3><p>${b.sex==='female'?'メス':'オス'} / ${colorName[b.color]} / ${STAGES[b.stage]}</p></div><button data-game-art="${b.id}">記念カードをつくる</button></div><dl class="game-facts"><div><dt>いま</dt><dd>${ACTIONS[b.action.kind]}</dd></div><div><dt>好きなこと</dt><dd>${b.preference}</dd></div><div><dt>ゲームの性格</dt><dd>${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}</dd></div><div><dt>家族</dt><dd>${b.partner?`つがい：${escape(birdName(world,b.partner))}`:'つがいはまだいない'}${parentNames.length?`<br>親：${parentNames.map(escape).join(' と ')}`:''}</dd></div></dl><div class="game-meters">${[['気分',b.mood],['元気',b.needs.energy],['おなか',b.needs.food]].map(([label,value])=>`<label>${label}<meter min="0" max="100" value="${value}">${Math.round(value)}%</meter></label>`).join('')}</div>${careControls(b)}${last?`<p class="game-last-memory"><strong>さいきんのできごと</strong><br>${escape(eventText(world,last))}<small>${escape(last.condition)}</small></p>`:''}${!compact&&b.milestones.length?`<details class="game-milestones" data-game-details="milestones-${b.id}"><summary>ずっと覚えていること</summary><ul>${b.milestones.map(m=>`<li>${day(m.tick)}：${milestoneName[m.kind]}${m.otherId?`（${escape(birdName(world,m.otherId))}）`:''}</li>`).join('')}</ul></details>`:''}<form class="game-name-form" data-game-form="rename"><label for="game-name">${b.home==='visitor'?'名前をつけよう':'名前を変える'}</label><input id="game-name" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="name" maxlength="16" value="${escape(b.name)}" required><button type="submit">${b.home==='visitor'?'この名前にする':'名前を保存'}</button>${b.home==='visitor'?'<button type="button" data-game-action="adopt">庭へ迎える</button>':''}</form><div class="game-talk"><h4>${escape(b.name)}に話しかけよう</h4><div class="game-talk-choices">${['名前を呼ぶ','あそぼう','水浴びしよう','ともだちは？','おやすみ'].map(t=>`<button data-game-talk="${t}">${t}</button>`).join('')}</div><form data-game-form="talk"><label for="game-words">じゆうに話しかける</label><div class="game-input-row"><input id="game-words" data-game-draft-bird="${b.id}" data-game-draft-world="${escape(world.worldId)}" name="words" maxlength="100" placeholder="きょうは げんき？"><button>話す</button></div></form>${lastReply&&replyBird===b.id?`<p class="game-reply" role="status">${escape(lastReply)}</p>`:''}</div><div class="game-links"><button data-game-article="${b.action.kind==='bath'?'bathing':b.action.kind==='eat'?'food':'behavior'}">${b.action.kind==='bath'?'本当の水浴びを調べる':b.action.kind==='eat'?'本当の食べ物を調べる':'本当のしぐさを調べる'}</button>${compact?'<button data-game-panel="relations">みんなとの関係を見る</button>':''}</div><p class="game-small">性格や言葉は、このゲームの物語です。実在のおもちの観察記録ではありません。</p></section>`;
  }
  function relations() {
    const b=chosen(),others=world.birds.filter(o=>o.id!==b.id&&b.relations[o.id]);
    return `<section><h3>気持ちは、一羽ずつちがう</h3><label for="game-relation-bird">だれの気持ち？</label><select id="game-relation-bird" data-game-choose>${world.birds.map(o=>`<option value="${o.id}" ${o.id===selected?'selected':''}>${escape(o.name)}</option>`).join('')}</select><div class="game-relation-center">${smallBird(b)}<strong>${escape(b.name)}</strong></div><div class="game-relation-list">${others.map(o=>{const r=b.relations[o.id],back=o.relations[b.id];return `<article class="game-relation-card">${birdButton(o)}<p><strong>${escape(b.name)} → ${escape(o.name)}</strong><br>${relationshipLabel(world,b,o)}<br><small>親しさ ${Math.round(r.affection)} / 信頼 ${Math.round(r.trust)} / 相性 ${Math.round(r.compatibility)}</small></p><p><strong>${escape(o.name)} → ${escape(b.name)}</strong><br>${relationshipLabel(world,o,b)}<br><small>親しさ ${Math.round(back?.affection||0)} / 信頼 ${Math.round(back?.trust||0)}</small></p></article>`;}).join('')||'<p>これから少しずつ、出会いが増えるよ。</p>'}</div><p class="game-small">矢印は気持ちの向き。家族のつながりは「家系図」で見られます。</p></section>`;
  }
  function family() {
    const generations=[...new Set(world.birds.map(b=>b.generation))].sort((a,b)=>a-b);
    return `<section><h3>枝から枝へ、家族のものがたり</h3><p>実線と「親 → 子」は血縁。つがいは別の表示です。近い親せき同士はつがいになりません。</p><div class="game-family-tree">${generations.map(g=>`<section class="game-generation"><h4>第${g+1}世代</h4><div class="game-family-cards">${world.birds.filter(b=>b.generation===g).map(b=>`<article class="game-family-card">${b.parents.length?`<p class="game-ancestry">${b.parents.map(p=>`<button data-game-select="${p}">${escape(birdName(world,p))}</button>`).join(' ＋ ')}<br><span aria-hidden="true">│<br>↓</span> 親 → 子</p>`:'<p class="game-ancestry">庭の外から来た文鳥</p>'}${birdButton(b)}${b.partner?`<p>つがい：<button data-game-select="${b.partner}">${escape(birdName(world,b.partner))}</button></p>`:''}<button data-game-art="${b.id}">家族の記念カード</button></article>`).join('')}</div></section>`).join('')}</div></section>`;
  }
  function diary() {
    return `<section><h3>庭のできごと日記</h3><p>文鳥たちの状態と関係から生まれた、ゲームの記録です。</p><ol class="game-diary">${world.events.slice().reverse().map(e=>`<li><time datetime="${new Date(e.at).toISOString()}">${day(e.tick)}</time><p>${escape(eventText(world,e))}</p><details data-game-details="diary-${e.id}"><summary>どうして？</summary><p>${escape(e.condition)}。${escape(e.result)}。</p><p>${new Date(e.at).toLocaleString('ja-JP')}（物語の発生時刻）</p></details>${['egg','hatch','grow','pair'].includes(e.kind)?`<button data-game-event-art="${e.id}">この日の記念カード</button>`:''}</li>`).join('')}</ol><p class="game-small">日記は新しい240件、各文鳥の最近の記憶16件と大切な節目16件を保存。古い日記がまとまっても、名前・家系・つがいは名簿に残ります。</p></section>`;
  }
  function roster() {return `<section><h3>みんなの名簿</h3>${['resident','visitor','departed'].map(home=>`<h4>${homeName[home]}</h4><div class="game-roster">${world.birds.filter(b=>b.home===home).map(b=>birdButton(b)).join('')||'<p>まだいないよ。</p>'}</div>`).join('')}<p class="game-small">庭には10羽、訪問中は2羽まで。名簿は128羽まで残します。上限に達したら新しい誕生・新規来訪をお休みし、今いる仲間との暮らしと再会を楽しめます。</p></section>`;}
  function settings() {return `<section class="game-settings"><h3>つづきの保存と設定</h3><p>この端末のこのブラウザに保存します。ほかの端末へは自動で同期しません。大切な物語は「保存ファイルを書き出す」で保管してね。</p><button data-game-action="export">保存ファイルを書き出す</button><label class="game-import-label" for="game-import">保存ファイルを読み込む（今の庭と入れ替え）</label><input id="game-import" type="file" accept="application/json,.json"><p class="game-small">読み込み前に形式・版・血縁・人数を検査します。不正なファイルで今の庭は壊れません。読み込む前に、今の保存も書き出しておくと安心です。</p><label class="game-check"><input type="checkbox" data-game-motion ${world.settings.motion?'checked':''}> 文鳥の小さな動きを表示</label>${soundControl()}<p class="game-care-disclosure">合成音は架空のゲームの声です。実際のおもちの声ではありません。音をOFFにすると、再生中の音もすぐに止まります。</p><button data-game-action="pause">${world.paused?'時間を動かす':'時間を一時停止'}</button><details data-game-details="save-help"><summary>保存と時間のしくみ</summary><p>実際の15秒がゲームの1時間、6分が1日です。卵からひなは12時間、幼鳥へ24時間、成鳥へ48時間（すべてゲーム時間）。現実の成長や繁殖の手順ではありません。</p><p>閉じたあとは動き続けません。次に開いた時に、最大24ゲーム日（実際の2時間24分）ぶんを順番に計算します。それより長く留守にしても、不利益はありません。一時停止中の時間は進みません。</p><p>複数のタブの更新は保存処理を一列にして、同じ時間を二重に進めません。保存形式は版3。検査できた旧版1・2の保存は、名前・家族・日記・お世話を残して引き継ぎ、籠とお飾りの初期値を加えます。古い版の画面が開いたままなら、読み直してください。将来対応しない版は保存を変えずに拒否します。</p><p>色はゲームの表現として選ばれます。羽色の遺伝を再現するものではありません。</p></details>${new URLSearchParams(location.search).get('qa')==='1'?'<details data-game-details="qa"><summary>検証用（通常の遊びには不要）</summary><button data-game-action="qa-step">1000時間を検証する</button><p>世代・家系・上限の確認用です。先に保存を書き出してください。</p></details>':''}</section>`;}
  function help() {return `<section class="game-help"><h3>ようこそ、おもちの文鳥ぐらしへ</h3><ol><li><strong>まずは見る。</strong>枝、巣、ごはん、水浴び場で、みんなが自分で過ごすよ。</li><li><strong>お客さんを迎える。</strong>最初に来るのはオスの文鳥。名前を決めて「庭へ迎える」を押せるよ。何度も交流すると、自分から仲間になることもあるよ。</li><li><strong>話しかける。</strong>文鳥をえらんで、ことばのボタンを押そう。気分や好み、友達、記憶で返事が変わるよ。</li><li><strong>家族を見守る。</strong>気持ちが通じた成鳥はつがいに。信頼・元気・時間・場所がそろうと卵が生まれることがあるよ。必ずつがいになるわけではないし、友達のままでもすてき。</li><li><strong>記念に残す。</strong>家系図や日記の「記念カード」からアート工房へ。ゲームの家族のお祝いをつくろう。</li></ol><p>食事も休息も自分でできるので、来られない日があっても大丈夫。死亡・課金・広告・連続ログインの条件はありません。</p><p>会話は名前・状態・関係・記憶と、いくつかのことばに反応するルールです。何でも理解するAIではなく、外部へ入力を送りません。</p><p>実在のおもちは、娘さんのメスの白文鳥です。この庭の性格・会話・家族・成長は創作。現実の飼育や繁殖の方法を示すものではありません。</p></section>`;}
  function render() {
    if(!poseEnabled())poseClock.hold();
    refreshPending=false;
    const openDetails=new Set([...root.querySelectorAll("details[open][data-game-details]")].map(d=>d.dataset.gameDetails));
    const oldBirdPositions=new Map([...root.querySelectorAll('.game-room-bird')].map(el=>[el.dataset.birdId,el.getBoundingClientRect()]));
    const focus=document.activeElement,focusBird=root.contains(focus)?focus.dataset?.gameSelect:null,focusIndex=root.contains(focus)?[...root.querySelectorAll('button,input,select,summary')].indexOf(focus):-1,focusId=root.contains(focus)?focus.id:null,focusValue=focusId&&'value'in focus&&(!focus.dataset.gameDraftBird||(focus.dataset.gameDraftBird===selected&&focus.dataset.gameDraftWorld===world.worldId&&drafts.get(draftKey())?.[focusId]!==undefined))?focus.value:null,selectionStart=focus?.selectionStart,selectionEnd=focus?.selectionEnd;
    const panels={garden:()=>garden(),decorate:()=>decorationRoom(),friends:()=>friendRooms(),profile:()=>profile(),relations,family,diary,roster,settings,help};
    root.innerHTML=`<div class="game-app" data-care-motion="${world.settings.motion&&!world.paused&&document.documentElement.dataset.motion!=='off'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'on':'off'}"><header class="game-heading"><div class="game-status"><span>${day(world.tick)}</span><span>${world.paused?'おやすみ中':'のんびり進行中'}</span><button data-game-action="pause">${world.paused?'つづける':'一時停止'}</button></div></header>${store.mode==='memory'?'<p class="game-warning" role="alert">このブラウザでは端末保存が使えません。いまのタブだけで遊べます。閉じる前に設定から保存ファイルを書き出してください。</p>':''}${world.offlineSummary?`<div class="game-welcome"><strong>おかえりなさい。</strong>留守のあいだの${Math.round(world.offlineSummary.ticks/24)}日ぶんを、順番に進めたよ。${world.offlineSummary.newBirds?`${world.offlineSummary.newBirds}羽との出会いがあったよ。`:''}${world.offlineSummary.skipped?'長いお休みのぶんは、ゆっくり待っていたよ。':''}<button data-game-action="dismiss-welcome" aria-label="おかえりメッセージを閉じる">閉じる</button></div>`:''}<p class="game-message ${error?'is-error':''}" role="status">${escape(error||message)}</p><div class="game-panel">${panel!=='garden'?fieldControls()+secondaryMenu():''}${panels[panel]()}</div></div>`;
    for(const [id,value] of Object.entries(drafts.get(draftKey())||{})){const input=root.querySelector(`#${id}`);if(input)input.value=value;}
    root.querySelectorAll('details[data-game-details]').forEach(d=>{if(openDetails.has(d.dataset.gameDetails))d.open=true;});
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
    if(focusBird){const el=root.querySelector(`button[data-game-select="${focusBird}"]`);el?.focus({preventScroll:true});}
    if(!focusBird&&!focusId&&focusIndex>=0){const el=root.querySelectorAll('button,input,select,summary')[focusIndex];if(el&&el.tagName===focus.tagName&&el.textContent===focus.textContent)el.focus({preventScroll:true});}
    if(focusId){const el=root.querySelector(`#${focusId}`);if(el&&el.tagName===focus.tagName){if(focusValue!==null&&el.type!=='file')el.value=focusValue;el.focus({preventScroll:true});if(typeof selectionStart==='number'&&el.setSelectionRange)try{el.setSelectionRange(selectionStart,selectionEnd);}catch{}}}
  }
  function artPayload(b, e) { const family=[b,...b.parents.map(id=>findBird(world,id)),...(b.partner?[findBird(world,b.partner)]:[])].filter(Boolean); return {title:e?eventText(world,e):`${b.name}の家族`,name:b.name,names:family.map(x=>x.name),birds:family.map(x=>({id:x.id,name:x.name,color:x.color,stage:x.stage})),date:day(e?.tick??world.tick),event:e?.kind||'family',source:'game',caption:'おもちの文鳥ぐらし・ゲームの記念カード'}; }
  async function careAction(button) {
    const kind=button.dataset.gameCare, birdId=button.dataset.careBirdId || null;
    const expectedWorldId=world.worldId, expectedSelection=selected, expectedPanel=panel, generation=careGeneration, gestureAt=Date.now();
    if(!['feed','pet','clean'].includes(kind)||button.disabled)return;
    const current=()=>alive&&root.isConnected&&world.worldId===expectedWorldId&&selected===expectedSelection&&panel===expectedPanel&&generation===careGeneration;
    // Unlock starts synchronously in this click; no sound plays before commit.
    const unlocked=kind==='pet'&&careSoundEnabled()?audio.unlockFromGesture():Promise.resolve(false);
    let feedback;
    const committed=await mutate(w=>{
      if(w.worldId!==expectedWorldId)throw new Error('庭が変わりました。もう一度えらんでね。');
      feedback=kind==='feed'?feedBird(w,birdId):kind==='pet'?petBird(w,birdId):cleanGarden(w);
      // Feedback is deliberately NOT returned: transactions require the world.
    },'',()=>alive&&root.isConnected,{bump:false,advancePaused:false});
    if(!committed||!feedback||!current())return;
    careFeedback=feedback;message='';
    if(kind==='pet'&&feedback.changed){
      careGesture={birdId,worldId:expectedWorldId};clearTimeout(gestureTimer);
      gestureTimer=setTimeout(()=>{if(!current())return;careGesture=null;render();},850);
    }
    render();
    if(kind==='pet'&&feedback.changed&&careSoundEnabled()&&world.settings.careSound){
      const canPlay=()=>current()&&!document.hidden&&Date.now()-gestureAt<=1500&&careSoundEnabled()&&world.settings.careSound;
      const opened=await unlocked;
      if(!canPlay())return;
      const played=opened&&await audio.chirp(canPlay);
      if(!played&&canPlay()){message='この端末では合成音を鳴らせませんでした。ことばの返事はそのまま楽しめます。';render();}
    }
  }
  async function changeCareSound(enabled) {
    const request=++soundRequest,expectedWorldId=world.worldId;
    soundChoice=enabled;cancelCareEffects();audio.setEnabled(enabled);
    if(enabled)audio.unlockFromGesture(); // gesture only; enabling does not chirp
    const guard=()=>alive&&root.isConnected&&request===soundRequest&&world.worldId===expectedWorldId;
    const committed=await mutate(w=>{w.settings.careSound=enabled;},enabled?'合成音をONにしました。ふれあいを選ぶと短い音が鳴ります。':'合成音を止めました。',guard);
    if(!guard())return;
    if(committed)soundChoice=null; // failed mute remains muted in this view
    audio.setEnabled(careSoundEnabled());render();
  }
  function closeGameMenu(){const menu=root.querySelector('.game-secondary-menu');if(!menu)return;menu.open=false;menu.querySelector('summary').focus({preventScroll:true});}
  function menuKeydown(ev){if(ev.key==='Escape'&&ev.target.closest('.game-secondary-menu[open]')){ev.preventDefault();closeGameMenu();}}
  async function click(ev) {
    const button=ev.target.closest('button');if(!button||!root.contains(button))return;
    if(button.hasAttribute('data-game-close-menu')){closeGameMenu();return;}
    if(button.dataset.gamePanel==='garden'&&world.field.place==='home'){fieldViewRequest++;cancelCareEffects();panel='garden';render();}
    if(button.hasAttribute('data-field-travel')||button.dataset.fieldInvite||button.dataset.decorDraw||button.dataset.decorEquip){await fieldAction(button);return;}
    if(button.dataset.decorSlot){fieldViewRequest++;decorSlot=button.dataset.decorSlot;previewItem=null;drawResult=null;render();return;}
    if(button.dataset.decorPreview){fieldViewRequest++;previewItem=button.dataset.decorPreview;render();return;}
    if(button.hasAttribute('data-decor-cancel')){fieldViewRequest++;previewItem=null;drawResult=null;render();return;}
    if(button.dataset.gameCare){await careAction(button);return;}
    if(button.dataset.gamePanel){fieldViewRequest++;cancelCareEffects();panel=button.dataset.gamePanel;message='';render();return;}
    if(button.dataset.gameSelect){fieldViewRequest++;cancelCareEffects();selected=button.dataset.gameSelect;panel=button.hasAttribute('data-game-scene-select')?'garden':'profile';lastReply='';render();return;}
    if(button.dataset.gameArticle){cancelCareEffects();goArticle(button.dataset.gameArticle);return;}
    if(button.dataset.gameArt){cancelCareEffects();const b=findBird(world,button.dataset.gameArt);if(b)goArt(artPayload(b));return;}
    if(button.dataset.gameEventArt){cancelCareEffects();const e=world.events.find(e=>e.id===button.dataset.gameEventArt);if(e)goArt(artPayload(findBird(world,e.ids[0]),e));return;}
    if(button.dataset.gameTalk){const birdId=selected;await mutate(w=>{const b=findBird(w,birdId);const text=button.dataset.gameTalk==='名前を呼ぶ'?b.name:button.dataset.gameTalk;lastReply=talkToBird(w,birdId,text).answer;replyBird=birdId;});return;}
    const action=button.dataset.gameAction;
    if(action==='pause')await mutate(w=>{w.paused=!w.paused;markCurrentTime(w);});
    if(action==='dismiss-welcome')await mutate(w=>{w.offlineSummary=null;});
    if(action==='adopt'){const name=root.querySelector('#game-name')?.value,birdId=selected;await mutate(w=>{adoptBird(w,birdId,name);},'新しい仲間を迎えたよ。');}
    if(action==='export') {try{const current=await store.transact(w=>advanceTo(w));if(!alive||!root.isConnected)return;latest(current);const blob=new Blob([serializeWorld(current)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`buncho-garden-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message='保存ファイルを書き出しました。';render();}catch(e){if(alive){error=e.message;render();}}}
    if(action==='qa-step'&&new URLSearchParams(location.search).get('qa')==='1')await mutate(w=>{const paused=w.paused;w.paused=false;advanceTicks(w,1000);w.paused=paused;markCurrentTime(w);},'検証用に1000時間を進めました。');
  }
  async function submit(ev){
    const form=ev.target.closest('form');if(!form)return;ev.preventDefault();
    const data=new FormData(form),birdId=selected,key=draftKey(birdId);
    if(form.dataset.gameForm==='rename'){
      const value=data.get('name');
      const committed=await mutate(w=>{renameBird(w,birdId,value);},'名前を保存したよ。これまでの日記にも新しい名前が出るよ。');
      if(committed&&drafts.get(key)?.['game-name']===value)delete drafts.get(key)['game-name'];
    }
    if(form.dataset.gameForm==='talk'){
      const value=data.get('words');
      const committed=await mutate(w=>{lastReply=talkToBird(w,birdId,value||'こんにちは').answer;replyBird=birdId;});
      if(committed&&drafts.get(key)?.['game-words']===value){delete drafts.get(key)['game-words'];if(key===draftKey()){const input=root.querySelector('#game-words');if(input)input.value='';}}
    }
  }
  async function change(ev){if(ev.target.matches('[data-game-care-sound]')){await changeCareSound(ev.target.checked);return;}if(ev.target.matches('[data-game-choose], [data-game-scene-choose]')){cancelCareEffects();selected=ev.target.value;render();}if(ev.target.matches('[data-game-motion]'))await mutate(w=>{w.settings.motion=ev.target.checked;});if(ev.target.id==='game-import'&&ev.target.files?.[0]){cancelCareEffects();const file=ev.target.files[0],request=++importRequest;const currentRequest=()=>alive&&root.isConnected&&request===importRequest;try{if(file.size>MAX_SAVE_BYTES)throw new Error('4MB以下の保存ファイルを選んでね。');const text=await file.text();if(!currentRequest())return;const imported=parseSave(text);if(!confirm(`「${imported.birds[0].name}」の庭（${imported.birds.length}羽）を読み込み、今の庭と入れ替えますか？`)){ev.target.value='';return;}await mutate(w=>{const now=Date.now();if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw new Error('端末の日時を確認してから、もう一度読み込んでください。');imported.lastUpdated=now;imported.revision=w.revision;return imported;},'保存ファイルから庭を復元しました。',currentRequest);}catch(e){if(!currentRequest())return;error=`読み込めませんでした。今の保存はそのままです。 ${e.message}`;render();}}}
  root.addEventListener('keydown',menuKeydown);root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('change',change);root.addEventListener('input',rememberDraft);root.addEventListener('pointerdown',pointerStart);document.addEventListener('pointerup',pointerEnd);document.addEventListener('pointercancel',pointerEnd);
  if(globalThis.BroadcastChannel){channel=new BroadcastChannel('buncho-garden-updates');channel.onmessage=()=>poll();}
  async function poll(){if(!alive||busy||document.hidden)return;busy++;try{const next=await store.transact(w=>w.paused?w:advanceTo(w));const replaced=next.worldId!==world.worldId,changed=replaced||next.revision!==world.revision||next.paused!==world.paused||refreshPending;if(!alive)return;latest(next);if(changed){if(!replaced&&interactionActive())refreshPending=true;else render();}}catch(e){if(alive){error=e.message;render();}}finally{busy--;}}
  timer=setInterval(poll,3000);render();
  const poseTimer=setInterval(updatePoses,600);
  document.addEventListener('visibilitychange',holdPoses);reducedMotion?.addEventListener?.('change',holdPoses);poseLayout?.addEventListener?.('change',reframePoses);
  return ()=>{alive=false;importRequest++;soundRequest++;cancelCareEffects();audio.close();clearInterval(timer);clearInterval(poseTimer);document.removeEventListener('visibilitychange',holdPoses);reducedMotion?.removeEventListener?.('change',holdPoses);poseLayout?.removeEventListener?.('change',reframePoses);channel?.close();store.close();root.removeEventListener('keydown',menuKeydown);root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('change',change);root.removeEventListener('input',rememberDraft);root.removeEventListener('pointerdown',pointerStart);document.removeEventListener('pointerup',pointerEnd);document.removeEventListener('pointercancel',pointerEnd);clearTimeout(releaseTimer);pressedPointers.clear();drafts.clear();};
}

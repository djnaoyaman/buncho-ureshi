import {encounterFriendship} from './encounters.js';
import {collectionEndingStatus,pendingCollectionEnding,claimCollectionEnding,recordCollectionEndingPlayback,releaseCollectionEnding} from './collection-endings.js';
const MOVIES=Object.freeze({garden:'omochi-ending02-revised-87.mp4',crows:'omochi-ending03-approved-40.mp4',raptors:'raptors-v5.mp4','garden-tour':'buncho-ending-01-rich-final-review.mp4'});
const TITLES={'garden-tour':'どこへ行っても、帰る場所',garden:'<ruby>庭<rt>にわ</rt></ruby>の<ruby>鳥<rt>とり</rt></ruby>との<ruby>出会<rt>であ</rt></ruby>い',crows:'カラスたちとの<ruby>出会<rt>であ</rt></ruby>い',raptors:'<ruby>大空<rt>おおぞら</rt></ruby>の<ruby>鳥<rt>とり</rt></ruby>たちとの<ruby>出会<rt>であ</rt></ruby>い'};

/** Read existing friendship evidence. Opening or playing a mini film does not write a save. */
const FRIENDSHIP_MOVIES=Object.freeze({
 'eurasian-tree-sparrow':Object.freeze({
  bird:'スズメ',title:'スズメと なかよしになった記念',file:'friendship-eurasian-tree-sparrow-logo09.mp4',
  source:'https://commons.wikimedia.org/wiki/File:Eurasian_tree_sparrows_(Passer_montanus)_in_Japan.webm',
  license:'https://creativecommons.org/licenses/by/4.0/',licenseLabel:'CC BY 4.0',creator:'The Nature Box',place:'城北中央公園（東京都、2016年）'
 }),
 'eurasian-bullfinch':Object.freeze({
  bird:'ウソ',title:'ウソと なかよしになった記念',file:'friendship-eurasian-bullfinch-logo09.mp4',
  source:'https://commons.wikimedia.org/wiki/File:Male_bullfinch_(Pyrrhula_pyrrhula)_feeding_on_sunflower_seed.webm',
  license:'https://creativecommons.org/licenses/by/3.0/',licenseLabel:'CC BY 3.0',creator:'Tony Whitehead',place:'英国（2010年12月27日）'
 }),
 'hawfinch':Object.freeze({
  bird:'シメ',title:'シメと なかよしになった記念',file:'friendship-hawfinch-logo09.mp4',
  source:'https://commons.wikimedia.org/wiki/File:Hawfinch_(Coccothraustes_coccothraustes).webm',
  license:'https://creativecommons.org/licenses/by/3.0/',licenseLabel:'CC BY 3.0',creator:'Lubo Ondrasko',place:'原典に記載なし'
 }),
 'tricolored-munia':Object.freeze({
  bird:'ギンパラ',title:'ギンパラと なかよしになった記念',file:'friendship-tricolored-munia-logo09.mp4',
  source:'https://commons.wikimedia.org/wiki/File:A_Tricolored_Munia_(Finch)_Preening.webm',
  license:'https://creativecommons.org/licenses/by/2.0/',licenseLabel:'CC BY 2.0',creator:'Hari K Patibanda',place:'原典に記載なし'
 }),
 'gouldian-finch':Object.freeze({
  bird:'コキンチョウ',title:'コキンチョウと なかよしになった記念',file:'friendship-gouldian-finch-logo09.mp4',
  source:'https://pixabay.com/videos/bird-gouldian-finch-multicoloured-174987/',
  license:'https://pixabay.com/service/terms/',licenseLabel:'Pixabay Content License',creator:'NickyPe',place:'原典に記載なし',
  edit:'原速の5.25秒の抜粋を使い、書き下ろしのことば・音楽・演出を加えて15秒の作品に仕上げています。'
 }),
 'red-crossbill':Object.freeze({
  bird:'イスカ',title:'イスカと なかよしになった記念',file:'friendship-red-crossbill-logo09.mp4',
  source:'https://www.nps.gov/media/video/view.htm?id=7aee6259-50b8-49e3-8536-d78ab098df87',
  license:'https://www.nps.gov/media/video/view.htm?id=7aee6259-50b8-49e3-8536-d78ab098df87',licenseLabel:'Public Domain（原典の権利表示）',creator:'U.S. National Park Service',place:'米国マウントレーニア国立公園 ロングマイア・メドウ（2021年8月）',
  edit:'原速の映像を縦向きに切り出し、書き下ろしのことばと音楽を加えています。'
 }),
 'red-avadavat':Object.freeze({
  bird:'ベニスズメ',title:'ベニスズメと なかよしになった記念',file:'friendship-red-avadavat-logo09.mp4',
  source:'https://www.flickr.com/photos/krishnacolor/51482148959/',
  license:'https://creativecommons.org/licenses/by/2.0/',licenseLabel:'CC BY 2.0',creator:'Hari K Patibanda',place:'インド・テランガーナ州',
  edit:'原速の映像を縦向きに切り出し、書き下ろしのことばと音楽を加えています。'
 }),
 'eurasian-siskin':Object.freeze({
  bird:'マヒワ',title:'マヒワと なかよしになった記念',file:'friendship-eurasian-siskin-logo09.mp4',
  source:'https://pixabay.com/videos/siskins-garden-birds-bird-feeder-2226/',
  license:'https://pixabay.com/service/terms/',licenseLabel:'Pixabay Content License',creator:'jLasWilson',place:'原典に記載なし',
  edit:'原速の5.25秒の抜粋を使い、書き下ろしのことば・音楽・演出を加えて15秒の作品に仕上げています。'
 }),
 'common-redpoll':Object.freeze({
  bird:'ベニヒワ',title:'ベニヒワと なかよしになった記念',file:'friendship-common-redpoll-logo09.mp4',
  source:'https://commons.wikimedia.org/wiki/File:Common_redpolls_(Acanthis_flammea).webm',
  license:'https://creativecommons.org/licenses/by/2.0/',licenseLabel:'CC BY 2.0',creator:'Seabamirum',
  place:'米国ネバダ州ワショー郡ドライバレー（2012年12月28日）',
  edit:'原速の6.5秒を、2羽の体が切れない幅で縦型の画面に収め、書き下ろしのことばと音楽を加えています。'
 }),
 'zebra-finch':Object.freeze({
  bird:'キンカチョウ',title:'キンカチョウと なかよしになった記念',file:'friendship-zebra-finch-logo09.mp4',
  photoReferences:Object.freeze([
   Object.freeze({credit:"Janet’s Photos 2012",source:'https://commons.wikimedia.org/wiki/File:Taeniopygia_guttata_-Australia_-male-8a.jpg',license:'https://creativecommons.org/licenses/by/2.0/',label:'CC BY 2.0'}),
   Object.freeze({credit:'PookieFugglestein（Broken Hill）',source:'https://commons.wikimedia.org/wiki/File:Zebra_Finch_in_hand.JPG',license:'https://creativecommons.org/publicdomain/zero/1.0/',label:'CC0'})
  ])
 }),
 'diamond-firetail':Object.freeze({
  bird:'ダイヤモンドフィンチ',title:'ダイヤモンドフィンチと なかよしになった記念',file:'friendship-diamond-firetail-logo09.mp4',
  photoReferences:Object.freeze([
   Object.freeze({credit:'Andrew Allen',source:'https://commons.wikimedia.org/wiki/File:Stagonopleura_guttata_49654460.jpg',license:'https://creativecommons.org/licenses/by/4.0/',label:'CC BY 4.0'}),
   Object.freeze({credit:'aussiegall',source:'https://commons.wikimedia.org/wiki/File:Stagonopleura_guttata_-Auburn_Botanical_Gardens,_New_South_Wales,_Australia-8.jpg',license:'https://creativecommons.org/licenses/by/2.0/',label:'CC BY 2.0'})
  ])
 }),
 'red-throated-parrotfinch':Object.freeze({
  bird:'ヒノマルチョウ',title:'ヒノマルチョウと なかよしになった記念',file:'friendship-red-throated-parrotfinch-logo09.mp4',
  photoReferences:Object.freeze([
   Object.freeze({credit:'Ben Keen（映像のもとになった写真）',source:'https://www.inaturalist.org/observations/324096623',license:'https://creativecommons.org/publicdomain/zero/1.0/',label:'CC0'}),
   Object.freeze({credit:'Lennart Hudel（姿の確認に使った写真）',source:'https://www.inaturalist.org/observations/69886942',license:'https://creativecommons.org/licenses/by/4.0/',label:'CC BY 4.0'})
  ])
 })
});
export function unlockedFriendshipMovies(w){
 if(!Array.isArray(w?.encounters?.discoveries))return [];
 return Object.keys(FRIENDSHIP_MOVIES).filter(id=>w.encounters.discoveries.some(d=>d.id===id)&&encounterFriendship(w,id).points>=100);
}
export function newlyUnlockedFriendshipMovies(previousIds,expectedWorld,next){
 return next.worldId===expectedWorld?unlockedFriendshipMovies(next).filter(id=>!previousIds.includes(id)):[];
}
function friendshipMovieCredit(film){
 if(film.photoReferences)return `<p>実写ではなく、写真を参考にした生成映像です。参考写真：${film.photoReferences.map(ref=>`<a href="${ref.source}">${ref.credit}</a>（<a href="${ref.license}">${ref.label}</a>）`).join("、")}。</p>`;
 return `<p>撮影地：${film.place}。ゲームの庭を撮ったものではありません。映像：${film.creator}（<a href="${film.source}">原典</a>／<a href="${film.license}">${film.licenseLabel}</a>）。${film.edit??'縦向きに切り出し、文字と音楽を加えています。'}</p>`;
}
const movieButton=(id,label)=>`<button type="button" data-friendship-movie-open="${id}"><span aria-hidden="true">▶</span> ${label}</button>`;
export function renderFriendshipMovieCard(w,id){
 const film=Object.hasOwn(FRIENDSHIP_MOVIES,id)?FRIENDSHIP_MOVIES[id]:null;if(!film)return '';
 const unlocked=unlockedFriendshipMovies(w).includes(id);
 return `<section class="game-ending-diary game-friendship-movie-card" aria-label="なかよし記念の映像"><h4>なかよし記念の<ruby>映像<rt>えいぞう</rt></ruby></h4>${unlocked?movieButton(id,film.title)+friendshipMovieCredit(film):'<p><ruby>親<rt>した</rt></ruby>しみが100ポイントになると、見られるよ。</p>'}</section>`;
}
export function renderFriendshipMovieDiary(w){
 const ids=unlockedFriendshipMovies(w);if(!ids.length)return '';
 return `<section class="game-ending-diary" aria-label="なかよし記念の映像"><h3>なかよし記念の<ruby>映像<rt>えいぞう</rt></ruby></h3><div>${ids.map(id=>movieButton(id,FRIENDSHIP_MOVIES[id].title)).join('')}</div></section>`;
}
export function renderFriendshipMovieOffer(id,{announce=true}={}){
 const film=Object.hasOwn(FRIENDSHIP_MOVIES,id)?FRIENDSHIP_MOVIES[id]:null;if(!film)return '';
 return `<aside class="game-friendship-movie-offer" data-friendship-movie-offer="${id}" aria-label="なかよし記念のお知らせ"><p${announce?' role="status"':''}>${film.bird}と<ruby>親<rt>した</rt></ruby>しみ100ポイント！<br>記念の<ruby>映像<rt>えいぞう</rt></ruby>が見られるよ。</p><div>${movieButton(id,'見る')}<button type="button" data-friendship-movie-dismiss="${id}">あとで</button></div></aside>`;
}

export function renderEndingDiary(world){
 const entries=collectionEndingStatus(world).filter(e=>e.unlocked);
 if(!entries.length)return '';
 return `<section class="game-ending-diary" aria-label="エンディング"><h3>おもいでのエンディング</h3><p><ruby>達成<rt>たっせい</rt></ruby>したエンディングは、いつでも<ruby>見<rt>み</rt></ruby>られるよ。</p><div>${entries.map(e=>`<button type="button" data-ending-replay="${e.id}"><span aria-hidden="true">▶</span> ${TITLES[e.id]}</button>`).join('')}</div></section>`;
}
/** A persistent dialog outside repainted panels. Failed autoplay never discards an ending. */
export function mountCollectionEndingPlayer(root,{getWorld,transact,canPresent=()=>true,onActive=()=>{},onClose=()=>{},now=()=>Date.now()}={}){
 const doc=root.ownerDocument,win=doc.defaultView,owner=globalThis.crypto?.randomUUID?.()||`ending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 let alive=true,dialog=null,video=null,current=null,flight=false,closing=false,retiring=0,lastFocus=null,blocked=new Set();
 const active=()=>!!current||flight||closing||retiring>0;
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
  const d=dialog?.querySelector('.game-ending-screen'),v=video;if(!d||!v||closing||retiring||current.fullscreenPending||doc.fullscreenElement===d||v.webkitDisplayingFullscreen)return;
  try{
   if(d.requestFullscreen){const c=current;c.fullscreenPending=true;c.fullscreenRequest=Promise.resolve(d.requestFullscreen()).catch(()=>{}).finally(()=>{c.fullscreenPending=false;});}
   else if(v.webkitEnterFullscreen){v.webkitEnterFullscreen();}
  }catch{if(current)current.fullscreenPending=false;} // iOS may refuse until media metadata is ready; the full-screen dialog remains usable.
 }
 async function play({fullscreen=false}={}){const c=current,v=video,d=dialog;if(!v||!c||closing||retiring)return;if(fullscreen)enterFullscreen();try{if(v.error)v.load();await v.play();}catch{if(current!==c||video!==v)return;d?.removeAttribute('data-playing');message('▶ をおすと、エンディングが はじまるよ。');}}
 async function leaveFullscreen(c,d,v){
  await c?.fullscreenRequest;if(d?.contains(doc.fullscreenElement))await doc.exitFullscreen?.();
  if(v?.webkitDisplayingFullscreen)await new Promise((resolve,reject)=>{
   let timer;const finish=error=>{clearTimeout(timer);v.removeEventListener('webkitendfullscreen',ended);error?reject(error):resolve();},ended=()=>finish();
   v.addEventListener('webkitendfullscreen',ended,{once:true});timer=setTimeout(()=>finish(v.webkitDisplayingFullscreen?Error('Fullscreen exit pending'):null),2000);
   try{v.webkitExitFullscreen();if(!v.webkitDisplayingFullscreen)finish();}catch(error){finish(error);}
  });
 }
 async function close({acknowledge=true,playback='deferred'}={}){
  if(closing||!current)return;closing=true;const c=current,d=dialog,v=video;try{v?.pause();}catch{}if(playback==='completed')c.completed=true;
  try{if(acknowledge)await savePlayback(c.completed?'completed':playback);else await transactFor(c.worldId,w=>releaseCollectionEnding(w,c.id,owner));}
  catch{closing=false;if(current!==c)return;message('きろくを ほぞんできませんでした。つうしんを たしかめて、もういちど とじるを おしてね。');return;}
  try{await leaveFullscreen(c,d,v);}catch{closing=false;if(current===c)message('全画面を とじてから、もういちど とじるを おしてね。');return;}if(current!==c){closing=false;return;}
  if(!acknowledge)blocked.add(`${c.worldId}:${c.id}`);
  remove(false);closing=false;onClose(c);
 }
 function remove(exit=true){
  const old=dialog,v=video,c=current;current=null;dialog=null;video=null;
  try{v?.pause();}catch{}
  const unload=()=>{try{v?.removeAttribute('src');v?.load();}catch{}};
  if(exit&&c&&(c.fullscreenRequest||old?.contains(doc.fullscreenElement)||v?.webkitDisplayingFullscreen)){retiring++;void leaveFullscreen(c,old,v).catch(()=>{}).finally(()=>{unload();retiring--;});}else unload();
  if(old){if(old.open)old.close();old.remove();}notify(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});lastFocus=null;
 }
 async function open(id,{automatic=false,friendship=false,trigger=null}={}){
  if(!alive||active()||doc.hidden||!canPresent())return false;
  const w=getWorld(),mini=friendship&&Object.hasOwn(FRIENDSHIP_MOVIES,id)?FRIENDSHIP_MOVIES[id]:null;
  if(friendship&&(automatic||!mini||!unlockedFriendshipMovies(w).includes(id)))return false;
  const status=mini?{title:mini.title,unlocked:true,acknowledged:true}:collectionEndingStatus(w).find(e=>e.id===id),
   file=mini?.file||MOVIES[id],title=mini?.title||TITLES[id];
  if(!status?.unlocked||!file)return false;
  flight=true;const worldId=w.worldId;let claimed=false;
  try{if(!status.acknowledged)await transactFor(worldId,latest=>{claimed=claimCollectionEnding(latest,id,owner,now()).changed;});
   if(!alive||doc.hidden||getWorld().worldId!==worldId||!canPresent()||(automatic&&!claimed))return false;
   current={id,worldId,friendship:!!mini,acked:status.acknowledged||!claimed,recordable:!mini&&(status.acknowledged||claimed)};lastFocus=trigger||doc.activeElement;notify(true);
   dialog=doc.createElement('dialog');dialog.className='game-ending-dialog';dialog.setAttribute('aria-labelledby','game-ending-title');
   dialog.innerHTML=`<div class="game-ending-screen"><header><h2 id="game-ending-title">${title}</h2><button type="button" data-ending-close aria-label="${mini?'記念の映像を閉じる':'エンディングを閉じる'}">とじる</button></header><video controls playsinline preload="none" aria-label="${status.title}"></video><div class="game-ending-actions"><button type="button" data-ending-play>▶ <ruby>再生<rt>さいせい</rt></ruby></button><button type="button" data-ending-fullscreen><ruby>全画面<rt>ぜんがめん</rt></ruby></button><button type="button" data-ending-skip>あとで<ruby>見<rt>み</rt></ruby>る</button></div><p role="status" aria-live="polite"></p></div>`;
   if(id==='garden-tour'||id==='garden'||id==='crows'){dialog.dataset.film=id==='garden-tour'?'tour':id;const controls=doc.createElement('div');controls.className='game-ending-tour-controls';controls.append(dialog.querySelector('[role=status]'),dialog.querySelector('.game-ending-actions'));dialog.querySelector('.game-ending-screen').append(controls);}
   root.append(dialog);video=dialog.querySelector('video');video.tabIndex=0;video.volume=.5;video.src=new URL(`../game-endings/${file}`,import.meta.url).href;const session=current,media=video,isCurrent=()=>alive&&current===session&&video===media;
   video.addEventListener('playing',()=>{if(!isCurrent()||closing)return;dialog?.setAttribute('data-playing','');if(doc.activeElement?.matches('[data-ending-play]'))video?.focus({preventScroll:true});message('');void savePlayback('started').catch(()=>{if(isCurrent())message('きろくの ほぞんを まっています。');});});
   video.addEventListener('pause',()=>{if(!isCurrent())return;dialog?.removeAttribute('data-playing');});
   video.addEventListener('ended',()=>{if(!isCurrent())return;void close({playback:'completed'});});
   video.addEventListener('error',()=>{if(!isCurrent())return;message('どうがを よみこめませんでした。つうしんを たしかめて、もういちど ▶ をおしてね。');});
   dialog.addEventListener('click',ev=>{if(!isCurrent())return;ev.stopPropagation();if(ev.target.closest('[data-ending-play]'))void play({fullscreen:true});else if(ev.target.closest('[data-ending-fullscreen]'))enterFullscreen();else if(ev.target.closest('[data-ending-close],[data-ending-skip]'))void close();});
   dialog.addEventListener('cancel',ev=>{if(!isCurrent())return;ev.preventDefault();ev.stopPropagation();void close();});
   dialog.addEventListener('keydown',ev=>{if(!isCurrent())return;if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();void close();}else if(ev.key==='Tab'){const controls=[...dialog.querySelectorAll('button,video')].filter(e=>!e.disabled);const i=controls.indexOf(doc.activeElement);if(ev.shiftKey&&i<=0){ev.preventDefault();controls.at(-1)?.focus();}else if(!ev.shiftKey&&i===controls.length-1){ev.preventDefault();controls[0]?.focus();}}});
   dialog.showModal();dialog.querySelector('[data-ending-play]').focus({preventScroll:true});if(mini){dialog.dataset.friendshipMovie=id;dialog.querySelector('[data-ending-play]').textContent='▶ 音と映像を再生';message(mini.photoReferences?'写真を参考にした生成映像と、音楽を使った短い作品です。':'実写と音楽を使った短い作品です。');}else if(id==='garden-tour'){dialog.querySelector('[data-ending-play]').textContent='▶ 音声と映像を再生';message('35の庭を訪ねた記念の作品です。あなたの訪問順や個体を再現した映像ではありません。');}else if(id==='garden'){dialog.querySelector('[data-ending-play]').textContent='▶ 音声と映像を再生';message('▶ をおすと、35種の鳥との出会いを祝う作品がはじまります。ゲームの世界を描いた創作映像です。');}else if(id==='crows'){dialog.querySelector('[data-ending-play]').textContent='▶ 音声と映像を再生';message('▶ をおすと、5種のカラスとの出会いを祝う作品がはじまります。ゲームの世界を描いた創作映像です。');}else void play();return true;
  }catch{if(current)remove();return false;}
  finally{flight=false;if(!current&&claimed)void transactFor(worldId,w=>releaseCollectionEnding(w,id,owner)).catch(()=>{});}
 }
 function sync(){if(!alive)return;if(current&&getWorld().worldId!==current.worldId){remove();return;}if(active()||doc.hidden||!canPresent())return;const entry=pendingCollectionEnding(getWorld());if(entry&&!blocked.has(`${getWorld().worldId}:${entry.id}`))void open(entry.id,{automatic:true});}
 const pause=()=>{try{video?.pause();}catch{}};
 const viewBlocked=()=>{if(doc.body.dataset.gameViewBlocked)pause();};
 const visibility=()=>{if(doc.hidden)pause();else sync();};
 win.addEventListener('pagehide',pause);doc.addEventListener('buncho-game-view-visibility',viewBlocked);
 doc.addEventListener('visibilitychange',visibility);
 return {active,sync,open,openFriendship:(id,trigger)=>open(id,{friendship:true,trigger}),destroy(){alive=false;const c=current;if(c&&!c.acked)void transactFor(c.worldId,w=>releaseCollectionEnding(w,c.id,owner)).catch(()=>{});remove();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',pause);doc.removeEventListener('buncho-game-view-visibility',viewBlocked);}};
}

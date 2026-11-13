import {encounterBodyArt} from './encounter-body-art.js';
import {renderGardenFriendCards} from './garden-friend-cards.js';
import {renderGardenAboutBooklet} from './garden-about-booklet.js';
import {renderCompanionSettings} from './garden-companion-ui.js';
import {raptorScene,raptorTarget} from './garden-raptors.js';
import {renderRaptorScene} from './garden-raptor-ui.js';
import {getProtagonistBird} from './protagonist.js';
import {isAlive} from './life-care.js';
import {crowScene} from './garden-crows.js';
import {renderCrowNotice,renderCrowScene} from './garden-crow-ui.js';
import {renderGardenBirdSprite} from './garden-bird-motion.js';
/** Render-only notebook / event surfaces. Caller owns atomic actions and focus lifecycle. */
import { encounterSystem,FRIENDSHIP_RULES,cageVisitorCount,getGardenVisitingBird,getGardenEncounterAvailability } from './encounters.js';
import {GARDENS,gardenById,gardenFriendRoster,gardenCompanionRoster} from './data/gardens.js';
import {PUBLISHED_JAVA_BASELINE} from './data/encounter-catalog.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=(base,path)=>typeof path==='string'&&(/^(?:game-art\/finches\/[A-Za-z0-9/_-]+(?:\.(?:screen|thumb))?\.(png|webp|jpe?g)|game-art\/sakura\.webp)$/.test(path))&&!path.includes('..')?esc(base+path):'';
const link=url=>typeof url==='string'&&/^https:\/\/[^\s<>"']+$/.test(url)?esc(url):'';
const delivery=(path,thumbnail=false)=>/^game-art\/finches\/[a-z0-9_-]+\.png$/.test(path)?path.replace(/\.png$/,thumbnail?'.thumb.webp':'.screen.webp'):path;
const mediaStatus='<span class="finch-media-status" aria-hidden="true"><span class="finch-loading-bird">♪</span><span data-media-label>読み込み中…</span></span>';
const plainPicture=(entry,base)=>`<img src="${asset(base,delivery(entry.art.src))}" width="${entry.art.width}" height="${entry.art.height}" alt="${esc(entry.art.alt)}" draggable="false" decoding="async" class="finch-art">`;
const picture=(entry,base,hidden=false,thumbnail=false)=>`<span class="finch-media" data-media-state="pending"><img ${thumbnail?'':'src="'+asset(base,delivery(entry.art.src))+'"'} data-media-src="${asset(base,delivery(entry.art.src,thumbnail))}" ${thumbnail?'data-media-lazy="true"':''} width="${entry.art.width}" height="${entry.art.height}" alt="${hidden?'':esc(entry.art.alt)}" draggable="false" decoding="async" class="finch-art${hidden?' is-silhouette':''}">${mediaStatus}</span>`;
// Scene actors use head-to-feet height; notebook illustrations retain full-image fitting.
export function renderEncounterActorArt(entry,base='/buncho-ureshi/',loading=true){
 const body=encounterBodyArt(entry);
 if(!body)return picture(entry,base);
 return `<span class="finch-media finch-body-art" data-media-state="${loading?'pending':'ready'}" data-body-art="${esc(entry.id)}" style="position:relative;display:block;top:auto;max-width:none;width:100%;height:${loading?'100%':'auto'};aspect-ratio:7 / 8;overflow:visible"><img src="${asset(base,delivery(entry.art.src))}" data-media-src="${asset(base,delivery(entry.art.src))}" width="${entry.art.width}" height="${entry.art.height}" alt="${esc(entry.art.alt)}" draggable="false" decoding="async" class="finch-art" style="${body.style}">${loading?mediaStatus:''}</span>`;
}
/** Search text follows the actual first-meeting conditions, not arrival story text. */
const observationHints=Object.freeze({
 grass:'草をそっと観察していたら',water:'水辺をそっと観察していたら',
 branch:'枝を見上げていたら',song:'歌を聴いていたら',quiet:'ひとやすみしていたら'
});
export function encounterSearchHint(entry,{compact=false}={}){
 const event=entry.gardenEvent,names=[...new Set(event?.gardenIds||[])].map(id=>gardenById(id)?.name).filter(Boolean),action=observationHints[event?.scene];
 if(!names.length||!action)return entry.hint||'庭をそっとのぞいてみよう。';
 const shown=compact?names.slice(0,2):names,places=shown.join('・')+(shown.length<names.length?'など':'');
 return `庭の友達より「${places}で、${action}、${entry.searchClue||'小さなお客さまの姿'}を見かけたよ」`;
}
export function renderEncounterFriendship(w,id,{system=encounterSystem}={}){
 const s=system.status(w,id);if(!s.discovery)return '';
 const full=cageVisitorCount(w)>=FRIENDSHIP_RULES.visitors;
 return `<section class="finch-friendship" aria-label="親しみの記録" data-finch-friendship><div class="finch-bond-heading"><strong>${esc(s.level)}</strong><span>仲よくなった回数 <b data-finch-visits>${s.visits}</b> 回</span></div><label>親しみ <output data-finch-points>${s.points}</output> ポイント<meter min="0" max="100" value="${Math.min(100,s.points)}">${Math.min(100,s.points)} / 100</meter></label><p>${s.canVisit?'大のなかよし！ おうちにも遊びに来てくれるよ。':`おうちに呼べるまで あと ${FRIENDSHIP_RULES.cagePoints-s.points} ポイント`}</p><div class="finch-friendship-actions"><button type="button" data-encounter-invite-garden="${esc(id)}">庭に呼ぶ</button>${s.inCage?`<button type="button" data-finch-go-home>おうちを見に行く</button><button type="button" data-encounter-dismiss-cage="${esc(id)}" data-goodbye-world="${esc(w.worldId)}" data-goodbye-revision="${w.revision}" aria-label="${esc(system.catalog.find(e=>e.id===id)?.name||'友達')}とお別れする。自分のおうちへ帰ってもらう">お別れする</button>`:`<button type="button" data-encounter-invite-cage="${esc(id)}" ${s.canVisit&&!full?'':'disabled'}>おうちに呼ぶ${!s.canVisit?' · 100ポイントから':full?' · お客さま6羽':''}</button>`}</div></section>`;
}
export function encounterCageActors(w,{system=encounterSystem}={}){return (w.encounters.cageVisitors||[]).map(v=>system.catalog.find(e=>e.id===v.id)).filter(Boolean).map(e=>({id:`encounter-${e.id}`,stage:'adult',action:{kind:'visit',target:null,startedTick:0},entry:e}));}
export function renderEncounterCageGuest(entry,{base='/buncho-ureshi/',style=''}={}){return `<button type="button" class="game-room-bird finch-cage-guest" data-cage-guest="${esc(entry.id)}" style="${esc(style)}" aria-label="${esc(entry.name)}。おうちに遊びに来た友達。庭の鳥図鑑をひらく">${encounterBodyArt(entry)?renderEncounterActorArt(entry,base,false):plainPicture(entry,base)}<span>${esc(entry.name)}</span></button>`;}
export function renderEncounterClues(w,{system=encounterSystem,base='/buncho-ureshi/'}={}){
  if(!system.catalog.length)return '';
  if(w.encounters.garden.guestGardenId!==w.encounters.garden.id)return '';
  const active=w.encounters.active;
  const ids=(active?[active.id]:w.encounters.queue).filter(id=>system.catalog.some(e=>e.id===id));
  if(!ids.length)return '';
  return `<section class="finch-clues" aria-label="庭のお客さま">${ids.map(id=>{const entry=system.catalog.find(e=>e.id===id);return `<button type="button" data-encounter-open="${esc(id)}">${picture(entry,base,true)}<span>${active?'さっきのお客さま':esc(entry.hint)}</span><small>${active?'つづきを見る':'そっと見に行く'}</small></button>`;}).join('')}</section>`;
}
export function renderEncounterNotebook(w,{system=encounterSystem,base='/buncho-ureshi/'}={}){
  const seen=system.catalog.filter(e=>system.status(w,e.id).discovered).length;
  const waiting=system.catalog.filter(e=>{const state=system.status(w,e.id);return state.ready||state.active;});
  const invitations=waiting.length?`<section class="finch-clues" aria-label="庭で待っているお客さま">${waiting.map(entry=>{const state=system.status(w,entry.id);return `<button type="button" data-encounter-open="${esc(entry.id)}">${picture(entry,base,!state.discovered)}<span>${esc(gardenById(state.gardenId)?.name||'庭')}で待っているよ</span><small>${state.active?'つづきを見る':'そっと見に行く'}</small></button>`;}).join('')}</section>`:'';
  return `<section class="finch-notebook" aria-labelledby="finch-notebook-title"><header><h3 id="finch-notebook-title" tabindex="-1">庭の鳥図鑑</h3><p>出会い ${seen} / ${system.catalog.length} 図鑑項目</p></header><p class="finch-notebook-intro">庭で出会った鳥と、仲よくなった記録。</p>${invitations}<div class="finch-page-actions"><button type="button" data-finch-go-garden>庭をのぞく</button><button type="button" data-crow-notebook>天敵の記録</button></div>${system.catalog.length?`<div class="finch-catalog">${system.catalog.map((entry,i)=>{const state=system.status(w,entry.id);return `<button type="button" class="finch-card${state.discovered?' is-discovered':''}" data-encounter-page="${esc(entry.id)}" aria-label="${state.discovered?esc(entry.name):`まだ出会っていない鳥 ${i+1}`}">${picture(entry,base,!state.discovered,true)}<span class="finch-number">${String(i+1).padStart(2,'0')}</span><strong>${state.discovered?esc(entry.name):'？？？'}</strong><small>${state.discovered?`${esc(state.level||'また会える仲間')} · ${state.visits||state.discovery?.visits||0}回`:state.ready?'庭で待っているよ':esc(encounterSearchHint(entry,{compact:true}))}</small></button>`;}).join('')}</div>`:'<p>出会いのページを準備しているよ。</p>'}</section>`;
}
export function renderEncounterPage(w,id,{system=encounterSystem,base='/buncho-ureshi/',showPhoto=false}={}){
  const entry=system.catalog.find(e=>e.id===id);if(!entry)return '<p role="status">このページはまだ準備中です。</p>';
  const state=system.status(w,id);
  const resume=state.ready||state.active?`<button type="button" data-encounter-open="${esc(id)}">${esc(gardenById(state.gardenId)?.name||'庭')}で${state.active?'つづきを見る':'会う'}</button>`:'';
  if(!state.discovered){
    const place=(entry.gardenEvent?.gardenIds||[]).map(gardenById).find(Boolean),bg=place?.background;
    const art=bg?.landscape||bg;
    const landscape=(bg?.releaseReady||bg?.trialAvailable)&&art?.src?`<img class="finch-mystery-landscape" src="${esc(base+art.src.replace(/\.png$/,'.screen.webp'))}" width="${art.width}" height="${art.height}" alt="" aria-hidden="true" decoding="async" draggable="false">`:'';
    return `<section class="finch-entry finch-mystery-postcard"><h3 tabindex="-1">庭からの小さな便り</h3><p class="finch-mystery-intro">まだ出会っていない鳥のこと。</p><div class="finch-mystery-letter"><div class="finch-mystery-picture">${landscape}<div class="finch-mystery-stamp" aria-label="まだ名前の分からない鳥の影">${picture(entry,base,true)}<span aria-hidden="true">？？？</span></div></div><h4>${esc(place?place.name+'より':'庭の友達より')}</h4><p data-encounter-search-hint>${esc(encounterSearchHint(entry))}</p></div><p class="finch-mystery-note">ゲームの庭に伝わる目撃ばなしだよ。いつもいるとはかぎらないけれど、庭の「観察する」から試してみてね。すぐに会えないときは、少し待ってまた観察してみよう。</p><div class="finch-page-actions">${resume||`<button type="button" data-finch-go-garden="${esc(place?.id||'')}">庭へ行く</button>`}<button type="button" data-encounter-back>庭の鳥図鑑へ戻る</button></div></section>`;
  }
  const p=entry.photo;
  const petAttrs=state.discovery?`data-encounter-rub="${esc(id)}" tabindex="0" role="button" aria-label="${esc(entry.name)}の画像をなでる。指やマウスでこする、またはEnterキー"`:'';
  const visual=showPhoto?`<figure class="finch-photo" data-photo-unaltered="${p.noDerivatives===true}"><span class="finch-media" data-media-state="pending" ${petAttrs}><img src="${asset(base,p.src)}" data-media-src="${asset(base,p.src)}" decoding="async" width="${p.width}" height="${p.height}" alt="${esc(p.alt)}" draggable="false" loading="lazy" style="object-fit:contain;object-position:center;filter:none;clip-path:none;transform:none;border-radius:0;opacity:1">${mediaStatus}</span><figcaption>${p.caption?`<p>${esc(p.caption)}</p>`:''}${esc(p.creator)} / <a href="${link(p.source)}" target="_blank" rel="noopener noreferrer">写真の原典</a> / <a href="${link(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a><small>${esc(p.modifications)}</small></figcaption></figure>`:`<figure class="finch-record-portrait"><div ${petAttrs}>${picture(entry,base)}</div><figcaption>ゲームのために描いたイラスト${state.discovery?' · 画像をこすってなでよう':''}</figcaption></figure>`;
  return `<article class="finch-entry finch-record-card" aria-labelledby="finch-entry-title"><h3 id="finch-entry-title" tabindex="-1">${esc(entry.name)}</h3><p>${esc(entry.english)}</p>${visual}<div class="finch-view-toggle" role="group" aria-label="鳥の見かた"><button type="button" data-encounter-view="art" aria-pressed="${!showPhoto}"><span aria-hidden="true">${!showPhoto?'✓ ':''}</span>イラスト</button><button type="button" data-encounter-view="photo" aria-pressed="${showPhoto}"><span aria-hidden="true">${showPhoto?'✓ ':''}</span>写真で見る</button></div>${state.discovery?renderEncounterFriendship(w,id,{system}):''}<details class="finch-record-description" data-notebook-reading="description"><summary>どんな鳥？</summary><p class="finch-summary">${esc(entry.summary)}</p><dl><dt>区分</dt><dd>${entry.kind==='domestic-variety'?'飼育品種・品種群':'鳥の種'}</dd><dt>学名</dt><dd><i>${esc(entry.scientific)}</i></dd><dt>なかま</dt><dd>${esc(entry.family)}</dd></dl><p>${esc(entry.appearance)}</p></details><details data-notebook-reading="sources"><summary>資料と出典</summary><p>庭での出会いはゲームの創作です。鳥の説明は下記の資料を参考にしています。</p><ul>${entry.sources.map(s=>`<li><a href="${link(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></details>${state.discovery?'<details class="finch-friendship-rules" data-notebook-reading="rules"><summary>親しみと招待のルール</summary><p>会話はいつでも楽しめます。出会いの親しみは8分に1回、10ポイント増えます。画像をなでても仲よくなれます。おうちのお客さまは文鳥も合わせて6羽まで。しばらく遊ぶと帰ります。お別れしても親しみや図鑑は残り、また招けます。</p></details>':''}<div class="finch-page-actions">${resume}${entry.kind==='baseline-species'?'<p>いつもいっしょの文鳥</p>':`<button type="button" data-finch-go-garden>庭をのぞく</button>`}<button type="button" data-encounter-back>庭の鳥図鑑へ戻る</button></div></article>`;
}
export function renderEncounterScene(w,{system=encounterSystem,base='/buncho-ureshi/'}={}){
  const active=w.encounters.active,entry=active&&system.catalog.find(e=>e.id===active.id);if(!entry)return '';
  const step=entry.steps[active.step],known=system.status(w,entry.id).discovered,firstReward=!!w.economy&&!known&&active.step===entry.steps.length-1&&!w.economy.firstMeetingClaimed.includes(entry.id);
  return `<section class="finch-event" aria-labelledby="finch-event-title" data-encounter-instance="${active.instanceId}" data-encounter-revision="${w.revision}" data-encounter-world="${esc(w.worldId)}"><h3 id="finch-event-title" tabindex="-1">${esc(entry.eventTitle)}</h3>${picture(entry,base,!known)}<p>${known?esc(entry.revisit):esc(step.text)}</p><div class="finch-page-actions"><button type="button" data-encounter-act="${esc(step.action)}">${firstReward?'庭の鳥図鑑をひらく · 5 Gems':esc(step.label)}</button><button type="button" data-encounter-close>あとでつづける</button></div><small>この出会いはゲームの物語です。</small></section>`;
}

/** Familiar bird page: no discovery, spawn, reward, migration or counter mutation. */
export function renderJavaBaselinePage(w,{baseline=PUBLISHED_JAVA_BASELINE,base='/buncho-ureshi/',showPhoto=false}={}){
 if(!baseline||baseline.id!=='java-sparrow'||baseline.kind!=='baseline-species')return '<p role="status">文鳥の資料ページを準備しているよ。</p>';
 return renderEncounterPage(w,baseline.id,{base,showPhoto,system:{catalog:[baseline],status:()=>({discovered:true})}});
}

/** Presentation-only preview option is for the isolated QA fixture; never changes readiness. */
export function renderGardenStage(w,{system=encounterSystem,base='/buncho-ureshi/',previewBackgrounds=false,selectedBirdId=null,crowWarning=null,now=Date.now()}={}){
 const crow=crowScene(w,now),raptor=raptorScene(w);
 const place=gardenById(w.encounters.garden.id),bg=place.background,companions=gardenCompanionRoster(w);
 const art=(bg.releaseReady||bg.trialAvailable||previewBackgrounds)&&bg.src;
 // CSS consumes the same source anchor and cover clamp as gardenStageGeometry.
 const anchor=bg.friendFeet[Math.min(1,bg.friendFeet.length-1)],ratio=bg.width/bg.height;
 const artRecord=b=>({src:base+b.src.replace(/\.png$/,'.screen.webp')+'?v='+b.sha256.slice(0,12),width:b.width,height:b.height,anchor:b.friendFeet[Math.min(1,b.friendFeet.length-1)]});
 const responsive=bg.landscape?` data-garden-portrait="${esc(JSON.stringify(artRecord(bg)))}" data-garden-landscape="${esc(JSON.stringify(artRecord(bg.landscape)))}" data-garden-min-aspect="${bg.landscapeMinAspect}"`:'';
 const backdrop=()=>art?`<img class="finch-garden-background"${responsive} src="${esc(bg.landscape?artRecord(bg).src:base+bg.src.replace(/\.png$/,'.screen.webp'))}" decoding="async" fetchpriority="high" alt="${esc(place.description)}" width="${bg.width}" height="${bg.height}" draggable="false">`:place.objects.map((name,i)=>`<span class="garden-prop garden-prop-${i}" aria-hidden="true"><span>${esc(name)}</span></span>`).join('');
 const offsets=place.id==='mizukagami'?[[-1.15,-.65],[1.15,-.65],[-1.15,.15],[1.15,.15]]:[[-1.2,-.55],[1.2,-.55],[-1.2,.75],[1.2,.75]];
 const eligible=b=>b.home==='resident'&&['juvenile','adult'].includes(b.stage);
 const protagonist=getProtagonistBird(w),lead=protagonist&&eligible(protagonist)&&companions.some(b=>b.birdId===protagonist.id)?protagonist:null;
 const allHouseholdBirds=companions;
 const householdBirds=raptor?.hostile?[]:raptor?allHouseholdBirds.filter(b=>b.birdId!==raptorTarget(w)?.id):crow?.retreat?(crow.phase==='visiting'?[]:allHouseholdBirds.filter(b=>b.birdId===crow.targetBirdId)):crow?.phase==='visiting'?allHouseholdBirds.filter(b=>b.birdId!==crow.targetBirdId):allHouseholdBirds;
 const householdIds=new Set(householdBirds.map(b=>b.birdId));
 const friends=(crow?.retreat||raptor?.hostile?[]:gardenFriendRoster(w,place.id)).filter(f=>!f.birdId||!householdIds.has(f.birdId));
 const g=w.encounters.garden, waiting=w.encounters.active?.id||w.encounters.queue[0], lingering=!waiting?g.lastGuest:null;
 const guestId=!raptor?.hostile&&!crow?.retreat&&g.guestGardenId===place.id?(waiting||lingering):null,guest=guestId&&system.catalog.find(e=>e.id===guestId);
 const visiting=!raptor?.hostile&&!crow?.retreat?getGardenVisitingBird(w):null;
 const count=friends.length+householdBirds.length+(guest?1:0)+(visiting?1:0),compact=count>6;
 // Keep the established six terrain positions; companions occupy any unused positions.
 const slots=[...offsets,[0,place.id==='mizukagami'?.15:.75],[0,place.id==='mizukagami'?-.65:-.55]];
 const occupied=new Set([...friends.map((_,i)=>i),...(lead?[4]:[]),...(guest?[5]:[])]);
 const visitingSlot=visiting?(slots.findIndex((_,i)=>!occupied.has(i))):null;
 if(visitingSlot!==null)occupied.add(visitingSlot);
 const free=slots.map((_,i)=>i).filter(i=>!occupied.has(i));
 const dense=[[-1.15,0],[0,0],[1.15,0],[-1.5,1],[-.5,1],[.5,1],[1.5,1],[-1.15,2],[0,2],[1.15,2]];
 let denseIndex=0;
 const position=slot=>{
  const [dx,dy]=compact?dense[denseIndex++]:slots[slot];
  const y=compact?`calc(var(--garden-anchor-y) * 100% + ${place.id==='mizukagami'?'.15':'.75'} * min(17cqh,110px) - ${2-dy} * var(--garden-row-gap))`:`calc(var(--garden-anchor-y) * 100% + ${dy} * min(17cqh,110px))`;
  return `left:calc(var(--garden-anchor-x) * 100% + ${dx} * min(22cqw,120px));top:${y}`;
 };
 const bird=(f,index)=>{const color=['white','sakura','silver','cinnamon'].includes(f.color)?f.color:'white';return `<button type="button" class="finch-garden-friend" style="${position(index)}" data-garden-friend="${esc(f.friendId)}" data-garden-friend-action="chat" aria-label="${esc(f.name)}と庭でおしゃべり">${renderGardenBirdSprite(color,f.friendId,{base})}<span class="finch-friend-name">${esc(f.name)}</span></button>`;};
 const friendMarkup=friends.map(bird).join('');
 const household=householdBirds.map(b=>`<button type="button" class="finch-garden-household" data-garden-household="${esc(b.birdId)}" aria-label="${esc(b.name)}とふれあう" style="${position(b.birdId===lead?.id?4:free.shift())}">${renderGardenBirdSprite(b.color,b.birdId,{base})}<span class="finch-friend-name">${esc(b.name)}</span></button>`).join('');
 const visitor=guest?`<button type="button" class="finch-garden-visitor" ${waiting?`data-encounter-open="${esc(guest.id)}"`:`data-encounter-page="${esc(guest.id)}"`} aria-label="${waiting?'庭に来たお客さまに会う':'庭の鳥図鑑でお客さまを見る'}" style="${position(5)}">${renderEncounterActorArt(guest,base)}<span>${guest.gardenEvent?.gardenIds?.includes(place.id)?'この庭の鳥':'遊びに来た友達'}</span></button>`:'';
 const visitingMarkup=visiting?`<button type="button" class="finch-garden-visitor" data-garden-visiting-friend="${esc(visiting.id)}" data-encounter-page="${esc(visiting.id)}" aria-label="遊びに来た友達・${esc(visiting.name)}の図鑑を見る" style="${position(visitingSlot)}">${renderEncounterActorArt(visiting,base)}<span>遊びに来た友達</span></button>`:'';
 return `<div class="finch-garden-scenery finch-garden-stage" data-scene-state="loading" data-garden-id="${place.id}" data-garden-count="${count}" data-garden-density="${compact?'compact':'regular'}" data-garden-fit="cover" aria-label="${esc(place.description)}"><div class="finch-garden-carousel"><div class="finch-garden-slide"><div class="finch-garden-image-plane" style="--garden-image-ratio:${ratio};--garden-anchor-x:${anchor.x};--garden-anchor-y:${anchor.y}" data-image-width="${bg.width}" data-image-height="${bg.height}">${backdrop()}${friendMarkup}${household}${visitor}${visitingMarkup}</div></div></div>${renderCrowScene(w,{base,warning:crowWarning,now})}${renderRaptorScene(w,{base})}<div class="finch-garden-loading" role="status"><span class="finch-loading-bird" aria-hidden="true">♪</span><span data-media-label>小鳥たちが庭を準備しているよ…</span><button type="button" data-media-retry hidden>もう一度読み込む</button></div></div>`;
}

/** Explain the native encounter without changing visits, clocks or discoveries. */
export function renderGardenEncounterNotice(w,{now=Date.now()}={}){
 if(raptorScene(w)?.hostile||crowScene(w,now)?.retreat)return '<p class="finch-garden-empty" data-garden-encounter-notice="sheltering">いまは鳥たちが身を隠しているよ。落ち着いたら、また会おう。<button type="button" data-finch-go-home>おうちへ帰る</button></p>';
 const availability=getGardenEncounterAvailability(w);
 if(!availability?.bird)return '';
 const {reason,bird,gardenId,scene}=availability;
 const labels={grass:'草を観察する',water:'水辺を観察する',branch:'枝を見上げる',song:'歌を聴く',quiet:'ひとやすみ'};
 if(reason==='pending-elsewhere')return `<p class="finch-garden-empty" data-garden-encounter-notice="${reason}">${esc(bird.name)}は、別の庭で待っているよ。<button type="button" data-garden-select="${esc(gardenId)}">${esc(gardenById(gardenId)?.name||'待っている庭')}へ行く</button></p>`;
 if(reason==='at-home')return `<p class="finch-garden-empty" data-garden-encounter-notice="${reason}">${esc(bird.name)}は、いまおうちに遊びに来ているよ。<button type="button" data-finch-go-home>おうちを見に行く</button></p>`;
 if(reason==='pending-here')return `<p class="finch-garden-empty" data-garden-encounter-notice="${reason}">まずは、待っているお客さまとの時間を楽しもう。<button type="button" data-encounter-open="${esc(w.encounters.active?.id||w.encounters.queue[0]||bird.id)}">出会いのつづきを見る</button></p>`;
 return `<p class="finch-garden-empty" data-garden-encounter-notice="ready">この庭の鳥に会うには、「観察する」の「${esc(labels[scene]||'ひとやすみ')}」を選んでみよう。</p>`;
}

export function renderFinchGarden(w,{system=encounterSystem,base='/buncho-ureshi/',selectedBirdId=null,crowWarning=null,companionDraft=null,companionMessage='',now=Date.now()}={}){
 const g=w.encounters.garden,place=gardenById(g.id),scenes=[['grass','草を観察する'],['water','水辺を観察する'],['branch','枝を見上げる'],['song','歌を聴く'],['quiet','ひとやすみ']];
 const crow=crowScene(w,now),friends=crow?.retreat?[]:gardenFriendRoster(w,g.id);
 return `<section class="finch-garden" data-garden-world="${esc(w.worldId)}" data-garden-revision="${w.revision}" aria-labelledby="finch-garden-title"><header><h3 id="finch-garden-title" tabindex="-1">${esc(place.name)}</h3><button type="button" data-encounter-back aria-label="庭の鳥図鑑"><span>庭の</span><span>鳥図鑑</span></button></header><div class="finch-garden-selector-wrap"><button type="button" class="finch-garden-scroll" data-garden-scroll="previous" aria-label="前の庭を表示">‹</button><nav class="finch-garden-selector garden-jog" data-garden-jog aria-label="遊びに行く庭。上下に回すと移動"><div class="garden-jog-cylinder"><span data-jog-before aria-hidden="true"></span><button type="button" data-jog-center data-garden-select="${g.id}" aria-current="page">${esc(place.name)}</button><span data-jog-after aria-hidden="true"></span></div><small data-jog-count aria-hidden="true"></small></nav><button type="button" class="finch-garden-scroll" data-garden-scroll="next" aria-label="次の庭を表示">›</button></div>${renderGardenStage(w,{system,base,selectedBirdId,crowWarning,now})}${renderCrowNotice(w,{warning:crowWarning,now})}${renderGardenEncounterNotice(w,{now})}${`<p class="finch-garden-empty">${friends.length?'友達とゆっくり過ごそう。':'いまは静かな庭。ゆっくり観察してみよう。'}</p>`}<div class="finch-garden-dock"><details name="garden-tools" data-garden-details="observe" class="finch-observe-menu"><summary>観察する</summary><p class="finch-bookmark-title">庭のしおり</p><div class="finch-garden-actions" role="group" aria-label="庭で過ごす">${scenes.map(([id,label])=>`<button type="button" data-garden-observe="${id}" aria-pressed="${g.scene===id}" ${w.encounters.active||w.encounters.queue.length?'disabled':''}><span class="finch-bookmark-check" aria-hidden="true">${g.scene===id?'✓':''}</span><span>${label}</span><span class="finch-bookmark-next" aria-hidden="true">›</span></button>`).join('')}</div></details>${renderGardenFriendCards({
  gardenId: place.id,
  gardenName: place.name,
  base,
  friends: friends.map(f => ({
    friendId: f.friendId,
    name: f.name,
    affinity: f.affinity,
    personality: f.personality,
    portraitFile: `${f.birdId && w.birds.find(b => b.id === f.birdId)?.stage === 'juvenile' ? 'juvenile-' : ''}${f.color}.webp`,
    memories: f.memories.slice(-3),
    actions: place.actions.map(([kind, label]) => ({kind, label, disabled: false, disabledReason: ''}))
  }))
})}${renderCompanionSettings(w,{draft:companionDraft,message:companionMessage,base})}${renderGardenAboutBooklet({name:place.name,description:place.description,landform:place.landform,art:(place.background.releaseReady||place.background.trialAvailable)?(()=>{const a=place.background.landscape||place.background;return {src:new URL(base,'https://booklet.invalid/').pathname+a.src.replace(/\.png$/,'.screen.webp')+'?v='+a.sha256.slice(0,12),width:a.width,height:a.height,alt:place.description};})():null})}</div></section>`;
}

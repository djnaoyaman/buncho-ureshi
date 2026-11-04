import {renderGardenBirdSprite} from './garden-bird-motion.js';
/** Render-only notebook / event surfaces. Caller owns atomic actions and focus lifecycle. */
import { encounterSystem,FRIENDSHIP_RULES,cageVisitorCount } from './encounters.js';
import {GARDENS,gardenById,gardenFriendRoster,gardenCompanionRoster,gardenStageGeometry} from './data/gardens.js';
import {PUBLISHED_JAVA_BASELINE} from './data/encounter-catalog.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset=(base,path)=>typeof path==='string'&&(/^(?:game-art\/finches\/[a-z0-9/_-]+(?:\.(?:screen|thumb))?\.(png|webp|jpe?g)|game-art\/sakura\.webp)$/.test(path))&&!path.includes('..')?esc(base+path):'';
const link=url=>typeof url==='string'&&/^https:\/\/[^\s<>"']+$/.test(url)?esc(url):'';
const delivery=(path,thumbnail=false)=>/^game-art\/finches\/[a-z0-9_-]+\.png$/.test(path)?path.replace(/\.png$/,thumbnail?'.thumb.webp':'.screen.webp'):path;
const mediaStatus='<span class="finch-media-status" aria-hidden="true"><span class="finch-loading-bird">♪</span><span data-media-label>読み込み中…</span></span>';
const plainPicture=(entry,base)=>`<img src="${asset(base,delivery(entry.art.src))}" width="${entry.art.width}" height="${entry.art.height}" alt="${esc(entry.art.alt)}" draggable="false" decoding="async" class="finch-art">`;
const picture=(entry,base,hidden=false,thumbnail=false)=>`<span class="finch-media" data-media-state="pending"><img ${thumbnail?'':'src="'+asset(base,delivery(entry.art.src))+'"'} data-media-src="${asset(base,delivery(entry.art.src,thumbnail))}" ${thumbnail?'data-media-lazy="true"':''} width="${entry.art.width}" height="${entry.art.height}" alt="${hidden?'':esc(entry.art.alt)}" draggable="false" decoding="async" class="finch-art${hidden?' is-silhouette':''}">${mediaStatus}</span>`;
export function renderEncounterFriendship(w,id,{system=encounterSystem}={}){
 const s=system.status(w,id);if(!s.discovery)return '';
 const full=cageVisitorCount(w)>=FRIENDSHIP_RULES.visitors;
 return `<section class="finch-friendship" aria-label="親しみの記録" data-finch-friendship><div class="finch-bond-heading"><strong>${esc(s.level)}</strong><span>会った回数 <b data-finch-visits>${s.visits}</b> 回</span></div><label>親しみ <output data-finch-points>${s.points}</output> ポイント<meter min="0" max="100" value="${Math.min(100,s.points)}">${Math.min(100,s.points)} / 100</meter></label><p>${s.canVisit?'大のなかよし！ 籠にも遊びに来てくれるよ。':`籠に呼べるまで あと ${FRIENDSHIP_RULES.cagePoints-s.points} ポイント`}</p><div class="finch-friendship-actions"><button type="button" data-encounter-invite-garden="${esc(id)}">庭に呼ぶ</button>${s.inCage?`<button type="button" data-finch-go-home>籠を見に行く</button><button type="button" data-encounter-dismiss-cage="${esc(id)}">またね、と見送る</button>`:`<button type="button" data-encounter-invite-cage="${esc(id)}" ${s.canVisit&&!full?'':'disabled'}>籠に呼ぶ${!s.canVisit?' · 100ポイントから':full?' · お客さま2羽':''}</button>`}</div><small>出会うたびに10ポイント。画像をなでると親しみが増えます。籠のお客さまは文鳥も合わせて2羽まで。しばらく遊ぶと帰ります。</small></section>`;
}
export function encounterCageActors(w,{system=encounterSystem}={}){return (w.encounters.cageVisitors||[]).map(v=>system.catalog.find(e=>e.id===v.id)).filter(Boolean).map(e=>({id:`encounter-${e.id}`,stage:'adult',action:{kind:'visit',target:null,startedTick:0},entry:e}));}
export function renderEncounterCageGuest(entry,{base='/buncho-ureshi/',style=''}={}){return `<button type="button" class="game-room-bird finch-cage-guest" data-cage-guest="${esc(entry.id)}" style="${esc(style)}" aria-label="${esc(entry.name)}。籠に遊びに来た友達。図鑑をひらく">${plainPicture(entry,base)}<span>${esc(entry.name)}</span></button>`;}
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
  return `<section class="finch-notebook" aria-labelledby="finch-notebook-title"><header><h3 id="finch-notebook-title" tabindex="-1">出会いの図鑑</h3><p>出会い ${seen} / ${system.catalog.length} 図鑑項目</p></header><button type="button" data-finch-go-garden>庭をのぞく</button>${system.catalog.length?`<div class="finch-catalog">${system.catalog.map((entry,i)=>{const state=system.status(w,entry.id);return `<button type="button" class="finch-card${state.discovered?' is-discovered':''}" data-encounter-page="${esc(entry.id)}" aria-label="${state.discovered?esc(entry.name):`まだ出会っていない鳥 ${i+1}`}">${picture(entry,base,!state.discovered,true)}<span class="finch-number">${String(i+1).padStart(2,'0')}</span><strong>${state.discovered?esc(entry.name):'？？？'}</strong><small>${state.discovered?`${esc(state.level||'また会える仲間')} · ${state.visits||state.discovery?.visits||0}回`:state.ready?'庭で待っているよ':esc(entry.hint)}</small></button>`;}).join('')}</div>`:'<p>出会いのページを準備しているよ。</p>'}</section>`;
}
export function renderEncounterPage(w,id,{system=encounterSystem,base='/buncho-ureshi/',showPhoto=false}={}){
  const entry=system.catalog.find(e=>e.id===id);if(!entry)return '<p role="status">このページはまだ準備中です。</p>';
  const state=system.status(w,id);
  if(!state.discovered)return `<section class="finch-entry"><h3 tabindex="-1">まだ出会っていない鳥</h3>${picture(entry,base,true)}<p>${esc(entry.hint)}</p><button type="button" data-finch-go-garden>庭へ行く</button><button type="button" data-encounter-back>図鑑へ戻る</button></section>`;
  const p=entry.photo;
  const petAttrs=state.discovery?`data-encounter-rub="${esc(id)}" tabindex="0" role="button" aria-label="${esc(entry.name)}の画像をなでる。指やマウスでこする、またはEnterキー"`:'';
  const visual=showPhoto?`<figure class="finch-photo" data-photo-unaltered="${p.noDerivatives===true}"><span class="finch-media" data-media-state="pending" ${petAttrs}><img src="${asset(base,p.src)}" data-media-src="${asset(base,p.src)}" decoding="async" width="${p.width}" height="${p.height}" alt="${esc(p.alt)}" draggable="false" loading="lazy" style="object-fit:contain;object-position:center;filter:none;clip-path:none;transform:none;border-radius:0;opacity:1">${mediaStatus}</span><figcaption>${p.caption?`<p>${esc(p.caption)}</p>`:''}${esc(p.creator)} / <a href="${link(p.source)}" target="_blank" rel="noopener noreferrer">写真の原典</a> / <a href="${link(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a><small>${esc(p.modifications)}</small></figcaption></figure>`:`<figure><div ${petAttrs}>${picture(entry,base)}</div><figcaption>ゲームのために描いたイラスト${state.discovery?' · 画像をこすってなでよう':''}</figcaption></figure>`;
  return `<article class="finch-entry" aria-labelledby="finch-entry-title"><h3 id="finch-entry-title" tabindex="-1">${esc(entry.name)}</h3><p>${esc(entry.english)}</p>${visual}${state.discovery?renderEncounterFriendship(w,id,{system}):''}<div class="finch-view-toggle" role="group" aria-label="鳥の見かた"><button type="button" data-encounter-view="art" aria-pressed="${!showPhoto}">イラスト</button><button type="button" data-encounter-view="photo" aria-pressed="${showPhoto}">写真で見る</button></div><p class="finch-summary">${esc(entry.summary)}</p><details><summary>どんな鳥？</summary><dl><dt>区分</dt><dd>${entry.kind==='domestic-variety'?'飼育品種・品種群':'鳥の種'}</dd><dt>学名</dt><dd><i>${esc(entry.scientific)}</i></dd><dt>なかま</dt><dd>${esc(entry.family)}</dd></dl><p>${esc(entry.appearance)}</p></details><details><summary>資料と出典</summary><p>庭での出会いはゲームの創作です。鳥の説明は下記の資料を参考にしています。</p><ul>${entry.sources.map(s=>`<li><a href="${link(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></details>${entry.kind==='baseline-species'?'<p>いつもいっしょの文鳥</p>':`<button type="button" data-finch-go-garden>庭をのぞく</button>`}<button type="button" data-encounter-back>図鑑へ戻る</button></article>`;
}
export function renderEncounterScene(w,{system=encounterSystem,base='/buncho-ureshi/'}={}){
  const active=w.encounters.active,entry=active&&system.catalog.find(e=>e.id===active.id);if(!entry)return '';
  const step=entry.steps[active.step],known=system.status(w,entry.id).discovered,firstReward=!!w.economy&&!known&&active.step===entry.steps.length-1&&!w.economy.firstMeetingClaimed.includes(entry.id);
  return `<section class="finch-event" aria-labelledby="finch-event-title" data-encounter-instance="${active.instanceId}" data-encounter-revision="${w.revision}" data-encounter-world="${esc(w.worldId)}"><h3 id="finch-event-title" tabindex="-1">${esc(entry.eventTitle)}</h3>${picture(entry,base,!known)}<p>${known?esc(entry.revisit):esc(step.text)}</p><button type="button" data-encounter-act="${esc(step.action)}">${firstReward?'図鑑をひらく · 5 Gems':esc(step.label)}</button><button type="button" data-encounter-close>あとでつづける</button><small>この出会いはゲームの物語です。</small></section>`;
}

/** Familiar bird page: no discovery, spawn, reward, migration or counter mutation. */
export function renderJavaBaselinePage(w,{baseline=PUBLISHED_JAVA_BASELINE,base='/buncho-ureshi/',showPhoto=false}={}){
 if(!baseline||baseline.id!=='java-sparrow'||baseline.kind!=='baseline-species')return '<p role="status">文鳥の資料ページを準備しているよ。</p>';
 return renderEncounterPage(w,baseline.id,{base,showPhoto,system:{catalog:[baseline],status:()=>({discovered:true})}});
}

/** Presentation-only preview option is for the isolated QA fixture; never changes readiness. */
export function renderGardenStage(w,{system=encounterSystem,base='/buncho-ureshi/',previewBackgrounds=false,selectedBirdId=null}={}){
 const place=gardenById(w.encounters.garden.id),bg=place.background,companions=gardenCompanionRoster(w);
 const art=(bg.releaseReady||bg.trialAvailable||previewBackgrounds)&&bg.src;
 // CSS consumes the same source anchor and cover clamp as gardenStageGeometry.
 const native=gardenStageGeometry(place.id,bg.width,bg.height),ratio=bg.width/bg.height;
 const backdrop=()=>art?`<img class="finch-garden-background" src="${esc(base+bg.src.replace(/\.png$/,'.screen.webp'))}" decoding="async" fetchpriority="high" alt="${esc(place.description)}" width="${bg.width}" height="${bg.height}" draggable="false">`:place.objects.map((name,i)=>`<span class="garden-prop garden-prop-${i}" aria-hidden="true"><span>${esc(name)}</span></span>`).join('');
 const offsets=place.id==='mizukagami'?[[-1.15,-.65],[1.15,-.65],[-1.15,.15],[1.15,.15]]:[[-1.2,-.55],[1.2,-.55],[-1.2,.75],[1.2,.75]];
 const eligible=b=>b.home==='resident'&&['juvenile','adult'].includes(b.stage);
 const lead=w.birds.find(b=>b.id===selectedBirdId&&eligible(b))||w.birds.find(eligible);
 const householdBirds=[...(lead?[{birdId:lead.id,name:lead.name,color:lead.color}]:[]),...companions].filter((b,i,all)=>all.findIndex(x=>x.birdId===b.birdId)===i);
 const householdIds=new Set(householdBirds.map(b=>b.birdId));
 const friends=gardenFriendRoster(w,place.id).filter(f=>!f.birdId||!householdIds.has(f.birdId));
 const p=native.friends[native.selectedIndex];
 const g=w.encounters.garden, waiting=w.encounters.active?.id||w.encounters.queue[0], lingering=!waiting?g.lastGuest:null;
 const guestId=g.guestGardenId===place.id?(waiting||lingering):null,guest=guestId&&system.catalog.find(e=>e.id===guestId);
 const count=friends.length+householdBirds.length+(guest?1:0),compact=count>6;
 // Keep the established six terrain positions; companions occupy any unused positions.
 const slots=[...offsets,[0,place.id==='mizukagami'?.15:.75],[0,place.id==='mizukagami'?-.65:-.55]];
 const occupied=new Set([...friends.map((_,i)=>i),...(lead?[4]:[]),...(guest?[5]:[])]);
 const free=slots.map((_,i)=>i).filter(i=>!occupied.has(i));
 const dense=[[-1.15,0],[0,0],[1.15,0],[-1.5,1],[-.5,1],[.5,1],[1.5,1],[-1.15,2],[0,2],[1.15,2]];
 let denseIndex=0;
 const position=slot=>{
  const [dx,dy]=compact?dense[denseIndex++]:slots[slot];
  const y=compact?`calc(${p.y/bg.height*100}% + ${place.id==='mizukagami'?'.15':'.75'} * min(17cqh,110px) - ${2-dy} * var(--garden-row-gap))`:`calc(${p.y/bg.height*100}% + ${dy} * min(17cqh,110px))`;
  return `left:calc(${p.x/bg.width*100}% + ${dx} * min(22cqw,120px));top:${y}`;
 };
 const bird=(f,index)=>{const color=['white','sakura','silver','cinnamon'].includes(f.color)?f.color:'white';return `<button type="button" class="finch-garden-friend" style="${position(index)}" data-garden-friend="${esc(f.friendId)}" data-garden-friend-action="chat" aria-label="${esc(f.name)}と庭でおしゃべり">${renderGardenBirdSprite(color,f.friendId,{base})}<span class="finch-friend-name">${esc(f.name)}</span></button>`;};
 const friendMarkup=friends.map(bird).join('');
 const household=householdBirds.map(b=>`<button type="button" class="finch-garden-household" data-garden-household="${esc(b.birdId)}" aria-label="${esc(b.name)}とふれあう" style="${position(b.birdId===lead?.id?4:free.shift())}">${renderGardenBirdSprite(b.color,b.birdId,{base})}<span class="finch-friend-name">${esc(b.name)}</span></button>`).join('');
 const visitor=guest?`<button type="button" class="finch-garden-visitor" ${waiting?`data-encounter-open="${esc(guest.id)}"`:`data-encounter-page="${esc(guest.id)}"`} aria-label="${waiting?'庭に来たお客さまに会う':'お客さまの図鑑を見る'}" style="${position(5)}">${picture(guest,base)}<span>お客さま</span></button>`:'';
 return `<div class="finch-garden-scenery finch-garden-stage" data-scene-state="loading" data-garden-id="${place.id}" data-garden-count="${count}" data-garden-density="${compact?'compact':'regular'}" data-garden-fit="cover" aria-label="${esc(place.description)}"><div class="finch-garden-carousel"><div class="finch-garden-slide"><div class="finch-garden-image-plane" style="--garden-image-ratio:${ratio};--garden-anchor-x:${p.x/bg.width};--garden-anchor-y:${p.y/bg.height}" data-image-width="${bg.width}" data-image-height="${bg.height}">${backdrop()}${friendMarkup}${household}${visitor}</div></div></div><div class="finch-garden-loading" role="status"><span class="finch-loading-bird" aria-hidden="true">♪</span><span data-media-label>小鳥たちが庭を準備しているよ…</span><button type="button" data-media-retry hidden>もう一度読み込む</button></div></div>`;
}

export function renderFinchGarden(w,{system=encounterSystem,base='/buncho-ureshi/',selectedBirdId=null}={}){
 const g=w.encounters.garden,place=gardenById(g.id),scenes=[['grass','草を眺める'],['water','水辺を眺める'],['branch','枝を見上げる'],['song','歌を聴く'],['quiet','ひとやすみ']];
 const friends=gardenFriendRoster(w,g.id),companions=gardenCompanionRoster(w),guestElsewhere=g.guestGardenId&&g.guestGardenId!==g.id&&(w.encounters.active||w.encounters.queue.length||g.lastGuest);
 return `<section class="finch-garden" data-garden-world="${esc(w.worldId)}" data-garden-revision="${w.revision}" aria-labelledby="finch-garden-title"><header><h3 id="finch-garden-title" tabindex="-1">${esc(place.name)}</h3><button type="button" data-encounter-back>図鑑</button></header><div class="finch-garden-selector-wrap"><button type="button" class="finch-garden-scroll" data-garden-scroll="previous" aria-label="前の庭を表示">‹</button><nav class="finch-garden-selector" aria-label="遊びに行く庭">${GARDENS.map(x=>`<button type="button" data-garden-select="${x.id}" aria-current="${x.id===g.id?'page':'false'}">${esc(x.name)}</button>`).join('')}</nav><button type="button" class="finch-garden-scroll" data-garden-scroll="next" aria-label="次の庭を表示">›</button></div>${renderGardenStage(w,{system,base,selectedBirdId})}${`<p class="finch-garden-empty">${friends.length?'友達とゆっくり過ごそう。':'いまは静かな庭。ゆっくり眺めてみよう。'}</p>`}<div class="finch-garden-dock">${guestElsewhere?`<button type="button" data-garden-select="${esc(g.guestGardenId)}">${esc(gardenById(g.guestGardenId).name)}のお客さまへ</button>`:''}<details name="garden-tools" data-garden-details="observe" class="finch-observe-menu"><summary>眺める</summary><div class="finch-garden-actions" role="group" aria-label="庭で過ごす">${scenes.map(([id,label])=>`<button type="button" data-garden-observe="${id}" aria-pressed="${g.scene===id}" ${w.encounters.active||w.encounters.queue.length?'disabled':''}>${label}</button>`).join('')}</div></details>${friends.length?`<details name="garden-tools" data-garden-details="friends"><summary>友達</summary>${friends.map(({friendId,name,affinity,personality,memories})=>{return `<p>${esc(name)} · 庭のなかよし ${affinity}/100</p><small>${esc(personality)}</small>${memories.length?`<details data-garden-details="memory-${esc(friendId)}"><summary>庭の思い出</summary><ul>${memories.slice(-3).map(m=>`<li>${esc(m.text)}</li>`).join('')}</ul></details>`:''}${place.actions.map(([kind,label])=>`<button type="button" data-garden-friend="${esc(friendId)}" data-garden-friend-action="${kind}">${esc(label)}</button>`).join('')}`;}).join('')}</details>`:''}<details name="garden-tools" data-garden-details="companions"><summary aria-label="いっしょに来た家族">同行</summary><p>${companions.map(b=>esc(b.name)).join('、')||'今はひとりでおでかけ'}</p>${w.birds.filter(b=>b.home==='resident'&&['juvenile','adult'].includes(b.stage)).map(b=>`<button type="button" data-garden-companion="${esc(b.id)}" aria-pressed="${companions.some(x=>x.birdId===b.id)}">${esc(b.name)}</button>`).join('')}</details><details name="garden-tools" data-garden-details="about"><summary>庭のこと</summary><p>${esc(place.description)}</p><p>いつでも遊べる、ゲームの創作の庭です。現実の季節・渡来・由緒を示すものではありません。留守にしても出会いは待っていてくれるよ。</p></details></div></section>`;
}

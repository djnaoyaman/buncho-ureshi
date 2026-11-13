import {gardenById} from './data/gardens.js';
import {GARDEN_REGULARS} from './garden-friends.js';
import {expeditionStatus} from './garden-expedition.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title='<ruby>鳥<rt>とり</rt></ruby>たちの<ruby>小<rt>ちい</rt></ruby>さな<ruby>探検<rt>たんけん</rt></ruby>';
export const EXPEDITION_PATH_LABELS=Object.freeze({brook:'みずべの ほとり',grove:'こかげの こみち',flower:'はなの まわり'});
const hints={brook:'ひかりや おとの かけらを さがそう',grove:'かげと かたちを たどってみよう',flower:'いろと かおりの おたよりを みつけよう'};
const favorites={chat:'おはなしが すき',watch:'よく みるのが すき',play:'あそぶのが すき'};
const bird=id=>GARDEN_REGULARS.find(r=>r.id===id);
const art=()=>'<svg class="leaf-gift-art expedition-art" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><path d="M14 20 37 13 61 21 82 14V74L60 82 36 74 14 82Z" fill="#f2e5bd" stroke="#807454" stroke-width="2"/><path d="M37 14v60M61 22v59" stroke="#c5b98b" fill="none"/><path d="M23 63Q67 66 69 31" stroke="#759078" stroke-width="3" stroke-dasharray="4 5" fill="none"/><circle cx="69" cy="30" r="6" fill="#b77f55"/></svg>';
const portrait=(b,base,right=false)=>b?`<figure class="leaf-gift-bird ${right?'leaf-gift-right':'leaf-gift-left'}"><img src="${esc(base)}game-art/${['white','sakura','silver','cinnamon'].includes(b.appearance?.color)?b.appearance.color:'white'}.webp" width="1160" height="1359" alt="" draggable="false"><figcaption>${esc(b.name)}</figcaption></figure>`:'';
const scene=(e,base)=>`<div class="leaf-gift-vignette">${portrait(bird(e.actorIds[0]),base)}${art()}${portrait(bird(e.actorIds[1]),base,true)}</div>`;
export function expeditionNarrative(entry){
 if(!entry)return '';
 const a=bird(entry.actorIds[0]),b=bird(entry.actorIds[1]);
 const first={chat:'「なにが あるかな？」と、はなしながら みちを えらんだ。',watch:'ちいさな ちがいに きづいて、そっと たちどまった。',play:'ぴょん、と はずんで、みんなの あしどりを かるくした。'};
 const second={chat:'その はっけんに なまえを つけて、ふたりの おはなしにした。',watch:'そばで じっくり みると、ひとりでは みえなかった もようが あった。',play:'みつけた かたちを まねして あそぶと、ふたりとも にっこり。'};
 const place={brook:'みずには はいらず、あんぜんな ほとりから ながめよう。',grove:'いつもの こかげも、ともだちとなら ちがって みえる。',flower:'はなを つまずに、そばから そっと ながめよう。'};
 const memory=entry.leafMemory==='deliver'?'あの はっぱを いっしょに とどけたことを おもいだして、こんども ふたりで はっけんを わけあった。':entry.leafMemory==='display'?'あの はっぱを かざったときのように、あわてず まわりを みてみた。しずかな はっけんが あった。':'';
 return `<p>${place[entry.path]||''}</p><p>${esc(a?.name||'ともだち')}は、${first[a?.favorite]||first.watch}</p><p>${esc(b?.name||'ともだち')}は、${second[b?.favorite]||second.chat}</p>${memory?`<p class="expedition-leaf-memory">${memory}</p>`:''}`;
}
const discoveries={
 brook:{'chat-chat':['せせらぎの うたカード','ふたりの おしゃべりが みずの おとと かさなって、みじかい うたが できた。'],'chat-play':['しずくの リズムカード','こえと あしぶみを あわせると、みずべの リズムに なった。'],'chat-watch':['なみの おはなしカード','まるい なみが ひろがるところを、ふたりの おはなしに した。'],'play-play':['はねる ひかりの スケッチ','ひかりを おいかける ふたりの ポーズを、おもいでの えに した。'],'play-watch':['ゆれる もようの スケッチ','ゆれる ひかりを よく みてから、その かたちを まねして あそんだ。'],'watch-watch':['みずの かがみの スケッチ','しずかに ならんで みると、みずに うつる ふたりを みつけた。']},
 grove:{'chat-chat':['こかげの おはなしカード','こかげで かわした おはなしが、ふたりだけの ちいさな ものがたりに なった。'],'chat-play':['こだまの リズムカード','よびかけと あしおとが、ふたりだけの あいずに なった。'],'chat-watch':['はっぱの ちずカード','はっぱの すじを みながら、ふたりで たんけんの ちずを かいた。'],'play-play':['かげあそびの スケッチ','ふたりで ちがう ポーズを して、ならんだ かげを えに した。'],'play-watch':['こもれびの パズルカード','ひかりと かげの すきまを みつけて、かたちあてで あそんだ。'],'watch-watch':['こけの もようの スケッチ','ちいさな もようを ふたりで みつけて、そっと えに のこした。']},
 flower:{'chat-chat':['はなの おたよりカード','はなの いろに ことばを そえて、ともだちへの おたよりを つくった。'],'chat-play':['はなかぜの うたカード','はなの ゆれに あわせた あそびに、みじかい うたを つけた。'],'chat-watch':['いろの おはなしカード','よく みると ちがう はなの いろに、ふたりで なまえを つけた。'],'play-play':['はなまねの スケッチ','はなの ゆれを まねした ふたりの ポーズを、えに した。'],'play-watch':['はなびらの かたちカード','おちている はなびらの かたちを みつけて、かたちあてで あそんだ。'],'watch-watch':['ちいさな いろずかん','ふたりで しずかに くらべた はなの いろを、ちいさな ずかんに した。']}
};
export function expeditionDiscovery(entry){const combo=entry.discovery.slice(entry.path.length+1);return discoveries[entry.path]?.[combo]||['ふたりの おもいで','ふたりで みつけた ちいさな はっけんを、えに のこした。'];}
const discoveryLabel=e=>esc(expeditionDiscovery(e)[0]);
const result=e=>`<p class="expedition-discovery"><strong>ふたりの はっけん：${discoveryLabel(e)}</strong><br>${esc(expeditionDiscovery(e)[1])}</p>`;
export function renderExpedition(w,{base='/buncho-ureshi/'}={}){
 if(!w.encounters.garden.open)return '';
 const s=expeditionStatus(w),e=s.entry;
 const active=e&&e.completedTick===null;
 const blocked=w.paused?'いまは おやすみちゅう。さいかいしたら つづきを みよう。':!s.safe?'いまは ほかの とりとの やりとりちゅう。おちついたら ここへ もどってね。':'';
 let body='';
 if(blocked)body=`<p data-expedition-unavailable>${blocked}</p>`;
 else if(active&&e.gardenId!==w.encounters.garden.id)body=`<p>たんけんの つづきは「${esc(gardenById(e.gardenId)?.name||'もとの にわ')}」にあるよ。いつ もどっても だいじょうぶ。</p><button type="button" data-expedition-go-garden="${esc(e.gardenId)}">つづきの にわへ</button>`;
 else if(active)body=scene(e,base)+`<h4>${EXPEDITION_PATH_LABELS[e.path]}</h4>`+expeditionNarrative(e)+result(e)+'<p>この はっけんを にっきに のこそう。</p><div class="leaf-gift-choices"><button type="button" data-expedition-complete>おもいでを もちかえる</button><button type="button" data-expedition-later>つづきは あとで</button></div>';
 else if(s.phase==='complete')body=`<p>みっつの たんけんが、おもいでに なったよ。ふたりで みつけたものは、にっきで いつでも よみかえせるよ。</p>${e?scene(e,base)+result(e):''}`;
 else if(s.known.length<2)body='<p>にわの ともだちと おはなししたり、あそんだりしてみよう。ふたりと こうりゅうしたら、たんけんに さそえるよ。</p><p class="leaf-gift-note">なかよしの てんすうは ひつようないよ。いそがなくて だいじょうぶ。</p>';
 else {
 const choose=i=>`<label for="expedition-actor-${i}">${i===0?'ひとりめ':'ふたりめ'}の ともだち</label><select id="expedition-actor-${i}" name="expedition-actor-${i}" data-expedition-actor="${i}">${s.known.map((r,j)=>`<option value="${esc(r.id)}" ${j===i?'selected':''}>${esc(r.name)} · ${favorites[r.favorite]||''}</option>`).join('')}</select>`;
 body=`${e?'<p>おもいでを にっきに のこしたよ。べつの みちも、すきなときに たのしもう。</p>':''}<p>こうりゅうした ともだちを ふたり さそおう。すきなことが ちがうと、はっけんも かわるよ。</p><div class="expedition-invitations">${choose(0)}${choose(1)}</div><p>どこを たんけんする？</p><div class="leaf-gift-choices">${s.remaining.map(path=>`<button type="button" data-expedition-start="${path}">${EXPEDITION_PATH_LABELS[path]}<small>${hints[path]}</small></button>`).join('')}<button type="button" data-expedition-later>いまは みおくる</button></div><p class="leaf-gift-note">どの みちも おれいは おなじ。ひとつの みちは いちどだけ、2 Gold と ふたりの なかよし +1。Gems は つかわないよ。まちじかんも ないよ。</p>`;
 }
 return `<details name="garden-story" class="leaf-gift expedition-gift" data-garden-details="expedition" data-expedition-world="${esc(w.worldId)}" data-expedition-revision="${w.revision}"><summary>${art()}<span>${title}<small>${active?'つづきが あるよ':s.phase==='complete'?'みっつの おもいで':'ともだちを さそってみよう'}</small></span></summary><div class="leaf-gift-content">${body}</div></details>`;
}
export function renderExpeditionDiary(w){
 const entries=w.expedition?.entries||[];if(!entries.length)return '';
 return `<section class="leaf-gift leaf-gift-diary expedition-diary"><h3>${title}</h3><ol>${entries.map(e=>`<li><h4>${EXPEDITION_PATH_LABELS[e.path]}</h4><p>${e.actorIds.map(id=>esc(bird(id)?.name||'ともだち')).join(' と ')}</p>${expeditionNarrative(e)}${result(e)}${e.completedTick===null?`<p>つづきは いつでも だいじょうぶ。</p><button type="button" data-expedition-go-garden="${esc(e.gardenId)}" data-expedition-world="${esc(w.worldId)}">たんけんの にわへ</button>`:`<p class="leaf-gift-note">おもいでを もちかえったよ。${e.goldAward} Gold を うけとりずみ。おれいは いちどだけだよ。</p>`}</li>`).join('')}</ol></section>`;
}

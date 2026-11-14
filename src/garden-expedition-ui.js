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
const scene=(e,base,keepsake=false)=>`<div class="leaf-gift-vignette">${portrait(bird(e.actorIds[0]),base)}${keepsake?expeditionKeepsakeArt(e):art()}${portrait(bird(e.actorIds[1]),base,true)}</div>`;
export function expeditionNarrative(entry){
 if(!entry)return '';
 const a=bird(entry.actorIds[0]),b=bird(entry.actorIds[1]);
 const first={chat:'「なにが あるかな？」と、はなしながら みちを えらんだ。',watch:'ちいさな ちがいに きづいて、そっと たちどまった。',play:'ぴょん、と はずんで、みんなの あしどりを かるくした。'};
 const second={chat:'その はっけんに なまえを つけて、ふたりの おはなしにした。',watch:'そばで じっくり みると、ひとりでは みえなかった もようが あった。',play:'みつけた かたちを まねして あそぶと、ふたりとも にっこり。'};
 const place={brook:'みずには はいらず、あんぜんな ほとりから ながめよう。',grove:'いつもの こかげも、ともだちとなら ちがって みえる。',flower:'はなを つまずに、そばから そっと ながめよう。'};
 const memory=entry.leafMemory==='deliver'?'あの はっぱを いっしょに とどけたことを おもいだして、こんども ふたりで はっけんを わけあった。':entry.leafMemory==='display'?'あの はっぱを かざったときのように、あわてず まわりを みてみた。しずかな はっけんが あった。':'';
 return `<p>${place[entry.path]||''}</p><p>${esc(a?.name||'ともだち')}は、${first[a?.favorite]||first.watch}</p><p>${esc(b?.name||'ともだち')}は、${second[b?.favorite]||second.chat}</p>${approachNarrative(entry)}${memory?`<p class="expedition-leaf-memory">${memory}</p>`:''}`;
}
const discoveries={
 brook:{'chat-chat':['せせらぎの うたカード','ふたりの おしゃべりが みずの おとと かさなって、みじかい うたが できた。'],'chat-play':['しずくの リズムカード','こえと あしぶみを あわせると、みずべの リズムに なった。'],'chat-watch':['なみの おはなしカード','まるい なみが ひろがるところを、ふたりの おはなしに した。'],'play-play':['はねる ひかりの スケッチ','ひかりを おいかける ふたりの ポーズを、おもいでの えに した。'],'play-watch':['ゆれる もようの スケッチ','ゆれる ひかりを よく みてから、その かたちを まねして あそんだ。'],'watch-watch':['みずの かがみの スケッチ','しずかに ならんで みると、みずに うつる ふたりを みつけた。']},
 grove:{'chat-chat':['こかげの おはなしカード','こかげで かわした おはなしが、ふたりだけの ちいさな ものがたりに なった。'],'chat-play':['こだまの リズムカード','よびかけと あしおとが、ふたりだけの あいずに なった。'],'chat-watch':['はっぱの ちずカード','はっぱの すじを みながら、ふたりで たんけんの ちずを かいた。'],'play-play':['かげあそびの スケッチ','ふたりで ちがう ポーズを して、ならんだ かげを えに した。'],'play-watch':['こもれびの パズルカード','ひかりと かげの すきまを みつけて、かたちあてで あそんだ。'],'watch-watch':['こけの もようの スケッチ','ちいさな もようを ふたりで みつけて、そっと えに のこした。']},
 flower:{'chat-chat':['はなの おたよりカード','はなの いろに ことばを そえて、ともだちへの おたよりを つくった。'],'chat-play':['はなかぜの うたカード','はなの ゆれに あわせた あそびに、みじかい うたを つけた。'],'chat-watch':['いろの おはなしカード','よく みると ちがう はなの いろに、ふたりで なまえを つけた。'],'play-play':['はなまねの スケッチ','はなの ゆれを まねした ふたりの ポーズを、えに した。'],'play-watch':['はなびらの かたちカード','おちている はなびらの かたちを みつけて、かたちあてで あそんだ。'],'watch-watch':['ちいさな いろずかん','ふたりで しずかに くらべた はなの いろを、ちいさな ずかんに した。']}
};
export function expeditionDiscovery(entry){const combo=entry.discovery.slice(entry.path.length+1);return discoveries[entry.path]?.[combo]||['ふたりの おもいで','ふたりで みつけた ちいさな はっけんを、えに のこした。'];}
const approachStories={
 brook:{listen:'みずの「ぽちゃん」と、こいしの「ころん」。ふたりで おとを まねしたら、みずべの ちいさな うたを みつけた。',look:'きらりと ひかった ところを、ふたりで よく みた。まるい なみの なかに、もうひとつの そらが あった。'},
 grove:{listen:'さらさら、かさこそ。ふたりで みみを すますと、かぜが はっぱを めくる おとが きこえた。',look:'こもれびを ふたりで たどると、はっぱの すきまに ちいさな ハートの かげが あった。'},
 flower:{listen:'そよそよと ゆれる はなに あわせて、ふたりで ちいさく はなうた。かぜの テンポを みつけた。',look:'はなを つまずに、ふたりで いろを くらべた。にている はなにも、すこしずつ ちがう もようが あった。'}
};
function approachNarrative(e){return ['listen','look'].includes(e.approach)?`<p class="expedition-choice-memory"><strong>${e.approach==='listen'?'みみを すませたら':'よく みてみたら'}</strong><br>${approachStories[e.path][e.approach]}</p>`:'';}
function trailConversation(e){
 const a=bird(e.actorIds[0]),b=bird(e.actorIds[1]);
 const questions={brook:'「あれ？ みずの そばで、なにか きらっと したよ」',grove:'「あれ？ はっぱの むこうに、ちいさな かげが あるよ」',flower:'「あれ？ はなが ゆれるたびに、いろが かわって みえるよ」'};
 const replies={chat:'「いっしょに しらべよう。なにが みつかるかな？」',watch:'「あわてずに みてみよう。ちいさな ひみつが ありそう」',play:'「おもしろそう！ おとや かたちを まねしてみようよ」'};
 return `<div class="expedition-conversation"><p><strong>${esc(a?.name||'ともだち')}</strong>${questions[e.path]}</p><p><strong>${esc(b?.name||'ともだち')}</strong>${replies[b?.favorite]||replies.watch}</p></div><p class="expedition-question">ふたりと いっしょに、どうやって しらべる？</p><div class="leaf-gift-choices"><button type="button" data-expedition-choice="listen">みみを すます<small>おとと リズムを みつけよう</small></button><button type="button" data-expedition-choice="look">じっくり みる<small>いろと かたちを みつけよう</small></button><button type="button" data-expedition-later>つづきは あとで</button></div><p class="leaf-gift-note">どちらも せいかい。おれいは おなじだよ。</p>`;
}
const motifs={
 'brook-chat-chat':'<path d="M25 72q17-12 34 0t36 0M23 83q17-12 34 0t36 0"/><path d="M48 54V31l20-5v22"/><ellipse cx="42" cy="55" rx="7" ry="5" fill="#c38b62"/><ellipse cx="62" cy="49" rx="7" ry="5" fill="#c38b62"/>',
 'brook-chat-play':'<path d="M26 78q18-10 35 0t33 0M49 51V29l23-5v24"/><path d="M36 38q-17 22 0 22q17 0 0-22Z" fill="#a9d1d3"/><circle cx="72" cy="56" r="7" fill="#c38b62"/>',
 'brook-chat-watch':'<ellipse cx="59" cy="69" rx="31" ry="12"/><ellipse cx="59" cy="69" rx="19" ry="6"/><path d="M29 26h55v23H58L44 59V49H29Z" fill="#eee3bd"/>',
 'brook-play-play':'<path d="m37 35 3 9 9 3-9 3-3 10-3-10-10-3 10-3Zm43 12 3 9 9 3-9 3-3 10-3-10-9-3 9-3Z" fill="#ecc76d"/><path d="M30 79q13-24 26-10t33 8"/>',
 'brook-play-watch':'<path d="M24 40q18-17 35 0t34 0M24 56q18-17 35 0t34 0M24 73q18-17 35 0t34 0"/><circle cx="37" cy="39" r="5" fill="#e1ba69"/><circle cx="81" cy="72" r="5" fill="#e1ba69"/>',
 'brook-watch-watch':'<ellipse cx="60" cy="73" rx="37" ry="15" fill="#bedbdb"/><path d="M29 66q9-16 18 0M72 66q9-16 18 0M29 78q9 9 18 0M72 78q9 9 18 0"/><path d="M46 38q14-16 28 0"/>',
 'grove-chat-chat':'<path d="M22 36h38v24H44L34 70V60H22Zm42 15h32v25H83L75 84V76H64Z" fill="#e7d8a9"/><path d="M33 45h17M75 61h12"/>',
 'grove-chat-play':'<path d="M34 49q-13 12 0 24M26 40q-24 22 0 43M85 49q13 12 0 24M93 40q24 22 0 43M51 65V35l19-4v27"/><ellipse cx="46" cy="66" rx="6" ry="4" fill="#c38b62"/>',
 'grove-chat-watch':'<path d="M31 83C19 46 44 21 87 27c4 39-17 61-56 56Z" fill="#b5c69b"/><path d="m34 79 44-43M48 65l-8-17M60 54l18 4"/><path d="m30 88 52-57" stroke-dasharray="3 4"/>',
 'grove-play-play':'<path d="M26 78q5-32 22-23q15 3 12 23ZM67 78q-1-33 18-24q15 5 10 24Z" fill="#899986"/><circle cx="47" cy="44" r="12" fill="#899986"/><circle cx="82" cy="41" r="12" fill="#899986"/>',
 'grove-play-watch':'<path d="M29 29h23q-9 14 5 14t5-14h28v27q-14-9-14 5t14 5v23H62q9-14-5-14t-5 14H29V65q14 9 14-5t-14-5Z" fill="#d8cc92"/>',
 'grove-watch-watch':'<path d="M26 80q34-19 68 0"/><path d="M37 76V50m0 14L27 55m10 4 11-12M63 74V34m0 24L51 44m12 8 12-14M83 76V56m0 12-8-7m8 1 10-9" stroke="#749474"/>',
 'flower-chat-chat':'<path d="M25 46h70v43H25Zm0 0 35 27 35-27" fill="#f0dfcb"/><path d="M60 44V24"/><circle cx="60" cy="25" r="10" fill="#d9a3a4"/>',
 'flower-chat-play':'<path d="M32 78V48l19-5v29M65 52q18-11 31 0M65 66q18-11 31 0"/><ellipse cx="26" cy="80" rx="7" ry="5" fill="#c38b62"/><circle cx="79" cy="33" r="12" fill="#d9a3a4"/><circle cx="79" cy="33" r="4" fill="#e8c974"/>',
 'flower-chat-watch':'<circle cx="38" cy="40" r="12" fill="#d9a3a4"/><circle cx="78" cy="40" r="12" fill="#e5c66b"/><path d="M27 66h65v20H66l-9 9v-9H27Z" fill="#f0dfcb"/>',
 'flower-play-play':'<path d="M37 85V48m0 21-12-9M79 85V44m0 18 13-9"/><path d="M37 49C6 49 23 18 37 32c14-14 31 17 0 17ZM79 45c-29 2-16-29 0-17 17-12 29 17 0 17Z" fill="#d9a3a4"/>',
 'flower-play-watch':'<path d="M57 77C19 65 20 33 43 38c14 3 20 20 14 39ZM64 77c32-17 39-44 19-43-16 2-23 22-19 43Z" fill="#dab1b6"/><path d="m44 52 14 25m7 0 16-25"/>',
 'flower-watch-watch':'<path d="M22 30q20-10 38 0 18-10 38 0v57q-20-10-38 0-18-10-38 0Z" fill="#f0dfcb"/><path d="M60 31v55"/><circle cx="40" cy="49" r="8" fill="#d9a3a4"/><circle cx="79" cy="49" r="8" fill="#e5c66b"/><path d="M33 70h14m25 0h14"/>'
};
export function expeditionKeepsakeArt(e){
 const palette={brook:['#eaf3f0','#80a9ac'],grove:['#edf0de','#8d9f73'],flower:['#f7e9e1','#c59a9e']}[e.path]||['#f5edd8','#ad9d7a'];
 const emblem=e.approach==='listen'?'<path d="M92 20v10m0-10 7-2v10"/><circle cx="89" cy="31" r="3"/><circle cx="96" cy="29" r="3"/>':e.approach==='look'?'<path d="M88 25q7-9 14 0-7 9-14 0Z"/><circle cx="95" cy="25" r="2"/>':'';
 return `<svg class="expedition-keepsake-art" data-expedition-art="${esc(e.discovery)}" viewBox="0 0 120 120" role="img" aria-label="${esc(expeditionDiscovery(e)[0])}の え" focusable="false"><rect x="9" y="9" width="102" height="102" rx="12" fill="${palette[0]}" stroke="${palette[1]}" stroke-width="2"/><path d="m17 17 12-2m63 90 12-2" stroke="#ddceac" stroke-width="7" stroke-linecap="round"/><g stroke="#627d72" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" fill="none">${motifs[e.discovery]||motifs['grove-chat-watch']}</g><g fill="${palette[1]}" stroke="${palette[1]}" stroke-width="1.5">${emblem}</g><path d="M35 99h50" stroke="${palette[1]}" stroke-width="2" stroke-linecap="round"/></svg>`;
}
const discoveryLabel=e=>esc(expeditionDiscovery(e)[0]);
const result=e=>`<div class="expedition-discovery"><div class="expedition-keepsake">${expeditionKeepsakeArt(e)}</div><p><strong>ふたりの はっけん：${discoveryLabel(e)}</strong><br>${esc(expeditionDiscovery(e)[1])}</p></div>`;
const diaryButton=()=>'<button type="button" data-expedition-diary>にっきで おもいでを みる</button>';
function returnConversation(e){const a=bird(e.actorIds[0]),b=bird(e.actorIds[1]);return `<div class="expedition-conversation"><p><strong>${esc(a?.name||'ともだち')}</strong>「${e.approach==='listen'?'いっしょに きいた おと、わすれないよ':e.approach==='look'?'ふたりで みつけた もよう、すてきだったね':'いっしょに みつけられて、うれしいな'}」</p><p><strong>${esc(b?.name||'ともだち')}</strong>「にっきを ひらけば、また この おもいでに あえるね」</p></div>`;}
export function renderExpedition(w,{base='/buncho-ureshi/',celebrationId=null}={}){
 if(!w.encounters.garden.open)return '';
 const s=expeditionStatus(w),e=s.entry;
 const active=e&&e.completedTick===null;
 const blocked=w.paused?'いまは おやすみちゅう。さいかいしたら つづきを みよう。':!s.safe?'いまは ほかの とりとの やりとりちゅう。おちついたら ここへ もどってね。':'';
 let body='';
 if(blocked)body=`<p data-expedition-unavailable>${blocked}</p>`;
 else if(active&&e.gardenId!==w.encounters.garden.id)body=`<p>たんけんの つづきは「${esc(gardenById(e.gardenId)?.name||'もとの にわ')}」にあるよ。いつ もどっても だいじょうぶ。</p><button type="button" data-expedition-go-garden="${esc(e.gardenId)}">つづきの にわへ</button>`;
 else if(active&&e.approach===null)body=scene(e,base)+`<p class="expedition-step">たんけんちゅう · ${EXPEDITION_PATH_LABELS[e.path]}</p>`+trailConversation(e);
 else if(active)body=scene(e,base)+`<h4>${EXPEDITION_PATH_LABELS[e.path]}</h4>`+expeditionNarrative(e)+result(e)+'<p>この はっけんを にっきに のこそう。</p><div class="leaf-gift-choices"><button type="button" data-expedition-complete>おもいでを もちかえる</button><button type="button" data-expedition-later>つづきは あとで</button></div>';
 else if(e&&e.completedTick!==null&&e.id===celebrationId)body=`<div class="expedition-celebration" role="status"><p class="expedition-step">たんけんの おもいで</p><h4>いっしょに みつけたね！</h4>${scene(e,base)}${result(e)}${returnConversation(e)}<p class="leaf-gift-note">${e.goldAward} Gold を うけとりずみ。おもいでは にっきに のこったよ。</p></div><div class="leaf-gift-choices">${diaryButton()}<button type="button" data-expedition-next>${s.remaining.length?'べつの たんけんを みる':'にわへ もどる'}</button></div>`;
 else if(s.phase==='complete')body=`<p>みっつの たんけんが、おもいでに なったよ。ふたりで みつけたものは、にっきで いつでも よみかえせるよ。</p>${e?scene(e,base)+result(e):''}${diaryButton()}`;
 else if(s.known.length<2)body='<p>にわの ともだちと おはなししたり、あそんだりしてみよう。ふたりと こうりゅうしたら、たんけんに さそえるよ。</p><p class="leaf-gift-note">なかよしの てんすうは ひつようないよ。いそがなくて だいじょうぶ。</p>';
 else {
 const choose=i=>`<label for="expedition-actor-${i}">${i===0?'ひとりめ':'ふたりめ'}の ともだち</label><select id="expedition-actor-${i}" name="expedition-actor-${i}" data-expedition-actor="${i}">${s.known.map((r,j)=>`<option value="${esc(r.id)}" ${j===i?'selected':''}>${esc(r.name)} · ${favorites[r.favorite]||''}</option>`).join('')}</select>`;
 body=`${e?'<p>おもいでを にっきに のこしたよ。べつの みちも、すきなときに たのしもう。</p>'+diaryButton():''}<p>こうりゅうした ともだちを ふたり さそおう。すきなことが ちがうと、はっけんも かわるよ。</p><div class="expedition-invitations">${choose(0)}${choose(1)}</div><p>どこを たんけんする？</p><div class="leaf-gift-choices">${s.remaining.map(path=>`<button type="button" data-expedition-start="${path}">${EXPEDITION_PATH_LABELS[path]}<small>${hints[path]}</small></button>`).join('')}<button type="button" data-expedition-later>いまは みおくる</button></div><p class="leaf-gift-note">どの みちも おれいは おなじ。ひとつの みちは いちどだけ、2 Gold と ふたりの なかよし +1。Gems は つかわないよ。まちじかんも ないよ。</p>`;
 }
 return `<details name="garden-story" class="leaf-gift expedition-gift" data-garden-details="expedition" data-expedition-world="${esc(w.worldId)}" data-expedition-revision="${w.revision}"><summary aria-label="鳥たちの小さな探検をひらく" title="鳥たちの小さな探検">${art()}</summary><div class="leaf-gift-content"><header class="garden-story-header"><h3 class="garden-story-title">${title}</h3><button type="button" class="garden-story-close" data-garden-story-close aria-label="探検を閉じる"><span aria-hidden="true">×</span><span>とじる</span></button></header>${body}</div></details>`;
}
export function renderExpeditionDiary(w){
 const entries=w.expedition?.entries||[];if(!entries.length)return '';
 return `<section class="leaf-gift leaf-gift-diary expedition-diary"><h3>${title}</h3><ol>${entries.map(e=>`<li><h4>${EXPEDITION_PATH_LABELS[e.path]}</h4><p>${e.actorIds.map(id=>esc(bird(id)?.name||'ともだち')).join(' と ')}</p>${e.approach===null?'<p>ふたりで みちの ひみつを さがしているよ。はっけんは、つづきを たのしんでから。</p>':expeditionNarrative(e)+result(e)}${e.completedTick===null?`<p>つづきは いつでも だいじょうぶ。</p><button type="button" data-expedition-go-garden="${esc(e.gardenId)}" data-expedition-world="${esc(w.worldId)}">たんけんの にわへ</button>`:`<p class="leaf-gift-note">おもいでを もちかえったよ。${e.goldAward} Gold を うけとりずみ。おれいは いちどだけだよ。</p>`}</li>`).join('')}</ol></section>`;
}

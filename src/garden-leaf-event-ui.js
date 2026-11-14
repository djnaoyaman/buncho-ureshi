import {gardenById} from './data/gardens.js';
import {leafEventStatus,LEAF_EVENT_ENABLED} from './garden-leaf-event.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title='<ruby>落<rt>お</rt></ruby>ち<ruby>葉<rt>ば</rt></ruby>のおくりもの';
export const leafArt=()=>'<svg class="leaf-gift-art" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><path d="M22 76C5 45 35 13 78 15C79 55 58 85 22 76Z" fill="#c89855" stroke="#766144" stroke-width="2"/><path d="M17 85L65 29M28 71L27 49M42 56L42 35M41 55L62 55M53 41L70 41" fill="none" stroke="#795e3e" stroke-width="2" stroke-linecap="round"/></svg>';
const portrait=(bird,base,side)=>bird?`<figure class="leaf-gift-bird ${side}"><img src="${esc(base)}game-art/${['white','sakura','silver','cinnamon'].includes(bird.appearance?.color)?bird.appearance.color:'white'}.webp" width="1160" height="1359" alt="" draggable="false"><figcaption>${esc(bird.name)}</figcaption></figure>`:'';
const scene=(status,base)=>`<div class="leaf-gift-vignette">${portrait(status.source,base,'leaf-gift-left')}${leafArt()}${portrait(status.recipient,base,'leaf-gift-right')}</div>`;
export function leafGiftNarrative(status,{thanks=false}={}){
 const e=status.entry,a=esc(status.source?.name||'ともだち'),b=esc(status.recipient?.name||'ともだち');
 if(!e||!e.choice)return `${a}が、きれいな はっぱを みつけたよ。だれかに あげたいけれど、ちょっぴり どきどき。${b}は よろこんでくれるかな？`;
 const kind=e.branch||status.recipient?.favorite||'watch';
 if(e.choice==='deliver')return thanks?`${b}が、はっぱを たいせつにしていたよ。${kind==='play'?'はっぱの かげで あそんだ おはなしを きかせてくれた。':kind==='chat'?'「あのとき、いっしょに きてくれて ありがとう」と おはなししてくれた。':'はっぱの すじを じっとみて、にっこりしてくれた。'} ${a}も、もう どきどきしていないみたい。`:`${a}と いっしょに、${b}へ はっぱを とどけた。${kind==='play'?'くるりと はっぱを かたむけて、かげの かたちを みせてくれた。':kind==='chat'?'「どこで みつけたの？」と、おしゃべりが はじまった。':'しずかに となりに すわって、はっぱを ながめた。'}`;
 return thanks?`${b}が、かざった はっぱを みつけてくれた。${kind==='play'?'そのそばで、かげを おいかけて あそんでいたよ。':kind==='chat'?'「すてきな はっぱだね」と、${a}に あいさつしてくれた。'.replace('${a}',a):'となりに ちいさな はっぱを そえてくれたよ。'} じぶんの ペースで まっていた ${a}も、うれしそう。`:`${a}と、はっぱを にわに かざった。むりに こえを かけなくても だいじょうぶ。${b}が みつけてくれるのを、のんびり まとう。`;
}
export function renderLeafGift(w,{base='/buncho-ureshi/'}={}){
 const s=leafEventStatus(w);if(!LEAF_EVENT_ENABLED||!w.encounters.garden.open)return '';
 // Keep a visible explanation instead of silently removing the story entrance.
 const blocked=w.paused?'いまは おやすみちゅう。さいかいしたら おはなしできるよ。':
 w.encounters.raptor?.active||w.encounters.crow?.active?'いまは ほかの とりが きているよ。おちついたら おはなしを みよう。':
 w.encounters.active?'まずは おきゃくさまとの おはなしを おえてから、ここへ もどってね。':
 s.phase!=='complete'&&s.entry&&s.entry.gardenId!==w.encounters.garden.id?`この おはなしは「${esc(gardenById(s.entry.gardenId)?.name||'もとの にわ')}」で つづくよ。にっきから その にわへ いけるよ。`:
 s.phase==='unavailable'?'いまは はっぱを みつける ともだちが いないみたい。べつの にわへ あそびに いってみよう。':'';
 const waiting=s.phase==='waiting',complete=s.phase==='complete';
 let body='';
 if(blocked)body=`<p data-leaf-unavailable>${blocked}</p>`;
 else if(s.phase==='available')body='<p>はっぱを みつけた ともだちがいるよ。</p><button type="button" data-leaf-start>そっと よってみる</button>';
 else if(s.phase==='choice')body=scene(s,base)+`<p>${leafGiftNarrative(s)}</p><div class="leaf-gift-choices"><button type="button" data-leaf-choice="deliver"><ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>届<rt>とど</rt></ruby>ける<small>そばで ゆうきを わけよう</small></button><button type="button" data-leaf-choice="display"><ruby>庭<rt>にわ</rt></ruby>に<ruby>飾<rt>かざ</rt></ruby>って<ruby>待<rt>ま</rt></ruby>つ<small>そのこの ペースを だいじに</small></button><button type="button" data-leaf-choice="later">あとで<ruby>考<rt>かんが</rt></ruby>える</button></div><p class="leaf-gift-note">いつ きめても だいじょうぶ。どちらを えらんでも、おれいは おなじだよ。</p>`;
 else if(waiting)body=scene(s,base)+`<p>${leafGiftNarrative(s)}</p><p>また このにわに あそびにきたら、つづきを みてみよう。いそがなくて いいよ。</p>`;
 else if(s.phase==='ready')body=scene(s,base)+`<p>はっぱの おはなしに、つづきが あるみたい。</p><button type="button" data-leaf-complete>ともだちの ようすを みる</button>`;
 else if(complete&&s.entry.gardenId!==w.encounters.garden.id)body='<p>この おはなしは おわって、おもいでに なったよ。にっきで よみかえせるよ。ふたりに また あったら、いつもの おはなしも してみてね。</p>';
 else if(complete)body=scene(s,base)+`<p>${leafGiftNarrative(s,{thanks:true})}</p><p>はっぱの しおりが、おもいでに なったよ。ふたりに また あったら、いつもの おはなしも してみてね。</p><p class="leaf-gift-note">おれいの ${s.entry.goldAward} Gold と、にわの なかよし +2 は いちどだけ。にっきにも のこしたよ。</p><button type="button" data-leaf-display="${!s.entry.displayed}" aria-pressed="${s.entry.displayed}">${s.entry.displayed?'しおりを しまう':'しおりを にわに かざる'}</button>`;
 return `<details name="garden-story" class="leaf-gift" data-garden-details="leaf-gift" data-leaf-world="${esc(w.worldId)}" data-leaf-revision="${w.revision}"><summary aria-label="落ち葉のおくりものをひらく" title="落ち葉のおくりもの">${leafArt()}</summary><div class="leaf-gift-content"><header class="garden-story-header"><h3 class="garden-story-title">${title}</h3><button type="button" class="garden-story-close" data-garden-story-close aria-label="落ち葉のおくりものを閉じる"><span aria-hidden="true">×</span><span>とじる</span></button></header>${body}</div></details>`;
}
export function renderLeafKeepsake(w){
 const e=w.leafEvent?.entry;
 return LEAF_EVENT_ENABLED&&e?.displayed&&e?.gardenId===w.encounters.garden.id?`<div class="leaf-gift-keepsake" aria-label="おもいでの はっぱの しおり">${leafArt()}<span>おもいでの しおり</span></div>`:'';
}
export function renderLeafDiary(w){
 const s=leafEventStatus(w);if(!s.entry)return '';
 return `<section class="leaf-gift leaf-gift-diary"><h3>${title}</h3><button type="button" data-leaf-go-garden="${esc(s.entry.gardenId)}" data-leaf-world="${esc(w.worldId)}">この おはなしの にわへ</button><ol>${s.entry.diary.map(d=>`<li>${d.kind==='found'?'はっぱを みつけた ともだち。どうしようか、ゆっくり かんがえよう。':leafGiftNarrative(s,{thanks:d.kind==='thanks'})}</li>`).join('')}</ol>${s.phase==='complete'?`<div class="leaf-gift-diary-keepsake">${leafArt()}<p>はっぱの しおり<br>あのときの やさしさを、ずっと。</p></div>`:''}</section>`;
}

import {renderRaptorCatalog} from './garden-raptor-ui.js';
import {CROW_SPECIES,JAVA_LENGTH_CM,crowTarget,crowScene,crowSpecies,crowFriendship,CROW_RULES} from './garden-crows.js';
import {renderGardenBirdSprite} from './garden-bird-motion.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CROW_ART={"large-billed-crow":{"width":1254,"height":1254,"artWidthFraction":0.9505582137161085,"footX":0.6188197767145136,"footY":0.9082934609250398},"carrion-crow":{"width":1254,"height":1254,"artWidthFraction":0.9513556618819776,"footX":0.5988835725677831,"footY":0.9122807017543859},"rook":{"width":1254,"height":1254,"artWidthFraction":0.9186602870813397,"footX":0.5801435406698564,"footY":0.9346092503987241},"common-raven":{"width":1254,"height":1254,"artWidthFraction":0.9617224880382775,"footX":0.6339712918660287,"footY":0.8763955342902712},"hooded-crow":{"width":1254,"height":1254,"artWidthFraction":0.9529505582137161,"footX":0.6471291866028708,"footY":0.9242424242424242}};
export const JAVA_ART_LENGTH={white:0.8917647058823529,sakura:0.9529411764705882,silver:0.9035294117647059,cinnamon:0.9576470588235294};
const sources={
 'large-billed-crow':['Canon 野鳥写真図鑑','https://global.canon/ja/bird-branch/photo-gallery/hashibutogarasu/'],
 'carrion-crow':['サントリーの愛鳥活動','https://www.suntory.co.jp/eco/birds/encyclopedia/detail/1477.html'],
 rook:['国土交通省 山国川の鳥図鑑','https://www.qsr.mlit.go.jp/yamakuni/birds/bird/miyamagarasu.html'],
 'common-raven':['Cornell Lab of Ornithology','https://www.allaboutbirds.org/guide/Common_Raven/id/'],
 'hooded-crow':['RSPB','https://www.rspb.org.uk/birds-and-wildlife/hooded-crow']
};
export const crowImage=(id,base)=>`${esc(base)}game-art/crows/${esc(id)}.webp`;
export function renderCrowNotice(w,{warning=null,now=Date.now()}={}){
 const scene=crowScene(w,now),name=crowTarget(w)?.name||'文鳥';
 if(warning)return '<aside class="finch-crow-notice" role="status" data-crow-phase="warning"><strong>大きな影が近づいてきた…</strong><span>カラスが来るかも。おうちに戻ると安心だよ。</span><button type="button" data-finch-go-home>おうちへ戻る</button></aside>';
 if(!scene)return '';
 return `<aside class="finch-crow-notice" role="status" data-crow-phase="${scene.phase}"><strong>${scene.phase==='visiting'?esc(scene.species.name)+'が来たよ':'カラスは飛んでいったよ'}</strong><span>${!scene.retreat?'なかよしのカラスだよ。みんな安心していっしょに過ごせるよ。':scene.phase==='visiting'?`友達は安全な場所へ。${esc(name)}の元気は半分に。おうちでお世話すると回復できるよ。`:'友達は少し休んでいるよ。しばらくすると戻ってくるよ。'}</span><button type="button" data-finch-go-home>おうちへ戻る</button><button type="button" data-crow-entry="${scene.species.id}">カラスの記録</button></aside>`;
}
/** Both birds share one physical scale and ground line. Asset measurements are
 * explicit so a padded image canvas is never mistaken for biological length. */
export function renderCrowScene(w,{base='/buncho-ureshi/',warning=null,now=Date.now()}={}){
 if(warning)return '<div class="finch-crow-shadow" aria-hidden="true"><svg viewBox="0 0 600 200"><path d="M300 150C250 190 205 100 20 20Q170 15 275 95L300 70 325 95Q430 15 580 20C395 100 350 190 300 150L320 195H280Z" fill="currentColor"/></svg></div>';
 const scene=crowScene(w,now),b=crowTarget(w);if(scene?.phase!=='visiting'||!b)return '';
 const ratio=scene.species.lengthCm/JAVA_LENGTH_CM,art=CROW_ART[scene.species.id],javaWidth=JAVA_ART_LENGTH[b.color]||JAVA_ART_LENGTH.white;
 const imageRatio=ratio*javaWidth/art.artWidthFraction;
 return `<div class="finch-crow-scale-scene" data-crow-species="${scene.species.id}" data-length-ratio="${ratio}" aria-label="${esc(b.name)}と${esc(scene.species.name)}。同じ縮尺での全長の目安。"><div class="finch-crow-java">${renderGardenBirdSprite(b.color,'crow-omochi',{base,pose:'right'})}<span>${esc(b.name)} · 約14cm</span></div><figure class="finch-crow-actor" style="--crow-ratio:${imageRatio};--crow-foot-y:${art.footY}"><img src="${crowImage(scene.species.id,base)}" width="1254" height="1254" alt="${esc(scene.species.name)}のオリジナルイラスト" decoding="async"><figcaption>${esc(scene.species.name)} · 約${scene.species.lengthCm}cm</figcaption></figure></div>`;
}
export function renderCrowFriendship(w,id){
 const bond=crowFriendship(w,id);if(!bond.discovered)return '';
 return `<section class="finch-friendship" data-crow-friendship><h4>${bond.friendly?'なかよし':'親しみを育てよう'}</h4><label>親しみ <span data-crow-points>${bond.points}</span> ポイント<meter min="0" max="${CROW_RULES.friendPoints}" value="${Math.min(bond.points,CROW_RULES.friendPoints)}">${Math.min(bond.points,CROW_RULES.friendPoints)}</meter></label><p>${bond.friendly?'もう襲わないよ。文鳥の元気は減らず、友達も逃げずに過ごせるよ。':'絵をなでると少しずつ親しくなるよ。親しみ100でなかよしになると、もう襲わなくなるよ。'}</p><p>絵の上を指やマウスで動かしてなでてね。キーボードは絵に合わせてEnterまたはスペース。</p></section>`;
}
export function renderCrowNotebook(w,{base='/buncho-ureshi/',id=null}={}){
 const seen=w.encounters.crow?.visits||[],s=id&&crowSpecies(id),visit=seen.find(v=>v.id===id);
 if(s&&visit){const [title,url]=sources[id];return `<article class="finch-entry finch-crow-entry"><h3 tabindex="-1">${s.name}</h3><p><i>${s.scientific}</i></p><figure><div data-encounter-rub="${id}" tabindex="0" role="button" aria-label="${s.name}のゲームの絵をなでる。指やマウスを動かすか、Enterまたはスペース。"><img src="${crowImage(id,base)}" width="1254" height="1254" alt="${s.name}のゲーム用イラスト" draggable="false"></div><figcaption>ゲーム用に作ったオリジナルイラスト。現実の野鳥には触れず、離れて観察してね。</figcaption></figure>${renderCrowFriendship(w,id)}<p>${s.description}</p><p>全長の目安 約${s.range||s.lengthCm}cm。文鳥の約14cmを基準に、庭では約${(s.lengthCm/JAVA_LENGTH_CM).toFixed(1)}倍の全長で描いています。姿勢や個体差で見え方は変わります。</p><p>庭で会った回数 ${visit.count} 回</p><p>庭の来訪・退避・元気の変化はゲームの演出です。カラスは悪者という意味ではありません。現実の文鳥を屋外に放すことは勧めていません。</p><details><summary>資料と出典</summary><ul><li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></li><li><a href="https://www.nies.go.jp/biodiversity/invasive/DB/detail/20250.html" target="_blank" rel="noopener noreferrer">国立環境研究所：ブンチョウ（全長約14cm）</a></li></ul></details><div class="finch-page-actions"><button type="button" data-crow-notebook>天敵の記録へ</button><button type="button" data-finch-go-garden>庭へ戻る</button></div></article>`;}
 return `<section class="finch-notebook finch-crow-notebook"><h3 tabindex="-1">天敵の記録</h3><p>出会い ${seen.length} / ${CROW_SPECIES.length} 種類</p><p>庭で3秒過ごすと、カラスと猛禽をあわせて25%の確率で、大きな影が来ることがあります。長くいるときも、空を見てね。影が見えたら、おうちに戻れます。</p><div class="finch-catalog">${CROW_SPECIES.map((s,i)=>{const known=seen.some(v=>v.id===s.id);return `<button type="button" data-crow-entry="${s.id}" ${known?'':'disabled'}>${known?`<img src="${crowImage(s.id,base)}" width="1254" height="1254" alt="${s.name}">`:`<span class="finch-crow-unknown" aria-hidden="true"><img src="${crowImage(s.id,base)}" width="1254" height="1254" alt="" draggable="false" decoding="async"></span>`}<strong>${known?s.name:`まだ出会っていないカラス ${i+1}`}</strong></button>`;}).join('')}</div>${renderRaptorCatalog(w,{base})}<div class="finch-page-actions"><button type="button" data-encounter-back>庭の鳥図鑑へ戻る</button><button type="button" data-finch-go-garden>庭へ戻る</button></div></section>`;
}

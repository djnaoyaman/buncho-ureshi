/** Presentation only. No world, clock, RNG, storage or attendance predicates.
 * art is a resolved existing local garden image supplied by the integration caller.
 * Keep the outer native disclosure identity: the encounter controller owns its lifecycle.
 */
import {PREDATOR_ENTRY_RULES} from './garden-predator-clock.js';
import {CROW_RULES} from './garden-crows.js';
import {RAPTOR_RULES} from './garden-raptors.js';
const duration=ms=>ms%60000===0?`${ms/60000}分`:`${ms/1000}秒`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localArt=src=>typeof src==='string'&&/^\/(?:[A-Za-z0-9_-]+\/)*game-art\/gardens\/[A-Za-z0-9_/-]+(?:\.screen)?\.(?:png|webp)(?:\?v=[a-f0-9]+)?$/.test(src)&&!src.includes('..');
const dimension=n=>Number.isSafeInteger(n)&&n>0?n:1;
export function renderGardenAboutBooklet({name,description,landform,art=null}){
 const figure=art&&localArt(art.src)?`<figure class="garden-about-booklet__figure"><img src="${esc(art.src)}" width="${dimension(art.width)}" height="${dimension(art.height)}" alt="${esc(art.alt??description)}" loading="lazy" decoding="async" draggable="false">${landform?`<figcaption>${esc(landform)}</figcaption>`:''}</figure>`:'';
 return `<details name="garden-tools" data-garden-details="about" class="garden-about-booklet"><summary>庭のこと</summary>
 <div class="garden-about-booklet__cover"><p class="garden-about-booklet__eyebrow">おでかけの小冊子</p><h4>${esc(name)}</h4><p>庭のことを、ひとつずつ。</p></div>
 <div class="garden-about-booklet__paper">
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">01</span>どんな庭？</h5>${figure}<p>${esc(description)}</p></section>
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">02</span>空からの来客</h5>
 <p>庭で${duration(PREDATOR_ENTRY_RULES.dwellMs)}過ごすと、${PREDATOR_ENTRY_RULES.chance*100}%でカラスか猛禽を抽選します。両方が来られるときの比率は${PREDATOR_ENTRY_RULES.crowWeight}対${PREDATOR_ENTRY_RULES.raptorWeight}です。これは来訪の抽選で、事故の確率ではありません。</p><h6>カラス</h6><p>庭に続けて${duration(CROW_RULES.dwellMs)}いると、カラスが来ることがあります。その後は${duration(CROW_RULES.checkMs)}ごとに${CROW_RULES.chance*100}%で抽選します。大きな影で知らせるので、おうちに戻れます。影の合図から${duration(CROW_RULES.warningMs)}で来訪するので、合図が見えたら「おうちへ戻る」を押そう。来訪時に狙われた主人公は元気が半分になり、おうちのお世話で回復できます。友達との仲や図鑑は消えません。</p>
 <p>まれに猛禽類も来訪します。猛禽類は${duration(RAPTOR_RULES.dwellMs)}過ごしてから、${duration(RAPTOR_RULES.checkMs)}ごとに${RAPTOR_RULES.chance*100}%で抽選します。カラスも猛禽類も、主人公が同行していない庭にも来ます。来訪時に同行している主人公だけが標的になります。</p>
 <p>主人公の同行なしで始まった来訪には標的がなく、安全に眺められます。その来訪の途中から別の文鳥を標的にすることはありません。</p>
 <aside class="garden-about-booklet__warning" aria-label="猛禽の警告が出たときの注意"><h6>猛禽類の警告が出たら</h6><p><strong>猛禽の警告が出たら${duration(RAPTOR_RULES.warningMs)}以内におうちへ。</strong><br>間に合わないと事故死します。警告の「おうちへ戻る」を押して帰宅しよう。残り10秒では「今すぐ帰る」に変わります。</p><p>おうちで留守番している文鳥は狙われません。</p><p>ミサゴとなかよしの種類は襲いません。</p></aside></section>
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">03</span>この庭について</h5><p>いつでも遊べる、ゲームの創作の庭です。現実の季節・渡来・由緒を示すものではありません。留守にしても出会いは待っていてくれるよ。</p>
 <details data-garden-details="about-rules" class="garden-about-booklet__rules"><summary>標的・留守番・時間のルール</summary><p>来訪時に同行している主人公だけが標的になります。おうちで留守番している文鳥は狙われません。</p><p>猛禽については、画面非表示の間は警告の時間が止まり、再読込でも残り時間を引き継ぎます。警告が消えると思って画面を閉じず、帰宅のボタンで回避しよう。</p><p>主人公の同行なしで始まった来訪には、後から標的が付くことはありません。すでに主人公への警告が出ているときは、同行設定を変えても警告は消えません。</p></details></section>
 </div></details>`;
}

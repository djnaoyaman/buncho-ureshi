/** Presentation only. No world, clock, RNG, storage or attendance predicates.
 * art is a resolved existing local garden image supplied by the integration caller.
 * Keep the outer native disclosure identity: the encounter controller owns its lifecycle.
 */
import {renderGardenTrackCredit} from './garden-track-credit.js';
import {PREDATOR_ENTRY_RULES} from './garden-predator-clock.js';
import {CROW_RULES} from './garden-crows.js';
import {RAPTOR_RULES} from './garden-raptors.js';
const duration=ms=>ms%60000===0?`${ms/60000}分`:`${ms/1000}秒`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localArt=src=>typeof src==='string'&&/^\/(?:[A-Za-z0-9_-]+\/)*game-art\/gardens(?:35)?\/[A-Za-z0-9_/-]+(?:\.screen)?\.(?:png|webp)(?:\?v=[a-f0-9]+)?$/.test(src)&&!src.includes('..');
const dimension=n=>Number.isSafeInteger(n)&&n>0?n:1;
export function renderGardenAboutBooklet({name,description,landform,art=null,themeId=null,base='/'}){
 const figure=art&&localArt(art.src)?`<figure class="garden-about-booklet__figure"><img src="${esc(art.src)}" width="${dimension(art.width)}" height="${dimension(art.height)}" alt="${esc(art.alt??description)}" loading="lazy" decoding="async" draggable="false">${landform?`<figcaption>${esc(landform)}</figcaption>`:''}</figure>`:'';
 return `<details name="garden-tools" data-garden-details="about" class="garden-about-booklet"><summary>庭のこと</summary>
 <div class="garden-about-booklet__cover"><p class="garden-about-booklet__eyebrow">おでかけの小さな本</p><h4>${esc(name)}</h4><p>庭のことを、ひとつずつ。</p></div>
 <div class="garden-about-booklet__paper">
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">01</span>どんな庭？</h5>${renderGardenTrackCredit(themeId,base)}${figure}<p>${esc(description)}</p></section>
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">02</span>空から来る鳥</h5>
 <p>カラスや、ワシ・タカなどの「もうきん」が来ることがあるよ。帰るまでの時間は、鳥によってちがうよ。</p>
 <aside class="garden-about-booklet__warning" aria-label="もうきんのお知らせが出たとき"><h6>ワシ・タカなどのお知らせが出たら</h6><ol><li><strong>「おうちへ戻る」を押そう。</strong></li><li>もうきんのお知らせで「残る」をえらんだときは、<strong>${duration(RAPTOR_RULES.warningMs)}以内に帰ろう。</strong></li><li>帰るのが間に合わないと、ゲームの中の文鳥が事故で命をなくします。</li></ol><p>帰るかどうかをえらんでいる間は、時間が止まるよ。「残る」をえらぶと、のこり時間が動きだすよ。</p><p>のこり10秒になると、ボタンが「今すぐ帰る」に変わるよ。</p><p>おうちでるす番している文鳥は、ねらわれないよ。ミサゴとなかよしの鳥は、おそってこないよ。</p></aside>
 <h6>カラスの大きなかげが見えたら</h6><p>カラスは、大きなかげが合図だよ。かげが出てから${duration(CROW_RULES.warningMs)}で来るので、「おうちへ戻る」を押そう。</p><p>カラスにねらわれた主人公は、元気が半分になるよ。おうちでお世話すると、また元気になるよ。友だちとのなかよしの点数や、ずかんは消えないよ。</p>
 <details data-garden-details="about-frequency" class="garden-about-booklet__rules"><summary>鳥が来るタイミングをくわしく</summary>
 <p>にわで${duration(PREDATOR_ENTRY_RULES.dwellMs)}すごすと、鳥が来るかをくじびきで決めるよ。そのあとも${duration(PREDATOR_ENTRY_RULES.retryMs)}ごとに、来るかどうかを決めるよ。</p><p>来るチャンスは、毎回${PREDATOR_ENTRY_RULES.chance*100}%だよ。これは「鳥が来る」わりあいで、事故が起きるわりあいではないよ。</p><p>カラスともうきんの両方が来られるときは、カラス${PREDATOR_ENTRY_RULES.crowWeight}：もうきん${PREDATOR_ENTRY_RULES.raptorWeight}のわりあいでえらぶよ。</p>
 <p>カラスが来たあとは、次のカラスまで${duration(CROW_RULES.cooldownMs)}あけるよ。もうきんが来たあとは、${duration(RAPTOR_RULES.visitCooldownMs)}たつと、次に来るかのくじびきができるよ。</p><p>あぶないもうきんが来るのは、全部の鳥を合わせて24時間に1回まで。その間も、安全な出会いでずかんをふやせるよ。</p></details></section>
 <section class="garden-about-booklet__chapter"><h5><span class="garden-about-booklet__number" aria-hidden="true">03</span>この庭について</h5><p>いつでもあそべる、ゲームのために作ったにわだよ。本当の季節や、鳥が来る時期、その場所の歴史とはちがうよ。るすにしても、出会いは待っていてくれるよ。</p>
 <details data-garden-details="about-rules" class="garden-about-booklet__rules"><summary>だれがねらわれる？ 時間はどうなる？</summary><p>カラスももうきんも、主人公がいないにわにも来るよ。ねらわれるのは、鳥が来たときにいっしょにいる主人公だけ。おうちでるす番している文鳥は、ねらわれないよ。</p><p>主人公がいないときに来た鳥は、安全にながめられるよ。そのとちゅうから、ほかの文鳥がねらわれることはないよ。</p><p>もうきんのお知らせののこり時間は、ゲームの画面が見えていない間は止まるよ。画面を読みこみなおしても、のこり時間はそのままだよ。</p><p>画面を閉じるだけでは、あぶない鳥は消えないよ。「おうちへ戻る」を押して帰ろう。</p><p>主人公へのお知らせが出たあとは、いっしょに行く鳥を変えても、お知らせは消えないよ。</p></details></section>
 </div></details>`;
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Pure presentation only. The caller supplies already formatted prices, remaining
 * time and disabled decisions from the existing life-care renderer. No world,
 * clock, economy token, HTML, or callbacks are accepted or changed here.
 * @param {{active:boolean,dailyGoldLabel:string,goldLabel:string,
 * remainingLabel:string,insufficientGold:boolean,
 * options:Array<{days:1|3|7,priceLabel:string,disabled:boolean}>}} view
 */
export function renderCaretakerRecruitment(view){
  if(!view || view.options?.length!==3 || view.options.some((option,i)=>option.days!==[1,3,7][i]))throw new TypeError('Expected existing 1/3/7 day caretaker options');
  const daily=escape(view.dailyGoldLabel);
  return `<section class="life-caretaker caretaker-recruitment" aria-label="飼育員を雇う"><div class="life-bird-title"><h4>お留守番の<ruby>飼育員<rt aria-hidden="true">しいくいん</rt></ruby></h4><span class="life-badge">${view.active?'契約中':'前払い'}</span></div>
<div class="caretaker-recruitment-sign" aria-hidden="true"><img src="./assets/caretaker-signboard-A-v2.png" width="1199" height="1312" alt=""><div class="caretaker-recruitment-sign-copy"><p class="caretaker-recruitment-kicker">お世話のおねがい 受付中</p><p class="caretaker-recruitment-name">お留守番<br>飼育員</p><p class="caretaker-recruitment-tagline">留守の間も、みんなにお世話。</p><p class="caretaker-recruitment-rate">ほんとうの時間1日（24時間）<strong>${daily} <small>Gold</small></strong></p><p class="caretaker-recruitment-service">ごはん・そうじ・病院<small>おうちの全員 ／ 病院もこのお金で</small></p></div></div>
<p>ほんとうの時間1日につき <strong>${daily} Gold</strong>。おうちの全員に、ごはん・そうじ・病院のお世話をします。病院のお金も、この中に入っています。</p>
${view.active?`<p class="life-contract">お世話してもらえる時間：<strong>ほんとうの時間 ${escape(view.remainingLabel)}</strong><br><small>日数をふやすと、今のお世話が終わったあとに続きます。</small></p>`:''}
<h5 class="caretaker-recruitment-options-title">お願いする日数</h5><div class="life-hire-options caretaker-recruitment-options">${view.options.map(option=>`<button type="button" data-life-hire="${option.days}" ${option.disabled?'disabled':''}><span class="caretaker-recruitment-days">${option.days}日<span class="caretaker-recruitment-action">${view.active?'延長':'お願いする'}</span></span><strong>${escape(option.priceLabel)} Gold</strong></button>`).join('')}</div>
<p class="life-small">1日＝ほんとうの時間の24時間です。ボタンに書いてあるGoldを、はじめに1回払います。勝手に日数がふえたり、お金が引かれたりしません。</p><details class="life-caretaker-scope" data-game-details="caretaker-scope"><summary>くわしく：できること・できないこと</summary><div class="kids-guide"><ol class="kids-steps" aria-label="飼育員さんにお願いする流れ"><li><strong>日数をえらぶ</strong><p>1日・3日・7日からえらび、先にGoldを払います。</p></li><li><strong>みんなをお世話</strong><p>ごはん・元気の回復・そうじ・病院。おうちの鳥がふえても、お金は同じです。</p></li><li><strong>時間が来たらおしまい</strong><p>勝手に続きません。続けたいときは、自分で日数をふやしてね。</p></li></ol><h5>できないこと</h5><p><ruby>寿命<rt aria-hidden="true">じゅみょう</rt></ruby>をのばすこと、庭の<ruby>事故<rt aria-hidden="true">じこ</rt></ruby>をふせぐこと、旅立った文鳥をもどすことはできません。</p><h5>お世話が終わったら</h5><p>ごはんを食べるまでの時間は、最後に食べてから、ふつうはほんとうの時間で3日です。留守からもどったときは、お世話できる時間が用意されることもあります。「みんなの健康」で、今の時間を見てね。</p><h5>お金とお礼</h5><ul><li>お願いできる日数は、残りを合わせて30日までです。</li><li>飼育員さんのお世話では、追加のGemsはふえません。</li><li>家族みんなで1日30 Gemsは受け取れます。毎日のお礼30 Goldも、暮らしをたしかめて受け取れます。</li></ul></div></details><p class="life-small">もっているお金：${escape(view.goldLabel)} Gold${view.insufficientGold?' · お願いするためのGoldが足りません。':''}</p></section>`;
}

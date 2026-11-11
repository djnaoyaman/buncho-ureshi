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
  return `<section class="life-caretaker caretaker-recruitment" aria-label="飼育員を雇う"><div class="life-bird-title"><h4>お留守番の飼育員</h4><span class="life-badge">${view.active?'契約中':'前払い'}</span></div>
<div class="caretaker-recruitment-sign" aria-hidden="true"><img src="./assets/caretaker-signboard-A-v2.png" width="1199" height="1312" alt=""><div class="caretaker-recruitment-sign-copy"><p class="caretaker-recruitment-kicker">お世話のご依頼 受付中</p><p class="caretaker-recruitment-name">お留守番<br>飼育員</p><p class="caretaker-recruitment-tagline">留守の間も、みんなにお世話。</p><p class="caretaker-recruitment-rate">実時間1日（24時間）<strong>${daily} <small>Gold</small></strong></p><p class="caretaker-recruitment-service">ごはん・掃除・自動通院<small>おうちの全員 ／ 通院の追加料金なし</small></p></div></div>
<p>実時間1日につき <strong>${daily} Gold</strong>。この庭で暮らす全員のごはん・掃除・自動通院（追加料金なし）をお任せできます。</p>
${view.active?`<p class="life-contract">契約の残り：<strong>実時間 ${escape(view.remainingLabel)}</strong><br><small>延長分は現在の契約の後に追加されます。</small></p>`:''}
<h5 class="caretaker-recruitment-options-title">お願いする日数</h5><div class="life-hire-options caretaker-recruitment-options">${view.options.map(option=>`<button type="button" data-life-hire="${option.days}" ${option.disabled?'disabled':''}><span class="caretaker-recruitment-days">${option.days}日<span class="caretaker-recruitment-action">${view.active?'延長':'お願いする'}</span></span><strong>${escape(option.priceLabel)} Gold</strong></button>`).join('')}</div>
<p class="life-small">1日は、実時間の24時間です。</p><p class="life-small">自動のお世話には追加のGemsはありません。家庭共通の1日30 Gemsは受け取れます。毎日のお礼30 Goldも、暮らしを確認して受け取れます。寿命は延びません。契約は残り合計30日までです。</p><p class="life-small">所持金：${escape(view.goldLabel)} Gold${view.insufficientGold?' · 契約に必要なGoldが足りません。':''}</p></section>`;
}

// Presentation only: the existing observation form bindings and storage stay in src/app.js.
export function renderOmochi({url,cssVersion='',interactive=true}) {
 return `<link rel="stylesheet" href="${url('site/omochi.css')}?v=${cssVersion}">
 <article class="omochi-room" aria-labelledby="omochi-title">
  <header class="omochi-opening">
   <p class="omochi-kicker">OMOCHI / OBSERVATION ROOM</p>
   <h1 id="omochi-title">この一羽を、<br>もっと知りたい。</h1>
   <p class="omochi-room-name"><span class="sr-only">おもち観察室</span><span class="omochi-name-stack" aria-hidden="true"><span>お</span><span>も</span><span>ち</span><span>観</span><span>察</span><span>室</span></span></p>
  </header>
  <figure class="omochi-cover omochi-real-portrait">
   <img src="${url('omochi/omochi-original.jpeg')}" alt="指にとまる白文鳥のおもち本人" width="925" height="1536" fetchpriority="high">
   <figcaption>${interactive?'おもち本人 <span aria-hidden="true">｜</span> ご家族からの提供写真':'ご家族が提供した、おもち本人の写真を掲載しています。'}</figcaption>
  </figure>
  <div class="omochi-pages">
   <section class="omochi-look" aria-labelledby="omochi-look-title">
    <div><p class="omochi-number">01 <span>見つめる</span></p>
     <h2 id="omochi-look-title"><span>指をつかむ、</span><br>小さな足。</h2>
     <p>写真の中で、どんなところに目がとまりますか。</p>
    </div>
    <figure class="omochi-detail"><div><img src="${url('omochi/omochi-original.jpeg')}" alt="同じ写真に写る、おもちの足と指をつかむ爪の部分拡大" width="925" height="1536" loading="lazy"></div><figcaption>同じ写真の部分拡大</figcaption></figure>
   </section>
   <section class="omochi-about" aria-labelledby="omochi-about-title">
    <p class="omochi-number">02 <span>知る</span></p><h2 id="omochi-about-title">おもちのこと</h2>
    <dl><div><dt>羽色</dt><dd>白文鳥</dd></div><div><dt>性別</dt><dd>女の子</dd></div></dl>
    <p>まだわからないことは、これから少しずつ。</p>
    <p class="omochi-context">ここは、実際のおもちを観察する場所。<br>ゲームの出来事とは別の記録です。</p>
   </section>
   <section class="omochi-notebook observation-notebook" aria-labelledby="omochi-note-title">
    <p class="omochi-number">03 <span>残す</span></p><h2 id="omochi-note-title">見つけたことを、一行。</h2>
    <p class="omochi-note-intro">あなたが実際に見たことを、わたしの観察ノートに。</p>
    ${interactive?`<form id="observation-form"><label>観察した日<input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>見たこと・気になったこと<textarea name="note" maxlength="600" rows="3" placeholder="今日、実際に見たこと。" required></textarea></label><button class="button">ノートに記録する <span aria-hidden="true">→</span></button></form><p class="omochi-private">この端末だけに保存され、サイトには投稿されません。</p><h3 class="omochi-records-title">これまでの記録</h3><div id="observations"></div>`:`<p>日付を選んで、見たことを記録できます。ノートを使うにはJavaScriptを有効にしてください。</p><p>この端末だけに保存され、サイトには投稿されません。</p>`}
   </section>
   <aside class="omochi-seeds" aria-labelledby="omochi-seeds-title"><p class="omochi-kicker">もう少し、見てみよう</p><h2 id="omochi-seeds-title">観察のたね</h2><ul><li>休んでいるとき、足はどうなっている？</li><li>水浴びの前と後で、羽はどう変わった？</li><li>「うれしそう」だけでなく、見えた動きを書いてみよう。</li></ul><p>しぐさだけで気持ちを決めつけず、見えたことから少しずつ。</p></aside>
   <nav class="omochi-next" aria-label="観察の続き"><a href="${url('encyclopedia/')}">文鳥図鑑へ</a><a href="${url('body/')}">からだ探検へ</a><a href="${url('help/')}">保存の手引き</a></nav>
  </div>
 </article>`;
}

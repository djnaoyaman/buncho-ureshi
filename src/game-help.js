// Authored help only. User input must never be passed through this markup helper.
const ruby = text => text.replace(/([一-龠々]+)\{([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');

export function renderGameHelp({holidayCoverageKnown = true} = {}) {
  return ruby(`<section class="game-help game-help-guide">
<h3>ようこそ、おもちの文鳥{ぶんちょう}ぐらしへ</h3>
<p>文鳥{ぶんちょう}たちといっしょに、鳥{とり}たちのくらしを楽{たの}しもう。</p>
<p class="game-help-guide-intro">すきなところから、のぞいてね。</p>
<ol class="game-help-guide-map" role="list" aria-label="5つのあそびかた">
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-1"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">01</span><span>ながめる</span></span><span class="game-help-guide-caption">のんびりした姿{すがた}をみよう</span></summary><div class="game-help-guide-explanation"><h4>まずは、ながめよう。</h4><p>鳥{とり}たちは、えだや巣{す}でのんびりしたり、ごはんを食{た}べたり、水{みず}あびをしたりするよ。</p></div></details><svg class="game-help-guide-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M 30 0 C 30 20, 70 20, 70 40" /></svg></li>
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-2"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">02</span><span>むかえる</span></span><span class="game-help-guide-caption">おうちに迎{むか}えるか、えらぼう</span></summary><div class="game-help-guide-explanation"><h4>お客{きゃく}さんをむかえよう。</h4><p>はじめに来{く}るのは、男{おとこ}の子{こ}の文鳥{ぶんちょう}。いっしょにくらしたくなったら、名前{なまえ}をつけて「おうちに迎{むか}える」を押{お}そう。むかえるかどうかは、自分{じぶん}でえらべるよ。「設定{せってい}」で、鳥{とり}たちにまかせることもできるよ。</p></div></details><svg class="game-help-guide-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M 30 0 C 30 20, 70 20, 70 40" /></svg></li>
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-3"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">03</span><span>おはなし</span></span><span class="game-help-guide-caption">ことばのボタンを押{お}そう</span></summary><div class="game-help-guide-explanation"><h4>お話{はなし}しよう。</h4><p>文鳥{ぶんちょう}をえらんで、ことばのボタンを押{お}してみよう。今{いま}の気持{きも}ちや、好{す}きなこと、友達{ともだち}との思{おも}い出{で}で、お返事{へんじ}がかわるよ。</p></div></details><svg class="game-help-guide-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M 30 0 C 30 20, 70 20, 70 40" /></svg></li>
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-4"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">04</span><span>かぞく</span></span><span class="game-help-guide-caption">つながりを、みまもろう</span></summary><div class="game-help-guide-explanation"><h4>家族{かぞく}を見{み}まもろう。</h4><p>大人{おとな}になった鳥{とり}どうしが、なかよくなると、ふうふになることがあるよ。ふたりのようすや、時間{じかん}、場所{ばしょ}がそろうと、たまごが生{う}まれることもあるよ。ふうふにならず、友達{ともだち}のままでもすてきだね。家族{かぞく}が6羽{わ}になったら、おうちの「家族{かぞく}」で成鳥{せいちょう}から独立{どくりつ}の相談{そうだん}があることも。「いいよ」とえらんだときだけ、別{べつ}のおうちへ行{い}くよ。家系図{かけいず}と思{おも}い出{で}に残{のこ}るよ。また友達{ともだち}として招{まね}けるよ。</p></div></details><svg class="game-help-guide-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M 30 0 C 30 20, 70 20, 70 40" /></svg></li>
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-5"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">05</span><span>おもいで</span></span><span class="game-help-guide-caption">記念{きねん}カードをつくろう</span></summary><div class="game-help-guide-explanation"><h4>思{おも}い出{で}をつくろう。</h4><p>「家系図{かけいず}」は、家族{かぞく}のつながりがわかる図{ず}だよ。「家系図{かけいず}」や「日記{にっき}」の「記念{きねん}カード」から、アート工房{こうぼう}へ行{い}けるよ。家族{かぞく}のお祝{いわ}いカードをつくってみよう。</p></div></details><img class="game-help-guide-bird" src="./game-art/white.webp" alt="" width="1176" height="1364" loading="lazy"></li>
</ol>
<details data-game-details="help-care"><summary>お世話{せわ}・おこづかい・次{つぎ}のお楽{たの}しみ</summary>
<section data-help-update="care-reactions" class="game-help-mini-guide"><p><strong>なでたり、おはなししたり。</strong></p><p>なでたり、話{はな}しかけたりするのは、いつでもできるよ。おなかがすいたら、ごはんをあげよう。</p><p>おなかいっぱいのときは、ごはんをあげなくていいよ。なでたり、お話{はなし}したりして、あそぼう。お返事{へんじ}だけでは、おこづかいや、ごはんを食{た}べた記録{きろく}はふえないよ。</p><p>「ほぞんしたよ」と出{で}たら、変{か}えたことは残{のこ}っているよ。画面{がめん}をとじられるよ。留守{るす}から戻{もど}ったら、体調{たいちょう}も見{み}てあげよう。</p></section>
<p>おなかと元気{げんき}は、ほんとうの24時間{じかん}で30ずつ、40までゆっくりへるよ。決{き}まった時刻{じこく}に来{こ}なくてもいいよ。</p>
<p>ごはんは、おなかがいっぱいになるまであげられるよ。名前{なまえ}を呼{よ}んだり、なでたり、お話{はなし}したりすると、元気{げんき}がいっぱいまで回復{かいふく}するよ。元気{げんき}がいっぱいでも、なでたり、お話{はなし}したりして遊{あそ}べるよ。</p>
<p>物語{ものがたり}を止{と}めていても、おなかと元気{げんき}はゆっくりへるよ。留守{るす}だけで亡{な}くなることはないよ。戻{もど}ったら、ごはんや病院{びょういん}でお世話{せわ}しよう。</p>
${holidayCoverageKnown ? '' : '<p>この年{とし}の祝日{しゅくじつ}は、まだゲームに入{はい}っていないよ。自動{じどう}の贈{おく}り物{もの}の休日分{きゅうじつぶん}は、土曜日{どようび}と日曜日{にちようび}に使{つか}うよ。</p>'}
<div data-game-growth-help class="game-help-mini-guide">
<p><strong>たまごから、大人{おとな}になるまで</strong></p>
<div class="game-help-mini-steps" role="list" aria-label="そだつじゅんばん">
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">1</span><strong>たまごから、ひなへ</strong><span>生{う}まれてから約{やく}5時間{じかん}36分{ふん}</span></div>
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">2</span><strong>ひなから、幼鳥{ようちょう}へ</strong><span>かえってから約{やく}11時間{じかん}12分{ふん}</span></div>
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">3</span><strong>幼鳥{ようちょう}から、大人{おとな}へ</strong><span>かえってから約{やく}<ruby>3日半<rt>みっかはん</rt></ruby></span></div>
</div>
<p>幼鳥{ようちょう}は、大人{おとな}になる前{まえ}の鳥{とり}だよ。これは、ほんとうの時間{じかん}での目安{めやす}だよ。</p>
<p>物語{ものがたり}を止{と}めているあいだは、成長{せいちょう}も止{と}まるよ。更新前{こうしんまえ}からいるたまご・ひな・幼鳥{ようちょう}は、今{いま}までの速{はや}さで育{そだ}つよ。</p>
</div>
<p data-game-cleanliness-help>そうじをして床{ゆか}が100になると、20までへるのは、ほんとうの時間{じかん}で約{やく}36時間{じかん}だよ。物語{ものがたり}を止{と}めているあいだは、床{ゆか}もよごれないよ。留守{るす}から戻{もど}ったら、体調{たいちょう}も見{み}てあげよう。</p>
<section data-help-update="care-gems" class="game-help-mini-guide"><p><strong>きょうの30 Gems</strong></p><p>「暮{く}らしのメニュー」で、すきなときに受{う}け取{と}れるよ。お世話{せわ}の前{まえ}でもいいよ。何羽{なんわ}いても、飼育員{しいくいん}さんがいても、おうちで1日{にち}30 Gemsだよ。</p><p>ごはんやふれあいで回復{かいふく}したぶんと、落{お}とし物{もの}のお礼{れい}をあわせた追加分{ついかぶん}は、おうちで1日{にち}10 Gemsまで。Goldとは別{べつ}だよ。日付{ひづけ}は日本{にほん}の時刻{じこく}で変{か}わるよ。来{こ}なかった日{ひ}の取{と}り置{お}きはないよ。</p></section>
<section data-help-update="gold" class="game-help-mini-guide">
<p><strong>1日{にち}に1回{かい}、30 Goldを受{う}け取{と}ろう</strong></p>
<p>Gold（ゴールド）は、ゲームのおこづかいだよ。「暮{く}らしのメニュー」から、受{う}け取{と}れるよ。</p>
<div class="game-help-mini-steps" role="list" aria-label="おこづかいをうけとるじゅんばん">
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">1</span><strong>家族{かぞく}のお世話{せわ}</strong><span>おなかと元気{げんき}を、いっぱいに。</span></div>
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">2</span><strong>よごれていたら、そうじ</strong><span>おうちを、きれいにしよう。</span></div>
<div role="listitem"><span class="game-help-mini-number" aria-hidden="true">3</span><strong>30 Gold</strong><span>「暮{く}らしを確認{かくにん}して受{う}け取{と}る」を押{お}そう。</span></div>
</div>
<p>たまごとひなは、そっと見守{みまも}ろう。何羽{なんわ}いても、おうちで1日{にち}30 Goldだよ。飼育員{しいくいん}さんにお世話{せわ}をたのんだ日{ひ}も、受{う}け取{と}れるよ。</p>
<p>日付{ひづけ}は、日本{にほん}の時刻{じこく}で変{か}わるよ。来{こ}なかった日{ひ}のぶんは、あとから受{う}け取{と}れないよ。病院{びょういん}に行{い}く前{まえ}でも、お礼{れい}は受{う}け取{と}れるよ。</p>
</section>
<section data-help-update="next" class="game-help-mini-guide"><p><strong>つぎは、何{なに}をしよう？</strong></p><p>「暮{く}らしのメニュー」の「次{つぎ}のお楽{たの}しみ」を開{ひら}こう。鳥{とり}をさがすヒントや、なかよし、おかざり、家族{かぞく}のことが見{み}られるよ。気{き}になるものから、のんびりどうぞ。</p></section>
<p>画面{がめん}の鳥{とり}は、なでて遊{あそ}べるよ。本物{ほんもの}の文鳥{ぶんちょう}には、むりにさわらないでね。鳥{とり}のようすを、よく見{み}よう。</p>
<p>音{おと}はゲームのためにつくったものだよ。本物{ほんもの}のおもちや、文鳥{ぶんちょう}の声{こえ}を録音{ろくおん}したものではないよ。</p>
<p class="game-art-disclosure">文鳥{ぶんちょう}の姿{すがた}は、写真{しゃしん}のように見{み}えるAIの絵{え}だよ。鳥{とり}かご（おうち）と公園{こうえん}も、AIでつくった絵{え}だよ。本物{ほんもの}のおもちの写真{しゃしん}や、くらしの記録{きろく}ではないよ。</p>
<p>友達{ともだち}の鳥{とり}は、このゲームに出{で}てくるキャラクターだよ。ほかの人{ひと}と、つながって遊{あそ}ぶしくみではないよ。</p>
</details>
<details data-game-details="help-life"><summary>命{いのち}と、おるすばんについて</summary>
<section data-help-update="away" class="game-help-mini-guide"><p><strong>ゲームを閉{と}じているとき</strong></p><p>ほんとうの1分{ぷん}が、ゲームの1時間{じかん}だよ。ゲームを閉{と}じていても、年齢{ねんれい}と成長{せいちょう}は進{すす}むよ。物語{ものがたり}を止{と}めているときは、進{すす}まないよ。</p><p>長{なが}く留守{るす}にしたときも、出会{であ}いやたまごを、いちどにたくさん増{ふ}やすことはないよ。</p><p>30分{ぷん}以上{いじょう}の留守{るす}のあとには、庭{にわ}のようすが届{とど}くこともあるよ。1日{にち}に1つ、最近{さいきん}の<ruby>7日分<rt>なのかぶん</rt></ruby>まで。「日記{にっき}」からも読{よ}めるよ。物語{ものがたり}を止{と}めているときは、届{とど}かないよ。</p></section>
<section data-help-update="predators" class="game-help-mini-guide"><p><strong>大{おお}きな影{かげ}や、警告{けいこく}が出{で}たら</strong></p><p>警告{けいこく}は、あぶないことを知{し}らせる合図{あいず}だよ。</p><div class="game-help-mini-steps game-help-mini-steps-pair" role="list" aria-label="にわからかえるあいず"><div role="listitem"><strong>カラスの影{かげ}</strong><span>合図{あいず}から6秒{びょう}で来{く}るよ。来{く}る前{まえ}に「おうちへ戻{もど}る」を押{お}そう。</span></div><div role="listitem"><strong>猛禽類{もうきんるい}の警告{けいこく}</strong><span>ワシやタカなどの鳥{とり}のことだよ。「おうちに かえりますか？」と聞{き}かれたら、「おうちに かえる」で安全{あんぜん}に帰{かえ}れるよ。えらんでいる間{あいだ}は時間{じかん}が止{と}まるよ。「にわに のこる」を選{えら}ぶと残{のこ}り時間{じかん}が進{すす}むので、1分{ぷん}以内{いない}に帰{かえ}ろう。残{のこ}り10秒{びょう}で「今{いま}すぐ帰{かえ}る」に変{か}わるよ。</span></div></div><p>カラスにおどろくと、主人公{しゅじんこう}の元気{げんき}が半分{はんぶん}になることがあるよ。危険{きけん}な猛禽類{もうきんるい}から帰{かえ}るのが遅{おく}れると、事故{じこ}で亡{な}くなるよ。</p><p>おうちで留守番{るすばん}している文鳥{ぶんちょう}は、ねらわれないよ。ミサゴや、なかよしになった種類{しゅるい}の鳥{とり}は、おそわないよ。</p><p>猛禽類{もうきんるい}の警告{けいこく}は、画面{がめん}を閉{と}じただけでは消{き}えないよ。帰{かえ}るボタンを押{お}そう。</p></section>
<p>このゲームの文鳥{ぶんちょう}は、ゲームの中{なか}で10年{ねん}たつと、寿命{じゅみょう}をむかえるよ。寿命{じゅみょう}は、生{い}きられる時間{じかん}のことだよ。</p>
<p>留守{るす}のあいだに、ごはんや治療{ちりょう}の期限{きげん}をすぎても、それだけで亡{な}くならないよ。戻{もど}ったときから、少{すく}なくとも24時間{じかん}はお世話{せわ}できるよ。遊{あそ}んでいるあいだは、ごはんが<ruby>3日間<rt>みっかかん</rt></ruby>とどかないときや、病気{びょうき}・けがを24時間{じかん}治{なお}さないときに、亡{な}くなることがあるよ。寿命{じゅみょう}と事故{じこ}は、別{べつ}のルールだよ。</p>
<p>亡{な}くなった鳥{とり}のために、「思{おも}い出{で}の庭{にわ}」にお墓{はか}ができるよ。お線香{せんこう}をあげたり、お祈{いの}りをしたりできるよ。</p>
<p>病院{びょういん}は12 Gold。おるすばんのあいだは、飼育員{しいくいん}さんにお世話{せわ}をたのめるよ。全員分{ぜんいんぶん}で、ほんとうの時間{じかん}の1日{にち}につき24 Goldだよ。</p>
<p>物語{ものがたり}を止{と}めても、おなかと元気{げんき}の時間{じかん}は止{と}まらないよ。ほんとうのお金{かね}を払{はら}うしくみや、広告{こうこく}はないよ。</p>
</details>
<details data-game-details="help-story"><summary>本物{ほんもの}の鳥{とり}とのちがい</summary>
<p>お返事{へんじ}は、名前{なまえ}や気持{きも}ち、友達{ともだち}との思{おも}い出{で}、決{き}まったことばに合{あ}わせて出{で}てくるよ。なんでもわかるAIではないよ。書{か}いたことばを、ゲームの外{そと}へ送{おく}ることもないよ。</p>
<p>本物{ほんもの}のおもちは、女{おんな}の子{こ}の白文鳥{しろぶんちょう}だよ。このゲームの性格{せいかく}やお話{はなし}、家族{かぞく}、育{そだ}ち方{かた}は、つくった物語{ものがたり}だよ。本物{ほんもの}の鳥{とり}のお世話{せわ}や、ひなを育{そだ}てるときの、お手本{てほん}ではないよ。</p>
</details></section>`);
}

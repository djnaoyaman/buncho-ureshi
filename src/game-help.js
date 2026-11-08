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
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-4"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">04</span><span>かぞく</span></span><span class="game-help-guide-caption">つながりを、みまもろう</span></summary><div class="game-help-guide-explanation"><h4>家族{かぞく}を見{み}まもろう。</h4><p>大人{おとな}になった鳥{とり}どうしが、なかよくなると、ふうふになることがあるよ。元気{げんき}や、なかよしの度合{どあ}い、時{とき}、場所{ばしょ}などの条件{じょうけん}がそろうと、たまごが生{う}まれることもあるよ。ふうふにならず、友達{ともだち}のままでもすてきだね。家族{かぞく}が6羽{わ}になったら、おうちの「家族{かぞく}」で成鳥{せいちょう}から独立{どくりつ}の相談{そうだん}があることも。承諾{しょうだく}したときだけ別{べつ}のおうちへ行{い}き、家系図{かけいず}と思{おも}い出{で}に残{のこ}るよ。また友達{ともだち}として招{まね}けるよ。</p></div></details><svg class="game-help-guide-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M 30 0 C 30 20, 70 20, 70 40" /></svg></li>
<li class="game-help-guide-stop"><details class="game-help-guide-card" data-game-details="help-guide-step-5"><summary><span class="game-help-guide-label"><span class="game-help-guide-number">05</span><span>おもいで</span></span><span class="game-help-guide-caption">記念{きねん}カードをつくろう</span></summary><div class="game-help-guide-explanation"><h4>思{おも}い出{で}をつくろう。</h4><p>「家系図{かけいず}」は、家族{かぞく}のつながりがわかる図{ず}だよ。「家系図{かけいず}」や「日記{にっき}」の「記念{きねん}カード」から、アート工房{こうぼう}へ行{い}けるよ。家族{かぞく}のお祝{いわ}いカードをつくってみよう。</p></div></details><img class="game-help-guide-bird" src="./game-art/white.webp" alt="" width="1176" height="1364" loading="lazy"></li>
</ol>
<details data-game-details="help-care"><summary>お世話{せわ}・音{おと}・ゲームの絵{え}について</summary>
<p>日本{にほん}の時刻{じこく}で、毎日{まいにち}7時{じ}・17時{じ}・20時{じ}に、またお世話{せわ}ができるよ。土曜日{どようび}・日曜日{にちようび}・祝日{しゅくじつ}は、12時{じ}にもできるよ。</p>
<p>ごはんは、おなかがいっぱいになるまであげられるよ。名前{なまえ}を呼{よ}ぶ・なでる・お話{はなし}は、元気{げんき}がいっぱいになるまでできるよ。</p>
<p>物語{ものがたり}を止{と}めていても、お世話{せわ}の時刻{じこく}は来{く}るよ。ゲージがへるのは1回分{かいぶん}だけ。でも、ごはんや病院{びょういん}に行{い}くまでの時間{じかん}は、そのまま進{すす}むよ。</p>
${holidayCoverageKnown ? '' : '<p>この年{とし}の祝日{しゅくじつ}は、まだゲームに入{はい}っていないよ。12時{じ}のお世話{せわ}は、土曜日{どようび}と日曜日{にちようび}だけできるよ。</p>'}
<p>画面{がめん}の鳥{とり}は、なでて遊{あそ}べるよ。本物{ほんもの}の文鳥{ぶんちょう}には、むりにさわらないでね。鳥{とり}のようすを、よく見{み}よう。</p>
<p>音{おと}はゲームのためにつくったものだよ。本物{ほんもの}のおもちや、文鳥{ぶんちょう}の声{こえ}を録音{ろくおん}したものではないよ。</p>
<p class="game-art-disclosure">文鳥{ぶんちょう}の姿{すがた}は、写真{しゃしん}のように見{み}えるAIの絵{え}だよ。鳥{とり}かご（おうち）と公園{こうえん}も、AIでつくった絵{え}だよ。本物{ほんもの}のおもちの写真{しゃしん}や、くらしの記録{きろく}ではないよ。</p>
<p>友達{ともだち}の鳥{とり}は、このゲームに出{で}てくるキャラクターだよ。ほかの人{ひと}と、つながって遊{あそ}ぶしくみではないよ。</p>
</details>
<details data-game-details="help-life"><summary>命{いのち}と、おるすばんについて</summary>
<p>このゲームの文鳥{ぶんちょう}は、ゲームの中{なか}で10年{ねん}たつと、寿命{じゅみょう}をむかえるよ。寿命{じゅみょう}は、生{い}きられる時間{じかん}のことだよ。</p>
<p>ほんとうの時間{じかん}で<ruby>3日間<rt>みっかかん</rt></ruby>ごはんがとどかなかったときや、病気{びょうき}・けがをしてから24時間{じかん}、病院{びょういん}で治{なお}してもらわなかったときも、亡{な}くなってしまうよ。</p>
<p>亡{な}くなった鳥{とり}のために、「思{おも}い出{で}の庭{にわ}」にお墓{はか}ができるよ。お線香{せんこう}をあげたり、お祈{いの}りをしたりできるよ。</p>
<p>病院{びょういん}は12 Gold。おるすばんのあいだは、飼育員{しいくいん}さんにお世話{せわ}をたのめるよ。全員分{ぜんいんぶん}で、ほんとうの時間{じかん}の1日{にち}につき24 Goldだよ。</p>
<p>物語{ものがたり}を止{と}めても、ごはんや病院{びょういん}に行{い}くまでの時間{じかん}は止{と}まらないよ。ほんとうのお金{かね}を払{はら}うしくみや、広告{こうこく}はないよ。</p>
</details>
<details data-game-details="help-story"><summary>本物{ほんもの}の鳥{とり}とのちがい</summary>
<p>お返事{へんじ}は、名前{なまえ}や気持{きも}ち、友達{ともだち}との思{おも}い出{で}、決{き}まったことばに合{あ}わせて出{で}てくるよ。なんでもわかるAIではないよ。書{か}いたことばを、ゲームの外{そと}へ送{おく}ることもないよ。</p>
<p>本物{ほんもの}のおもちは、女{おんな}の子{こ}の白文鳥{しろぶんちょう}だよ。このゲームの性格{せいかく}やお話{はなし}、家族{かぞく}、育{そだ}ち方{かた}は、つくった物語{ものがたり}だよ。本物{ほんもの}の鳥{とり}のお世話{せわ}や、ひなを育{そだ}てるときの、お手本{てほん}ではないよ。</p>
</details></section>`);
}

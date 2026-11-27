// An editorial reading room. Real source photographs only; crops never paint anatomy.
export const chapters = [
 ['文鳥ってどんな鳥','世界のなかの、小さな鳥。','遠くの景色から、一羽の暮らしへ。',['homeland','flock'],'景色をひらく'],
 ['からだ探検','からだを、よく見る。','近づくほどに、かたちには理由がある。',['beak','feathers','feet'],'近づいてみる'],
 ['いろんな文鳥','同じ文鳥。ちがう表情。','並べて見ると、色だけではない発見がある。',['colors-white','colors-pied','young'],'違いを見つける'],
 ['しぐさ研究所','その一瞬に、目をとめる。','水を浴びる。羽を整える。そっと見守る。',['bathing','preening'],'しぐさを読む'],
 ['文鳥と暮らす','いっしょに暮らす、その前に。','かわいい、の先にある毎日を考えよう。',['food','contact'],'暮らしを知る'],
 ['おもち観察室','今日のおもちを、見つけよう。','図鑑で知ったことを、ほんとうの観察へ。',['omochi'],'観察につなげる'],
];
const crops={beak:['photo-43',[200,70,800,530]],eyes:['photo-43',[505,145,195,165]],feathers:['photo-31',[670,420,225,270]],feet:['photo-23',[420,430,290,245]],tail:['photo-26',[665,485,375,175]],wings:['photo-26',[390,300,480,225]]};
function photograph(id,{photos,url,esc},crop,eager=false){
 const p=photos.find(p=>p.id===id);if(!p)return '';
 const src=url(p.src.replace(/^\//,''));
 const visual=crop?`<svg class="editorial-photo" viewBox="${crop.join(' ')}" role="img" aria-label="${esc(p.alt)}（部分拡大）"><image href="${src}" width="${p.width}" height="${p.height}"/></svg>`:`<img class="editorial-photo" src="${src}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="${eager?'eager':'lazy'}" ${eager?'fetchpriority="high"':''}>`;
 return `<figure class="editorial-figure">${visual}<figcaption>${esc(p.credit)}${crop?' · 部分拡大':''}</figcaption></figure>`;
}
function tile(a,ctx,kind='small'){
 const {url,esc}=ctx;const selection=crops[a.id];
 const visual=a.id==='omochi'?`<figure class="editorial-figure"><img class="editorial-photo" src="${url('omochi/omochi-original.jpeg')}" alt="指にとまる白文鳥のおもち本人" width="925" height="1536" loading="lazy"><figcaption>おもち本人 · ご家族の提供写真</figcaption></figure>`:photograph(selection?.[0]||a.photos?.[0],ctx,selection?.[1]);
 return `<a class="article-card editorial-tile editorial-tile--${kind}" href="${url('encyclopedia/'+a.id+'/')}">${visual}<div><h3>${esc(a.title)} <span aria-hidden="true">→</span></h3><p>${a.summary}</p></div></a>`;
}
export function renderEncyclopedia(ctx){const {articles,url,esc}=ctx;return `<div class="encyclopedia-editorial"><header class="editorial-heading"><p class="eyebrow">小さな鳥を、もっと好きになる。</p><h1><ruby>文鳥図鑑<rt>ぶんちょうずかん</rt></ruby></h1><p>写真から、ふしぎをひらこう。</p></header><a class="editorial-opening" href="${url('encyclopedia/species/')}">${photograph('photo-29',ctx,null,true)}<div><span class="eyebrow">はじめの一歩</span><h2>文鳥って、どんな鳥？ <span aria-hidden="true">→</span></h2><p>ぷっくりしたからだに、しっかりしたくちばし。</p></div></a><div class="encyclopedia-tools"><label class="search-field"><span>図鑑をさがす</span><input id="article-search" type="search" placeholder="くちばし、水浴び、食べ物…"></label><div class="filter-chips" role="group" aria-label="図鑑の分類"><button class="chip active" data-category="all">すべて</button>${chapters.map(c=>`<button class="chip" data-category="${esc(c[0])}">${esc(c[0])}</button>`).join('')}<button class="chip" data-category="favorites">♡ お気に入り</button></div></div><p id="result-count" role="status"></p><div id="article-grid"></div><footer class="editorial-colophon"><p>見つけるたび、<br>好きになる。</p><a href="${url('body/')}">図から見つける「からだ探検」 →</a><a href="${url('colors/')}">羽色と成長を写真で見くらべる →</a><small>掲載写真は実際の文鳥です。一部を切り抜いて拡大しています。色や模様を描き加えた生成写真は使用していません。各記事に情報源・元写真・作者・利用条件を掲載しています。<a href="${url('credits/')}">写真の出典</a></small></footer></div>`;}
export function renderEncyclopediaChapters(ctx){const {articles,url,esc}=ctx;return chapters.map((c,i)=>{
 const group=articles.filter(a=>a.category===c[0]);const featured=c[3].map(id=>group.find(a=>a.id===id)).filter(Boolean);
 return `<section class="encyclopedia-chapter chapter-${i+1}" aria-labelledby="chapter-${i+1}"><header><span class="chapter-number">${String(i+1).padStart(2,'0')}</span><p class="eyebrow">${c[4]}</p><h2 id="chapter-${i+1}">${c[1]}</h2><p>${c[2]}</p></header><div class="editorial-moments">${featured.map((a,j)=>tile(a,ctx,j===0?'lead':'small')).join('')}</div><nav class="chapter-index" aria-label="${esc(c[0])}の記事">${group.filter(a=>!c[3].includes(a.id)).map(a=>`<a class="article-card editorial-text-link" href="${url('encyclopedia/'+a.id+'/')}"><span>${esc(a.title)}</span><span aria-hidden="true">→</span></a>`).join('')}</nav></section>`;
}).join('');}
export function renderEditorialArticle(a,legacy,ctx){
 const {esc}=ctx;const selection=crops[a.id];let lead='';
 if(a.photos?.length){lead=photograph(selection?.[0]||a.photos[0],ctx,selection?.[1],true);}
 else if(a.id==='omochi')lead=`<figure class="editorial-figure"><img class="editorial-photo" src="${ctx.url('omochi/omochi-original.jpeg')}" alt="白文鳥のおもち本人" width="925" height="1536"><figcaption>おもち本人 · ご家族の提供写真</figcaption></figure>`;
 // Keep every original paragraph, source, glossary and action, but let the photo begin the story.
 legacy=legacy.replace(/<figure class="article-hero">[\s\S]*?<\/figure>/,'');
 legacy=legacy.replace('<div class="article-actions">',`<div class="editorial-story-lead">${lead}<p class="editorial-observation">${a.mission||'写真と説明を見くらべて、一つ発見してみよう。'}</p></div><div class="article-actions">`);
 if(a.id==='omochi')legacy=legacy.replace('一般の文鳥についての解説です。写真はおもち本人ではありません。','写真はご家族が提供した、おもち本人の写真です。');
 // Extra crop references retain a direct, visible license trail.
 if(selection && !a.photos?.includes(selection[0])){const p=ctx.photos.find(p=>p.id===selection[0]);legacy=legacy.replace('</summary><p>情報確認日',`</summary><p>追加の拡大写真：<a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.author)}</a> · <a href="${esc(p.licenseUrl.replace(/^http:/,'https:'))}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>（部分拡大）</p><p>情報確認日`);}
 legacy=legacy.replace('<article class="article-body">','<div class="article-body">').replace(/<\/article>$/,'</div>');
 return `<article class="encyclopedia-story" data-story="${esc(a.id)}">${legacy}<a class="editorial-back" href="${ctx.url('encyclopedia/')}">← 写真から、次の発見へ</a></article>`;
}

export function renderArticleBase(a,ctx) {
 const {photos,articles,url,esc,birdVideo,favorites=[]}=ctx;
 // The document base is the site root; the TOC must point to this article before JS loads.
 const articlePath=esc(url(`encyclopedia/${a.id}/`));
 const heading=(category,title)=>`<header class="page-heading"><p class="eyebrow">${category}</p><h1>${title}</h1></header>`;
 const image=(id,cls='',eager=false)=>{const p=photos.find(p=>p.id===id);return p?`<img class="${cls}" src="${url(p.src.replace(/^\//,''))}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="${eager?'eager':'lazy'}">`:'';};
 const secureLicenseUrl=value=>value?.replace(/^http:\/\/creativecommons\.org\//,'https://creativecommons.org/');
 const paragraphs=s=>s?.includes('<p>')?s:(s||'').split('\n').filter(Boolean).map(p=>`<p>${p}</p>`).join('');
 const photoCredits=ids=>ids.map(id=>photos.find(p=>p.id===id)).filter(Boolean).map(p=>`<li><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.alt)}</a> — ${esc(p.author)} / <a href="${esc(secureLicenseUrl(p.licenseUrl))}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a></li>`).join('');
 const articleCoverOverrides={conservation:"photo-03",beak:"photo-14",eyes:"photo-43",tail:"photo-26",observation:"photo-27",resting:"photo-21",voice:"photo-19",sleep:null,clean:"photo-11",molt:"photo-37",health:null};
 const birdSvg=()=>'';const birdPhotoCredit=()=>'';
function videoBlock() {
  return `<figure class="bird-video"><video controls playsinline preload="none" aria-label="${esc(birdVideo.alt)}" ><source src="${url("photos/cinnamon-song.mp4")}" type="video/mp4"><source src="${url(birdVideo.src.replace(/^\//, ""))}" type="video/webm">この端末で映像を再生できない場合も、下の説明と図鑑を読めます。</video><figcaption>${esc(birdVideo.alt)}<br>実際の文鳥の録音を含む12秒の映像。再生すると音が出ます。MP4版は形式変換のみ（CC BY-SA 3.0）。<br>${esc(birdVideo.credit)} · <a href="${esc(birdVideo.source)}" target="_blank" rel="noopener noreferrer">元の映像</a> · <a href="${esc(secureLicenseUrl(birdVideo.licenseUrl))}" target="_blank" rel="noopener noreferrer">利用条件</a></figcaption><div class="video-buttons"><button data-video-play>声をきく</button><button data-video-stop>再生を止める</button><button data-video-mute aria-pressed="false">音を消す</button></div></figure>`;
}


  const html = `<nav class="breadcrumb" aria-label="現在の場所"><a href="${url("encyclopedia/")}">図鑑</a><span aria-hidden="true">/</span>${esc(a.category)}</nav>${heading(esc(a.category), esc(a.title))}<div class="article-actions"><button id="favorite" aria-pressed="${favorites.includes(a.id)}">${favorites.includes(a.id) ? "♥ お気に入り" : "♡ お気に入りにする"}</button><button id="speak">解説をきく</button><button id="stop-speak">読み上げをとめる</button></div><nav class="article-toc" aria-label="この記事の目次"><a href="${articlePath}#first">まず見る</a><a href="${articlePath}#basic">基本を知る</a>${a.id === "omochi" ? "" : `<a href="${articlePath}#deep">もっと調べる</a><a href="${articlePath}#sources">出典</a>`}</nav><article class="article-body"><section id="first"><p class="eyebrow">01　まず見る</p><p class="article-summary">${a.summary}</p>${a.photos?.length ? `<figure class="article-hero">${image(a.photos[0], "", true)}<figcaption>${esc(photos.find((p) => p.id === a.photos[0])?.alt || "")}</figcaption></figure>` : `${birdSvg()}<p class="quiet">${birdPhotoCredit()}</p>`}</section>${["voice", "courtship"].includes(a.id) ? videoBlock() : ""}<section id="basic"><p class="eyebrow">02　基本を知る</p><h2>しくみを見てみよう</h2><div class="prose">${paragraphs(a.body)}</div></section><section id="deep"><p class="eyebrow">03　もっと調べる</p><h2>もう一歩、その先へ。</h2><div class="prose">${paragraphs(a.deep)}</div>${a.terms?.length ? `<dl class="glossary">${a.terms.map((t) => `<div><dt><ruby>${esc(t.term)}<rt>${esc(t.reading)}</rt></ruby></dt><dd>${esc(t.meaning)}</dd></div>`).join("")}</dl>` : ""}</section>${
    a.photos?.length > 1
      ? `<div class="photo-row">${a.photos
          .slice(1)
          .map(
            (id) =>
              `<figure>${image(id)}<figcaption>${esc(photos.find((p) => p.id === id)?.alt || "")}</figcaption></figure>`,
          )
          .join("")}</div>`
      : ""
  }<aside class="mission"><span class="eyebrow">観察ミッション</span><p>${a.mission || "写真と説明を見比べて、気づいたことを一つ見つけよう。"}</p><small>鳥を追いかけたり、嫌がることをしたりせずに観察しよう。</small></aside><details id="sources" class="source-box research-details"><summary>確かめた資料と写真</summary><p>情報確認日：${esc(a.checkedAt || "2026-11-02")}。一般の文鳥についての解説です。写真はおもち本人ではありません。</p><ul>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul><ul>${photoCredits([...new Set([...(a.photos || []), articleCoverOverrides[a.id]].filter(Boolean))])}</ul></details><h2>つながる発見</h2><div class="related-links">${(
    a.related || []
  )
    .map((id) => articles.find((x) => x.id === id))
    .filter(Boolean)
    .map(
      (x) => `<a href="${url(`encyclopedia/${x.id}/`)}">${esc(x.title)} →</a>`,
    )
    .join("")}</div></article>`;
  // A personal introduction is not a research article. Do not display empty
  // editorial scaffolding or internal production notes to readers.
  if(a.id==='omochi')return html
    .replace(/<section id="deep">[\s\S]*?<\/section>/,'')
    .replace(/<details id="sources"[\s\S]*?<\/details>/,'')
    .replace('<h2>しくみを見てみよう</h2>','<h2>おもちのこと</h2>');
  return html;
}

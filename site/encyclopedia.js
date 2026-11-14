// An editorial reading room. Real source photographs only; crops never paint anatomy.
export const chapters = [
 ['文鳥ってどんな鳥','世界のなかの、小さな鳥。','遠くの景色から、一羽の暮らしへ。',['homeland','flock'],'景色をひらく'],
 ['からだ探検','からだを、よく見る。','近づくほどに、かたちには理由がある。',['beak','feathers','feet'],'近づいてみる'],
 ['いろんな文鳥','同じ文鳥。ちがう表情。','並べて見ると、色だけではない発見がある。',['colors-white','colors-pied','young'],'違いを見つける'],
 ['しぐさ研究所','その一瞬に、目をとめる。','水を浴びる。羽を整える。そっと見守る。',['bathing','preening'],'しぐさを読む'],
 ['文鳥と暮らす','いっしょに暮らす、その前に。','かわいい、の先にある毎日を考えよう。',['food','contact'],'暮らしを知る'],
 ['おもち観察室','今日のおもちを、見つけよう。','図鑑で知ったことを、ほんとうの観察へ。',['omochi'],'観察につなげる'],
];
const crops={beak:['photo-13',[180,110,700,480]],eyes:['photo-13',[300,170,420,320]],feathers:['photo-31',[670,420,225,270]],feet:['photo-23',[420,430,290,245]],tail:['photo-26',[665,485,375,175]],wings:['photo-26',[390,300,480,225]]};
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
export function renderEncyclopedia(ctx){const {articles,url,esc}=ctx;return `<div class="encyclopedia-editorial"><header class="editorial-heading"><p class="eyebrow">小さな鳥を、もっと好きになる。</p><h1><ruby>文鳥図鑑<rt>ぶんちょうずかん</rt></ruby></h1><p>写真から、ふしぎをひらこう。</p></header><a class="editorial-opening" href="${url('encyclopedia/species/')}">${photograph('photo-29',ctx,null,true)}<div><span class="eyebrow">はじめの一歩</span><h2>文鳥って、どんな鳥？ <span aria-hidden="true">→</span></h2><p>ぷっくりしたからだに、しっかりしたくちばし。</p></div></a><div class="encyclopedia-tools"><label class="search-field"><span>図鑑をさがす</span><input id="article-search" type="search" placeholder="くちばし、水浴び、食べ物…"></label><div class="filter-chips" role="group" aria-label="図鑑の分類"><button class="chip active" data-category="all">すべて</button>${chapters.map(c=>`<button class="chip" data-category="${esc(c[0])}">${esc(c[0])}</button>`).join('')}<button class="chip" data-category="favorites">♡ お気に入り</button></div></div><p id="result-count" role="status"></p><div id="article-grid"></div><footer class="editorial-colophon"><p>見つけるたび、<br>好きになる。</p><a href="${url('body/')}">図から見つける「からだ探検」 →</a><a href="${url('colors/')}">羽色と成長を写真で見くらべる →</a><small>掲載写真は実際の文鳥です。一部を切り抜いて拡大しています。色や模様を描き加えた生成写真は使用していません。各記事に元写真・作者・利用条件を掲載しています。<a href="${url('credits/')}">写真の出典</a></small></footer></div>`;}
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
 // Extra crop references retain a direct, visible license trail.
 if(selection && !a.photos?.includes(selection[0])){const p=ctx.photos.find(p=>p.id===selection[0]);legacy=legacy.replace('</summary><p>情報確認日',`</summary><p>追加の拡大写真：<a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.author)}</a> · <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>（部分拡大）</p><p>情報確認日`);}
 return `<div class="encyclopedia-story" data-story="${esc(a.id)}">${legacy}<a class="editorial-back" href="${ctx.url('encyclopedia/')}">← 写真から、次の発見へ</a></div>`;
}

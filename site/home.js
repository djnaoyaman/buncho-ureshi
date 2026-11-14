import { renderHome as legacyHome } from '../src/home.js';
export function renderHome(options) {
 const {url}=options;
 let html=legacyHome(options);
 const cover=`<section class="art-cover renewal-cover" aria-labelledby="cover-title"><div class="renewal-hero"><img src="${url('site/hero.webp')}" alt="白文鳥と草花を描いたイメージ。実際のおもちの記録写真ではありません" width="1122" height="1402" decoding="async" fetchpriority="high"><div class="renewal-hero-copy"><p class="eyebrow">おもちと学ぶ文鳥図鑑</p><h1 id="cover-title"><ruby>小<rt>ちい</rt></ruby>さな<ruby>鳥<rt>とり</rt></ruby>と、<br><ruby>大<rt>おお</rt></ruby>きな<ruby>発見<rt>はっけん</rt></ruby>。</h1><p class="renewal-intro">文鳥の魅力やくらし。<br>もっと知りたくなる発見を。<br>あつめた、文鳥の学びのサイトです。</p></div></div><p class="renewal-image-note">白文鳥のイメージイラスト</p></section>`;
 html=html.replace(/<section class="art-cover"[\s\S]*?<\/section>/,cover);
 html=html.replace('class="art-game-content"','class="art-game-content renewal-game-content"');
 html=html.replace('<h2 id="home-game-title">',`<img class="renewal-game-bird" src="${url('site-brand-v1/bird-05-master.webp')}" alt="白文鳥のイラスト" width="220" height="220" loading="lazy"><h2 id="home-game-title">`);
 const pictures=[['site/feather.svg','羽根のイラスト'],['site-brand-v1/bird-05-master.webp','白文鳥のイラスト'],['site/brush.svg','絵筆のイラスト']];
 let door=0;
 html=html.replace(/<span class="art-door-number">(.*?)<\/span>/g,()=>{const[p,a]=pictures[door++];return `<span class="renewal-door-art"><img src="${url(p)}" alt="${a}" width="150" height="150" loading="lazy"></span>`;});
 return html;
}

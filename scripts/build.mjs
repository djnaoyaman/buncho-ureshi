import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { articles } from "../src/data/articles.js";
import { photos } from "../src/data/photos.js";
import { SITE_NAME, esc } from "../src/visuals.js";
const base = "/buncho-ureshi/",
  origin = "https://djnaoyaman.github.io";
const dest = new URL("../dist/", import.meta.url);
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(new URL("../src/", import.meta.url), new URL("src/", dest), {
  recursive: true,
});
await cp(new URL("../public/", import.meta.url), dest, { recursive: true });
const pages = [
  [
    "",
    "おもちと学ぶ文鳥図鑑。写真で知る、アートをつくる、文鳥たちの自律した暮らしを見守る。",
    "",
  ],
  [
    "encyclopedia/",
    "文鳥の分類、からだ、羽色、しぐさ、暮らし。三段階で読む写真図鑑。",
    "文鳥図鑑",
  ],
  [
    "body/",
    "くちばし、目、耳、翼、羽毛、尾、足からひらく文鳥のからだ探検。",
    "からだ探検",
  ],
  [
    "omochi/",
    "娘のペット、メスの白文鳥おもちの観察室。実際の記録とゲームを分けて紹介します。",
    "おもち観察室",
  ],
  [
    "challenge/",
    "文鳥の写真と図から考えるクイズ。解説と観察ミッションで学べます。",
    "文鳥チャレンジ",
  ],
  [
    "studio/",
    "文鳥写真と植物の造形でつくるアート工房。画像保存、共有、音あそび。",
    "文鳥アート工房",
  ],
  [
    "game/",
    "性格・関係・記憶から鳥たちが自分で暮らす、家族の生活シミュレーション。",
    "おもちの文鳥ぐらし",
  ],
  ["credits/", "文鳥図鑑の参考資料と写真の作者・ライセンス。", "出典と素材"],
  [
    "help/",
    "ふりがな、読み上げ、アート工房、ゲーム、端末内保存について。",
    "遊び方と設定",
  ],
  ...articles.map((a) => [
    `encyclopedia/${a.id}/`,
    strip(a.summary),
    a.title,
    a,
  ]),
];
function strip(s) {
  return String(s)
    .replace(/<rt>.*?<\/rt>/g, "")
    .replace(/<[^>]+>/g, "");
}
function articleLinks(list) {
  return `<ul>${list.map(a => `<li><a href="${base}encyclopedia/${a.id}/">${esc(a.title)}</a> — ${a.summary}</li>`).join("")}</ul>`;
}
function photoFigure(id) {
  const p = photos.find(photo => photo.id === id);
  return p ? `<figure><img src="${base + p.src.replace(/^\//, "")}" alt="${esc(p.alt)}" loading="lazy" decoding="async"><figcaption>${esc(p.alt)} — ${esc(p.author)} / <a href="${esc(p.source)}">元の写真</a> / <a href="${esc(p.licenseUrl)}">${esc(p.license)}</a></figcaption></figure>` : "";
}
function staticMain(route, description, title, article) {
  if (article) return `<article><h1>${esc(article.title)}</h1><p>${article.summary}</p>${photoFigure(article.photos?.[0])}<h2>基本を知る</h2><p>${article.body}</p><h2>もっと調べる</h2><p>${article.deep}</p>${article.terms?.length ? `<dl>${article.terms.map(t => `<dt><ruby>${esc(t.term)}<rt>${esc(t.reading)}</rt></ruby></dt><dd>${esc(t.meaning)}</dd>`).join("")}</dl>` : ""}<h2>観察ミッション</h2><p>${esc(article.mission)}</p><h2>出典</h2><p>情報確認日：${esc(article.checkedAt)}</p><ul>${article.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul><h2>つながる発見</h2>${articleLinks(articles.filter(a => article.related?.includes(a.id)))}</article>`;
  const intros = {
    "": "写真でまず見る、ふりがな付きの本文で基本を知る、出典と詳しい説明でもっと調べる。文鳥の体と暮らしを学び、植物と鳥のアートや、創作の家族の物語を楽しめます。",
    "encyclopedia/": "分類やふるさと、体のしくみ、羽色、しぐさ、鳥と暮らすときの安全をまとめました。各記事には観察ミッション、用語の説明、確認日と情報源があります。",
    "body/": "くちばし、目、耳、翼、羽毛、尾、足を選び、形と役割を調べましょう。耳の穴は羽毛に隠れています。模式図は位置やしくみを説明するための表現です。",
    "omochi/": "おもちは娘さんのペットで、メスの白文鳥です。年齢・誕生日・性格・好物、本人の写真や観察エピソードは未提供です。一般の文鳥写真を本人として扱わず、ゲームの出来事は実際の観察記録と区別します。",
    "challenge/": "写真や図を見て選ぶ文鳥クイズです。正解の解説と関連記事で、理由まで確かめられます。観察ミッションは鳥が嫌がることをせず、静かに見守って取り組みましょう。",
    "studio/": "お手本を選び、文鳥写真やオリジナルの鳥・花・葉を配置します。移動、拡大縮小、回転、配色、文字、元に戻す・やり直すに対応。正方形や縦長の画像には写真のクレジットも入り、対応端末では共有できます。音楽と操作音は利用者が有効にしたときだけ鳴ります。",
    "game/": "メスの白文鳥おもちから始まる、創作の生活シミュレーション。文鳥は性格・気分・相手との関係・記憶から交流し、条件がそろうとつがい、卵、ひな、幼鳥、成鳥へと家族の物語が続きます。近い血縁同士は繁殖せず、不在への罰や死亡はありません。現実の飼育手順ではなく、保存はこの端末内です。",
    "help/": "ふりがなは上のボタン、解説の読み上げは各記事で操作できます。ゲーム、作品、お気に入り、観察ノートはブラウザ内に保存され、端末間では自動同期しません。ゲームは保存ファイルを書き出して保管できます。声や画像共有の対応は端末によって異なります。",
    "credits/": "実写写真の権利は各作者に帰属し、素材ごとの利用条件に従います。一般の文鳥の資料写真で、おもち本人ではありません。アート用に認められた写真だけを工房で使い、保存画像にも作者・原典・利用条件を残します。",
    "404.html": "この場所にはページがありません。下のリンクから文鳥たちの庭や図鑑へ戻れます。"
  };
  let details = "";
  if (route === "encyclopedia/") details = articleLinks(articles);
  else if (route === "body/") details = articleLinks(articles.filter(a => a.category === "からだ探検"));
  else if (route === "omochi/") details = articleLinks(articles.filter(a => ["omochi", "questions", "observation"].includes(a.id)));
  else if (route === "challenge/") details = articleLinks(articles.filter(a => ["species", "young", "bathing"].includes(a.id)));
  else if (route === "credits/") details = `<h2>写真の作者と利用条件</h2><ul>${photos.map(p => `<li><a href="${esc(p.source)}">${esc(p.title)}</a> — ${esc(p.author)} / <a href="${esc(p.licenseUrl)}">${esc(p.license)}</a></li>`).join("")}</ul>`;
  else if (route === "") details = photoFigure("photo-39");
  const links = pages.filter(page => !page[3] && page[0] !== route).map(([target, , label]) => `<li><a href="${base + target}">${esc(label || "トップへ戻る")}</a></li>`).join("");
  return `<h1>${esc(title || SITE_NAME)}</h1><p>${esc(description)}</p><p>${esc(intros[route] || "")}</p>${details}<nav aria-label="主なコーナー"><h2>文鳥の庭をめぐる</h2><ul>${links}</ul></nav>`;
}
function html(route, description, title, article) {
  const fullTitle = title ? title + " | " + SITE_NAME : SITE_NAME;
  const canonical = origin + base + route;
  const fallback = staticMain(route, description, title, article);
  return `<!doctype html>
<html lang="ja" data-ruby="on"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${base}"><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#244c3b">${route === "404.html" ? '<meta name="robots" content="noindex, follow">' : ""}<link rel="canonical" href="${canonical}"><meta property="og:type" content="${article ? "article" : "website"}"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="${esc(SITE_NAME)}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin + base}ogp.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="icon" href="favicon.png" type="image/png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="src/studio.css"><link rel="stylesheet" href="src/game.css"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": article ? "Article" : "WebSite", name: fullTitle, headline: article?.title, description, url: canonical, inLanguage: "ja", isAccessibleForFree: true }).replace(/</g, "\\u003c")}</script></head><body><a class="skip-link" href="${base + route}#main">本文へすすむ</a><header class="site-header"><a class="brand" id="brand" href="${base}" aria-label="${esc(SITE_NAME)} トップ"><span>${esc(SITE_NAME)}</span></a><nav class="desktop-nav" aria-label="主なメニュー"><a href="${base}encyclopedia/" data-nav="encyclopedia/">文鳥図鑑</a><a href="${base}omochi/" data-nav="omochi/">おもち観察室</a><a href="${base}studio/" data-nav="studio/">アート工房</a><a href="${base}game/" data-nav="game/">文鳥ぐらし</a></nav><div class="header-controls"><button id="ruby-toggle" aria-pressed="true">ふりがな：あり</button><button id="menu-toggle" aria-expanded="false" aria-controls="menu" aria-label="メニューをひらく"><span class="menu-bars" aria-hidden="true"></span>メニュー</button></div><div class="header-menu" id="menu" hidden><nav aria-label="すべてのメニュー"><a href="${base}">トップ</a><a href="${base}encyclopedia/">文鳥図鑑</a><a href="${base}body/">からだ探検</a><a href="${base}omochi/">おもち観察室</a><a href="${base}challenge/">文鳥チャレンジ</a><a href="${base}studio/">アート工房</a><a href="${base}game/">文鳥ぐらし</a><a href="${base}help/">遊び方・設定</a><a href="${base}credits/">出典と素材</a></nav><form id="site-search" role="search"><label for="global-query">サイト内をさがす</label><input id="global-query" name="query" type="search" placeholder="気になることば" maxlength="80"><button aria-label="検索する">検索</button></form></div></header><main id="main" tabindex="-1"><div class="page-content" data-static-content>${fallback}</div><noscript><p class="page-content">ゲーム・工房・検索・読み上げにはJavaScriptを有効にしてください。図鑑の本文は上から読めます。</p></noscript></main><footer class="site-footer"><div class="footer-top"><div><h2>${esc(SITE_NAME)}</h2><p>おもちと学ぶ文鳥図鑑<br>見る。知る。つくる。いっしょに暮らす。</p></div><nav class="footer-links" aria-label="フッターメニュー"><a href="${base}help/">遊び方・設定</a><a href="${base}credits/">出典と素材</a><a href="https://github.com/djnaoyaman/buncho-ureshi" target="_blank" rel="noopener noreferrer">ソースコード</a></nav></div><div class="footer-bottom"><span>実際のおもちの観察と、ゲームの物語は別のものです。</span><span>© 2026 Buncho Ureshi · 写真は各作者に帰属</span></div></footer><div id="status" class="sr-only" role="status" aria-live="polite"></div><script type="module" src="src/app.js"></script></body></html>`;
}
for (const [route, description, title, article] of pages) {
  const folder = new URL(route, dest);
  await mkdir(folder, { recursive: true });
  await writeFile(
    new URL("index.html", folder),
    html(route, description, title, article),
  );
}
await writeFile(
  new URL("404.html", dest),
  html(
    "404.html",
    "ページが見つかりません。文鳥たちの庭へ戻れます。",
    "ページが見つかりません",
  ),
);
await writeFile(
  new URL("sitemap.xml", dest),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    pages
      .map(([route]) => `<url><loc>${origin + base + route}</loc></url>`)
      .join("") +
    "</urlset>",
);
await writeFile(
  new URL("robots.txt", dest),
  `User-agent: *\nAllow: /\nSitemap: ${origin + base}sitemap.xml\n`,
);
await writeFile(new URL(".nojekyll", dest), "");
console.log(
  `Built ${pages.length} pages, ${articles.length} articles and ${photos.length} photographs at ${base}`,
);

import { articles } from "./data/articles.js";
import { photos, birdVideo } from "./data/photos.js";
import { quizzes } from "./data/quizzes.js";
import { SITE_NAME, esc, birdSvg, logoSvg, flourish } from "./visuals.js";
import { readLocal, writeLocal } from "./storage.js";
import { mountGame, gameBirdSvg } from "./game.js";
import { mountStudio } from "./studio.js";
const BASE = document.querySelector("base").getAttribute("href");
const url = (route = "") => BASE + route.replace(/^\//, "");
const photoUrl = (p) => url(p.src.replace(/^\//, ""));
const image = (id, cls = "", eager = false) => {
  const p = photos.find((p) => p.id === id) || photos[0];
  return p
    ? `<img class="${cls}" src="${photoUrl(p)}" alt="${esc(p.alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async" width="960" height="720"${eager ? ' fetchpriority="high"' : ""}>`
    : birdSvg();
};
const storedSettings=readLocal("buncho-settings", {});
const settings={ruby:typeof storedSettings.ruby==='boolean'?storedSettings.ruby:true,motion:typeof storedSettings.motion==='boolean'?storedSettings.motion:!matchMedia("(prefers-reduced-motion: reduce)").matches};
let favorites=[...new Set(readLocal("buncho-favorites", []).filter(id=>typeof id==='string'&&articles.some(a=>a.id===id)))];
const readObservations=()=>readLocal("buncho-observations",[]).filter(n=>n&&typeof n==='object'&&typeof n.note==='string'&&n.note.trim()&&n.note.length<=600&&typeof n.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(n.date)&&Number.isFinite(Date.parse(n.date))&&new Date(n.date).toISOString().slice(0,10)===n.date).slice(0,100).map(n=>({date:n.date,note:n.note}));
let teardown = () => {},
  studioSeed = null;
const main = document.querySelector("main");
function applySettings() {
  document.documentElement.dataset.ruby = settings.ruby ? "on" : "off";
  document.documentElement.dataset.motion = settings.motion ? "on" : "off";
  document
    .querySelector("#ruby-toggle")
    .setAttribute("aria-pressed", String(settings.ruby));
  document.querySelector("#ruby-toggle").textContent = settings.ruby
    ? "ふりがな：あり"
    : "ふりがな：なし";
  writeLocal("buncho-settings", settings);
}
const plain = (s) => {
  const x = document.createElement("div");
  x.innerHTML = s || "";
  x.querySelectorAll("rt,rp").forEach((e) => e.remove());
  return x.textContent;
};
function speak(text) {
  if (!("speechSynthesis" in window)) {
    announce(
      "この端末では読み上げを使えません。文章を読んで楽しんでください。",
    );
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text));
  u.lang = "ja-JP";
  u.rate = 0.88;
  u.onerror = () =>
    announce(
      "読み上げを始められませんでした。端末の音声設定をご確認ください。",
    );
  speechSynthesis.speak(u);
}
function announce(text) {
  document.querySelector("#status").textContent = text;
}
function navigate(route, replace = false) {
  teardown();
  teardown = () => {};
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const target = new URL(url(route), location.origin);
  const path = target.pathname + target.search;
  if (location.pathname + location.search !== path)
    (replace ? history.replaceState : history.pushState).call(
      history,
      {},
      "",
      path,
    );
  render(target.pathname.slice(BASE.length));
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#menu").hidden = true;
  document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  main.focus({ preventScroll: true });
}
function heading(eyebrow, title, description = "") {
  return `<header class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${description ? `<p class="lede">${description}</p>` : ""}${flourish()}</header>`;
}
function articleCard(a) {
  return `<a class="article-card" href="${url(`encyclopedia/${a.id}/`)}">${a.category === "おもち観察室" ? `<div class="observation-card-art">${birdSvg()}<small>案内イラスト</small></div>` : image(a.photos?.[0])}<div><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${a.summary}</p></div><span class="card-arrow" aria-hidden="true">↗</span></a>`;
}
const siteSections = [
  { route: "", title: "トップ · 文鳥の庭", description: "写真で知る、アートをつくる、文鳥と暮らす。今日の発見と観察ミッション。" },
  { route: "encyclopedia/", title: "文鳥図鑑", description: "文鳥の種類、体、羽色、しぐさ、食べ物、飼育の基本。写真と出典から三段階で学ぶ。" },
  { route: "body/", title: "文鳥のからだ探検", description: "くちばし、目、耳、翼、羽毛、尾、足。場所を選んで写真を拡大し、しくみを調べる。" },
  { route: "omochi/", title: "おもち観察室", description: "実際のメスの白文鳥おもちについて、わかっていること。自分が見たことを端末内の観察ノートに保存する。" },
  { route: "challenge/", title: "文鳥チャレンジ", description: "写真と図から考えるクイズ。答えの解説と、図鑑につながる観察ミッション。" },
  { route: "studio/", title: "文鳥アート工房", description: "鳥と花、実写写真、テンプレートで絵をつくる。移動・色・回転・音あそび、作品のPNG画像保存と共有。" },
  { route: "game/", title: "おもちの文鳥ぐらし · ゲーム", description: "自分で暮らす鳥と会話し、家族・関係・記憶・日記を見守る生活ゲーム。設定、保存データの書き出しと読み込み。" },
  { route: "help/", title: "遊び方と設定 · 保存の手引き", description: "図鑑の読み方、ふりがな、読み上げ、アート工房、ゲームの遊び方。端末内保存、バックアップ、データ消去と読みやすさの設定。" },
  { route: "credits/", title: "出典と素材", description: "実写写真と本物の声の映像の作者、出典、ライセンス。記事の参考資料と素材の利用条件。" },
];
const searchText = (value) => String(value).normalize("NFKC").toLocaleLowerCase("ja");
function siteSearch(query) {
  const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
  const matches = (value) => terms.every((term) => searchText(plain(value)).includes(term));
  const sections = siteSections.filter((s) => matches(`${s.title} ${s.description}`));
  const found = terms.length ? articles.filter((a) => matches([a.title, a.category, a.summary, a.body, a.deep, ...(a.terms || []).flatMap((t) => [t.term, t.reading, t.meaning])].join(" "))) : [];
  const total = sections.length + found.length;
  return `${heading("サイト内検索", "庭のすみずみまで、さがそう。", "図鑑の記事と、つくる・暮らす・保存のページを一緒に調べます。")}<form id="search-results-form" class="site-search-form" role="search" aria-label="サイト全体の検索"><label for="search-query">さがしたいことば</label><div><input id="search-query" name="query" type="search" maxlength="80" value="${esc(query)}" placeholder="アート、保存、ゲーム、水浴び…"><button class="button">検索する</button></div></form><p id="search-result-status" role="status">${terms.length ? `「${esc(query)}」：${total}件（ページ ${sections.length}件・図鑑の記事 ${found.length}件）` : "ことばを入れて検索してね。まずは、主なページから選べます。"}</p>${!total ? '<p class="search-empty">見つからなかったよ。短いことばにするか、別のことばでさがしてみよう。</p>' : ""}<section id="section-results" aria-labelledby="section-results-heading"><h2 id="section-results-heading">${terms.length ? "ページ・遊び方" : "主なページの案内"}</h2>${sections.length ? `<div class="section-search-grid">${sections.map((s) => `<a class="section-result" href="${url(s.route)}"><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p><span aria-hidden="true">ページをひらく →</span></a>`).join("")}</div>` : '<p class="quiet">あてはまるページはありません。</p>'}</section><section id="search-article-results" aria-labelledby="search-articles-heading"><h2 id="search-articles-heading">図鑑の記事</h2>${found.length ? `<div class="article-grid">${found.map(articleCard).join("")}</div>` : `<p class="quiet">${terms.length ? "あてはまる記事はありません。" : "ことばを入れると、本文や用語からも記事を探せます。"}</p>`}</section><a class="text-link" href="${url("encyclopedia/")}">分類から文鳥図鑑をひらく →</a>`;
}
function submitSiteSearch(event) {
  event.preventDefault();
  const query = event.currentTarget.querySelector('[name="query"]').value.trim().slice(0, 80);
  document.querySelector("#global-query").value = query;
  navigate(`?q=${encodeURIComponent(query)}`);
}
function home() {
  const hero = photos.find((p) => p.id === "photo-39") || photos[0];
  const d = articles[new Date().getDate() % Math.max(1, articles.length)];
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow">おもちと学ぶ文鳥図鑑</p><h1 class="sr-only">${SITE_NAME}</h1>${logoSvg("hero-logo")}<p class="hero-line">ちいさな鳥と、<br>おおきな「どうして？」。</p><p>見て、知って、つくって、暮らす。<br>文鳥のふしぎが芽ぶく、小さな植物園へ。</p><a class="button" href="${url("encyclopedia/")}">文鳥を知る <span aria-hidden="true">↗</span></a></div><figure class="hero-photo">${image(hero?.id, "", true)}<figcaption>図鑑の文鳥写真 · おもち本人の写真ではありません</figcaption><span class="photo-seal" aria-hidden="true">JAVA<br>SPARROW</span></figure><div class="hero-vine" aria-hidden="true">${flourish()}</div></section><section class="portal-section section"><div class="section-intro"><p class="eyebrow">ひらく、4つの扉</p><h2>今日は、どこへ行こう？</h2></div><div class="portals"><a href="${url("encyclopedia/")}" class="portal"><span class="portal-number">01</span><span class="portal-illustration">${birdSvg("gray")}</span><h3>文鳥を知る</h3><p>写真と図で、体と暮らしを発見。</p><span aria-hidden="true">図鑑をひらく →</span></a><a href="${url("omochi/")}" class="portal"><span class="portal-number">02</span><span class="portal-illustration">${birdSvg()}</span><h3>おもちを観察する</h3><p>白文鳥おもちの、ほんとうの記録。</p><span aria-hidden="true">観察室へ →</span></a><a href="${url("studio/")}" class="portal"><span class="portal-number">03</span><span class="portal-art" aria-hidden="true">❧</span><h3>アートをつくる</h3><p>鳥と花で、わたしだけの一枚。</p><span aria-hidden="true">アート工房へ →</span></a><a href="${url("game/")}" class="portal"><span class="portal-number">04</span><span class="portal-illustration pair">${birdSvg()}${birdSvg("gray")}</span><h3>文鳥と暮らすゲーム</h3><p>おしゃべりから育つ、家族の物語。</p><span aria-hidden="true">暮らしの続きへ →</span></a></div></section><section class="discovery section"><div><p class="eyebrow">今日の発見</p><h2>${esc(d?.title || "文鳥に会いに行こう")}</h2><p>${d?.summary || ""}</p><a class="text-link" href="${url(`encyclopedia/${d?.id || ""}/`)}">もう少し、知ってみる <span aria-hidden="true">→</span></a><div class="mission"><span class="eyebrow">観察ミッション</span><p>${d?.mission || "写真の文鳥のくちばしと足を、よく見比べてみよう。"}</p><small>無理にさわらず、静かに見守ろう。</small></div></div><figure>${image(d?.photos?.[0])}<figcaption>写真から見つけたことを、言葉にしてみよう。</figcaption></figure></section><section class="section"><div class="section-intro"><p class="eyebrow">小さな研究のはじまり</p><h2>見る深さは、自分で選べる。</h2></div><ol class="learning-steps"><li><b>01　まず見る</b><p>大きな写真と、短いひとこと。</p></li><li><b>02　基本を知る</b><p>ふりがなと読み上げで、しくみを知る。</p></li><li><b>03　もっと調べる</b><p>専門用語や出典まで、じっくり。</p></li></ol><a class="challenge-banner" href="${url("challenge/")}"><span><span class="eyebrow">文鳥チャレンジ</span><h3>きみは、文鳥はかせ？</h3><p>${quizzes.length}問のクイズ。まちがいも、発見のたね。</p></span><span class="big-arrow" aria-hidden="true">↗</span></a></section>`;
}
function encyclopedia() {
  return `${heading("文鳥を知る", "写真から、ふしぎをひらこう。", "同じ文鳥でも、色や姿、しぐさはいろいろ。気になる扉からどうぞ。")}<div class="encyclopedia-tools"><label class="search-field"><span>図鑑をさがす</span><input id="article-search" type="search" placeholder="くちばし、水浴び、食べ物…"></label><div class="filter-chips" role="group" aria-label="図鑑の分類"><button class="chip active" data-category="all">すべて</button>${[...new Set(articles.map((a) => a.category))].map((c) => `<button class="chip" data-category="${esc(c)}">${esc(c)}</button>`).join("")}<button class="chip" data-category="favorites">♡ お気に入り</button></div></div><p id="result-count" role="status"></p><div id="article-grid" class="article-grid"></div><a class="text-link" href="${url("body/")}">図から見つける「からだ探検」 →</a>`;
}
function bindEncyclopedia(initial = "") {
  let category = "all";
  const input = document.querySelector("#article-search");
  input.value = initial;
  function filter() {
    const q = input.value.toLowerCase();
    const filtered = articles.filter(
      (a) =>
        (category === "all" ||
          (category === "favorites" && favorites.includes(a.id)) ||
          a.category === category) &&
        plain([a.title, a.summary, a.body, a.deep].join(" "))
          .toLowerCase()
          .includes(q),
    );
    document.querySelector("#article-grid").innerHTML =
      filtered.map(articleCard).join("") ||
      "<p>見つからなかったよ。別のことばでさがしてみよう。</p>";
    document.querySelector("#result-count").textContent =
      `${filtered.length}件の発見`;
  }
  input.addEventListener("input", filter);
  document.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.category;
        document
          .querySelectorAll("[data-category]")
          .forEach((x) => x.classList.toggle("active", x === b));
        filter();
      }),
  );
  filter();
}
function photoCredits(ids) {
  return (ids || [])
    .map((id) => photos.find((p) => p.id === id))
    .filter(Boolean)
    .map(
      (p) =>
        `<li><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.alt)}</a> — ${esc(p.author)} / <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a></li>`,
    )
    .join("");
}
function article(a) {
  return `<nav class="breadcrumb" aria-label="現在の場所"><a href="${url("encyclopedia/")}">図鑑</a><span aria-hidden="true">/</span>${esc(a.category)}</nav>${heading(esc(a.category), esc(a.title))}<div class="article-actions"><button id="favorite" aria-pressed="${favorites.includes(a.id)}">${favorites.includes(a.id) ? "♥ お気に入り" : "♡ お気に入りにする"}</button><button id="speak">解説をきく</button><button id="stop-speak">読み上げをとめる</button></div><nav class="article-toc" aria-label="この記事の目次"><a href="#first">まず見る</a><a href="#basic">基本を知る</a><a href="#deep">もっと調べる</a><a href="#sources">出典</a></nav><article class="article-body"><section id="first"><p class="eyebrow">01　まず見る</p><p class="article-summary">${a.summary}</p>${a.photos?.length ? `<figure class="article-hero">${image(a.photos[0], "", true)}<figcaption>${esc(photos.find((p) => p.id === a.photos[0])?.alt || "")}</figcaption></figure>` : birdSvg()}</section>${["voice", "courtship"].includes(a.id) ? videoBlock() : ""}<section id="basic"><p class="eyebrow">02　基本を知る</p><h2>しくみを見てみよう</h2><div class="prose">${paragraphs(a.body)}</div></section><section id="deep"><p class="eyebrow">03　もっと調べる</p><h2>もう一歩、その先へ。</h2><div class="prose">${paragraphs(a.deep)}</div>${a.terms?.length ? `<dl class="glossary">${a.terms.map((t) => `<div><dt><ruby>${esc(t.term)}<rt>${esc(t.reading)}</rt></ruby></dt><dd>${esc(t.meaning)}</dd></div>`).join("")}</dl>` : ""}</section>${
    a.photos?.length > 1
      ? `<div class="photo-row">${a.photos
          .slice(1)
          .map(
            (id) =>
              `<figure>${image(id)}<figcaption>${esc(photos.find((p) => p.id === id)?.alt || "")}</figcaption></figure>`,
          )
          .join("")}</div>`
      : ""
  }<aside class="mission"><span class="eyebrow">観察ミッション</span><p>${a.mission || "写真と説明を見比べて、気づいたことを一つ見つけよう。"}</p><small>鳥を追いかけたり、嫌がることをしたりせずに観察しよう。</small></aside><section id="sources" class="source-box"><h2>確かめた資料と写真</h2><p>情報確認日：${esc(a.checkedAt || "2026-11-02")}。一般の文鳥についての解説です。写真はおもち本人ではありません。</p><ul>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul><ul>${photoCredits(a.photos)}</ul></section><h2>つながる発見</h2><div class="related-links">${(
    a.related || []
  )
    .map((id) => articles.find((x) => x.id === id))
    .filter(Boolean)
    .map(
      (x) => `<a href="${url(`encyclopedia/${x.id}/`)}">${esc(x.title)} →</a>`,
    )
    .join("")}</div></article>`;
}
function videoBlock() {
  return `<figure class="bird-video"><video controls playsinline preload="none" aria-label="${esc(birdVideo.alt)}" ><source src="${url("photos/cinnamon-song.mp4")}" type="video/mp4"><source src="${url(birdVideo.src.replace(/^\//, ""))}" type="video/webm">この端末で映像を再生できない場合も、下の説明と図鑑を読めます。</video><figcaption>${esc(birdVideo.alt)}<br>実際の文鳥の録音を含む12秒の映像。再生すると音が出ます。MP4版は形式変換のみ（CC BY-SA 3.0）。<br>${esc(birdVideo.credit)} · <a href="${esc(birdVideo.source)}" target="_blank" rel="noopener noreferrer">元の映像</a> · <a href="${esc(birdVideo.licenseUrl)}" target="_blank" rel="noopener noreferrer">利用条件</a></figcaption><div class="video-buttons"><button data-video-play>声をきく</button><button data-video-stop>再生を止める</button><button data-video-mute aria-pressed="false">音を消す</button></div></figure>`;
}
function paragraphs(s) {
  return s?.includes("<p>")
    ? s
    : (s || "")
        .split("\n")
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join("");
}
// Crop coordinates are in the dimensions of the locally served photographs.
// Each region was checked against the actual pixels; no anatomy is painted in.
const bodyParts = {
  beak: { label: "くちばし", articleId: "beak", photoId: "photo-43", crop: [275, 175, 320, 250], note: "上下のくちばしを拡大。食べ物をつまむ形を見てみよう。" },
  eye: { label: "目", articleId: "eyes", photoId: "photo-43", crop: [505, 145, 195, 165], note: "黒い目と、そのまわりの赤い部分を拡大。写真から光の反射も見つかるね。" },
  ear: { label: "耳のまわりの羽毛", articleId: "ears", photoId: "photo-43", crop: [580, 235, 240, 210], note: "目の後ろから下の羽毛を拡大しています。耳の穴は羽毛の下にかくれ、この写真には見えていません。穴の位置を写真で断定したり、鳥の羽をめくって確かめたりしないでね。" },
  wing: { label: "翼", articleId: "wings", photoId: "photo-26", crop: [390, 300, 480, 225], note: "たたんだ翼を横から拡大。長い羽が重なっているところを見てみよう。" },
  feathers: { label: "羽毛", articleId: "feathers", photoId: "photo-31", crop: [670, 420, 225, 270], note: "背中と、たたんだ翼をおおう羽毛を拡大。羽が重なって体を包んでいるね。" },
  tail: { label: "尾", articleId: "tail", photoId: "photo-26", crop: [665, 485, 375, 175], note: "黒い尾羽を拡大。体の後ろへ伸びる羽を、翼の先と見比べよう。" },
  feet: { label: "足", articleId: "feet", photoId: "photo-23", crop: [420, 430, 290, 245], note: "枝をつかむ足と指を拡大。指の向きと、先のつめを観察しよう。" },
};
function bodyPartDetail(id) {
  const part = bodyParts[id];
  const a = articles.find((a) => a.id === part.articleId);
  const p = photos.find((p) => p.id === part.photoId);
  const [x, y, width, height] = part.crop;
  const photoImage = `<image href="${photoUrl(p)}" x="0" y="0" width="${p.width}" height="${p.height}"/>`;
  return `<p class="eyebrow">写真で拡大 · ${esc(part.label)}</p><h2>${esc(a.title)}</h2><figure class="part-photo"><svg class="part-zoom" role="img" aria-label="${esc(part.label)}を拡大した実写写真${id === "ear" ? "。耳の穴は羽毛にかくれて見えません" : ""}" viewBox="${part.crop.join(" ")}" width="${width}" height="${height}">${photoImage}</svg><figcaption>${esc(part.note)}<br>一般の文鳥の写真です。おもち本人ではありません。</figcaption></figure><details class="part-context"><summary>写真全体と、拡大した範囲を見る</summary><svg class="part-context-image" role="img" aria-label="${esc(p.alt)} 赤い枠は拡大した範囲です。" viewBox="0 0 ${p.width} ${p.height}" width="${p.width}" height="${p.height}">${photoImage}<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="white" stroke-width="10"/><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#963f42" stroke-width="5"/></svg><p>赤い枠の部分を大きく表示しています。</p></details><p class="part-credit">写真：${esc(p.author)} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">元の写真</a> · <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a><br>表示上の加工：切り抜き拡大・全体図への枠の追加。写真部分の利用条件は元のライセンスに従います。</p><p>${a.summary}</p><a class="button" href="${url(`encyclopedia/${a.id}/`)}">くわしく調べる →</a>`;
}
function bodyPage() {
  const parts = [
    ["くちばし", "beak", 21, 43],
    ["目", "eye", 32, 30],
    ["耳", "ear", 39, 38],
    ["翼", "wing", 56, 57],
    ["羽毛", "feathers", 51, 39],
    ["尾", "tail", 77, 69],
    ["足", "feet", 50, 86],
  ];
  return `${heading("文鳥のからだ探検", "どこを、よく見てみよう？", "丸い体に、暮らしのくふうがつまっている。名前を押して、写真を拡大しよう。")}<div class="body-explorer"><div class="body-diagram">${birdSvg("gray")}${parts.map(([label, id, x, y]) => `<button style="left:${x}%;top:${y}%" data-part="${id}" aria-label="${label}を拡大して調べる" aria-pressed="false" aria-controls="part-detail">${label}</button>`).join("")}</div><div id="part-detail" aria-live="polite"><p class="eyebrow">体の地図</p><h2>気になる場所をえらぼう</h2><p>耳の穴は羽毛にかくれていて、外から見える耳たぶはありません。図は位置を伝えるための模式図です。</p></div></div><p class="quiet">独自制作の模式図。色・大きさ・位置は説明のための表現を含みます。</p><div class="article-grid">${articles
    .filter((a) => a.category === "からだ探検")
    .map(articleCard)
    .join("")}</div>`;
}
function omochi() {
  return `${heading("おもち観察室", "おもちの「ほんとう」を、少しずつ。", "ここは、実際のおもちを観察する場所。ゲームの出来事とは別の記録です。")}<div class="omochi-profile"><div class="omochi-portrait">${birdSvg()}<span>案内イラスト</span></div><div><p class="eyebrow">わかっていること</p><h2>おもち</h2><dl class="profile-list"><div><dt>種類・羽色</dt><dd>文鳥・白文鳥</dd></div><div><dt>性別</dt><dd>メス</dd></div><div><dt>家族</dt><dd>依頼者のお嬢さんのペット</dd></div><div><dt>年齢・誕生日・性格・好物</dt><dd>まだ教えてもらっていません。</dd></div></dl><p>本人の写真と観察エピソードは未提供です。別の白文鳥の写真を、おもちとして紹介することはありません。</p></div></div><section class="section"><p class="eyebrow">静かに見てみよう</p><h2>観察のたね</h2><div class="learning-steps"><div><b>からだ</b><p>休んでいるとき、足はどうなっている？</p></div><div><b>くらし</b><p>水浴びの前と後で、羽はどう変わった？</p></div><div><b>ことば</b><p>「うれしそう」だけでなく、見えた動きを書いてみよう。</p></div></div><p class="quiet">しぐさだけで気持ちを決めつけないことも、研究の第一歩。</p></section><section class="observation-notebook"><h2>わたしの観察ノート</h2><p>あなたが実際に見たことを書けます。この端末だけに保存され、サイトには投稿されません。</p><form id="observation-form"><label>観察した日<input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label>見たこと・気になったこと<textarea name="note" maxlength="600" rows="3" placeholder="だれが、いつ、どこで、どんな動きをした？" required></textarea></label><button class="button">ノートに記録する</button></form><div id="observations"></div></section>`;
}
function challenge() {
  return `${heading("文鳥チャレンジ", "「わかった！」を、ひとつずつ。", `${quizzes.length}問。点数よりも、どうして？を楽しもう。`)}<div id="quiz-root" class="quiz-root"></div>`;
}
function bindQuiz() {
  let index = 0,
    correct = 0,
    answered = false;
  function draw() {
    const q = quizzes[index];
    answered = false;
    document.querySelector("#quiz-root").innerHTML =
      `<div class="quiz-progress"><span>${index + 1} / ${quizzes.length}</span><progress value="${index}" max="${quizzes.length}" aria-label="クイズの進み具合"></progress></div><h2>${q.question}</h2>${q.photoId ? `<figure>${image(q.photoId)}</figure>` : q.diagram ? `<figure class="quiz-diagram">${birdSvg("gray")}<figcaption>文鳥の体の模式図</figcaption></figure>` : ""}<div class="quiz-choices">${q.choices.map((c, i) => `<button data-answer="${i}">${esc(c)}</button>`).join("")}</div><div id="quiz-feedback" aria-live="polite"></div>`;
    document.querySelectorAll("[data-answer]").forEach(
      (b) =>
        (b.onclick = () => {
          if (answered) return;
          answered = true;
          const ok = Number(b.dataset.answer) === q.answer;
          if (ok) correct++;
          document.querySelectorAll("[data-answer]").forEach((x) => {
            x.disabled = true;
            if (Number(x.dataset.answer) === q.answer)
              x.classList.add("correct");
          });
          document.querySelector("#quiz-feedback").innerHTML =
            `<h3>${ok ? "そのとおり！" : "新しい発見だね！"}</h3><p>${q.explanation}</p><a class="text-link" href="${url(`encyclopedia/${q.articleId}/`)}">図鑑でたしかめる →</a>${q.mission ? `<p class="mission">${esc(q.mission)}</p>` : ""}<button id="quiz-next" class="button">${index === quizzes.length - 1 ? "結果を見る" : "つぎの問題へ"}</button>`;
          document.querySelector("#quiz-next").onclick = () => {
            index++;
            if (index < quizzes.length) draw();
            else {
              document.querySelector("#quiz-root").innerHTML =
                `${birdSvg()}<h2>${quizzes.length}の発見、おつかれさま！</h2><p>正解は ${correct} / ${quizzes.length} 問。まちがえた問題も、知識のたねになったね。</p><button id="quiz-restart" class="button">もう一度、チャレンジ</button><a class="text-link" href="${url("encyclopedia/")}">図鑑をひらく →</a>`;
              document.querySelector("#quiz-restart").onclick = () => {
                index = 0;
                correct = 0;
                draw();
              };
            }
          };
        }),
    );
  }
  draw();
}
function credits() {
  return `${heading("出典と素材", "小さな発見を支える、たくさんの仕事。", "学びの根拠と、写真を届けてくれた作者へ。")}<div class="prose"><p>このサイトの実写写真は、各作者が示したライセンスに従って使用しています。一般の文鳥を撮ったもので、おもち本人の写真ではありません。アート作品では必要な帰属表示を画像の下部に含めます。</p><p>原著作物の権利は各作者に帰属します。写真の利用・加工・共有は、それぞれのライセンスをご確認ください。図鑑写真は画質調整・縮小のみ。工房での色の変更はアート表現です。</p><p>オリジナルの鳥・植物・ロゴの図形と合成BGM・操作音は、このサイト用の制作物です。合成音を本物の文鳥の鳴き声として使用していません。</p></div><h2>写真 ${photos.length}点</h2><div class="credits-grid">${photos.map((p) => `<figure data-photo-credit="${esc(p.id)}">${image(p.id)}<figcaption><b>${esc(p.alt)}</b><dl class="credit-metadata"><div><dt>作品名</dt><dd>${esc(p.title)}</dd></div><div><dt>作者</dt><dd>${esc(p.author)}</dd></div><div><dt>クレジット</dt><dd>${esc(p.credit)}</dd></div><div><dt>取得・確認日</dt><dd>${esc(p.acquiredAt)}</dd></div><div><dt>サイト用の準備・加工</dt><dd>${esc(p.modifications)}</dd></div></dl><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">元の写真と利用条件</a> · <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a></figcaption></figure>`).join("")}</div><h2>本物の声の映像</h2>${videoBlock()}<h2>記事の情報源</h2><ul class="source-list">${[...new Map(articles.flatMap((a) => a.sources).map((s) => [s.url || s.title, s])).values()].map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul>`;
}
function help() {
  return `${heading("遊び方と設定", "いつでも、戻ってこられる場所。")}<div class="help-layout"><nav class="article-toc"><a href="#help-reading">読む</a><a href="#help-studio">つくる</a><a href="#help-game">暮らす</a><a href="#help-storage">保存</a></nav><div class="prose"><section id="help-reading"><h2>写真から、じっくり読むまで</h2><p>図鑑は「まず見る」「基本を知る」「もっと調べる」の三段階。ふりがなは上のボタンで切り替えられます。「解説をきく」は端末の読み上げ機能を使います。声が入っていない端末でも本文はそのまま読めます。</p><p>♡でつけたお気に入りは図鑑の絞り込みから見つけられます。メニューのサイト内検索は、図鑑の本文だけでなくアート工房・ゲーム・保存の手引きなども調べます。図鑑内の検索では記事を絞り込めます。</p></section><section id="help-studio"><h2>文鳥アート工房</h2><p>まずは見本を選びましょう。写真や鳥、花を加えて、指やマウスで動かせます。動かすボタン・大きさ・回転でも調整できます。重なり順を変え、タイトルを入れたら、正方形か縦長で保存。写真のクレジットも一緒に入ります。</p><p>音は再生ボタンを押したときだけ始まります。BGMも操作音も、サイト用に作った合成音です。本物の文鳥の鳴き声や既存の曲ではありません。共有非対応の端末では画像を保存して共有できます。</p></section><section id="help-game"><h2>おもちの文鳥ぐらし</h2><p>文鳥たちは性格、気分、欲求、相手との関係と記憶から行動を選びます。名前を呼んだり、水浴びに誘ったりして、暮らしを見守ってください。会話は話題と状態に応じたルールで作るもので、何でも理解できるAIではありません。</p><p>おもちの性格・会話・家族・日記はゲームだけの創作です。現実のおもちの観察記録ではありません。成長・つがい・繁殖は簡略化した表現で、現実の飼育手順ではありません。</p><p>閉じている間は動作せず、次に開いたときに経過時間をまとめて計算します。長期間の不在でも鳥は自分で食事や休息をとり、不在への罰・死亡・強い苦痛はありません。詳しい時間と上限はゲームの「設定・遊び方」に表示します。</p></section><section id="help-storage"><h2>端末内の保存について</h2><p>会員登録やログインは不要。ゲーム、ふりがな、お気に入り、観察ノートはこのブラウザの端末内保存です。端末間の自動同期はなく、閲覧データの消去やプライベートブラウズ終了で失われる場合があります。大切なゲームは設定から定期的に書き出してください。</p><p>読み込むのは、自分が保存したゲーム用JSONファイルだけにしましょう。形式を確認し、不正なデータは現在の世界を置き換えません。複数タブでは一度に一つの更新だけを受け付けます。</p></section><section><h2>読みやすさ</h2><label class="setting-line"><input id="motion-toggle" type="checkbox" ${settings.motion ? "checked" : ""}> 小さな動きを表示する</label><p>動きを減らす端末設定にも対応。どのボタンもキーボードのTabとEnterで操作できます。</p></section><section><h2>鳥との暮らしで困ったら</h2><p>体調や飼育の判断は鳥を診療する獣医師へ。サイトやゲームは診断・治療の代わりにはなりません。いつもとの違いが気になるときは、大人と一緒に相談してください。</p></section></div></div>`;
}
function render(route) {
  document
    .querySelectorAll("[data-nav]")
    .forEach((a) =>
      a.setAttribute(
        "aria-current",
        route.startsWith(a.dataset.nav) ? "page" : "false",
      ),
    );
  let title = "",
    view = "",
    notFound = false;
  const slug = route.split("/")[1];
  const query = new URLSearchParams(location.search).get("q");
  if (query !== null) {
    title = "サイト内検索";
    view = siteSearch(query.slice(0, 80));
  } else if (!route) {
    view = home();
  } else if (route === "encyclopedia/") {
    title = "文鳥図鑑";
    view = encyclopedia();
  } else if (
    route.startsWith("encyclopedia/") &&
    articles.some((a) => a.id === slug)
  ) {
    const a = articles.find((a) => a.id === slug);
    title = a.title;
    view = article(a);
  } else if (route === "body/") {
    title = "からだ探検";
    view = bodyPage();
  } else if (route === "omochi/") {
    title = "おもち観察室";
    view = omochi();
  } else if (route === "challenge/") {
    title = "文鳥チャレンジ";
    view = challenge();
  } else if (route === "studio/") {
    title = "文鳥アート工房";
    view =
      heading(
        "文鳥アート工房",
        "鳥と花で、わたしだけの一枚。",
        "見本をえらんで、うごかして。写真の色あそびはアートの表現です。",
      ) + '<div id="studio-root"></div>';
  } else if (route === "game/") {
    title = "おもちの文鳥ぐらし";
    view =
      heading(
        "おもちの文鳥ぐらし",
        "小さな出会いから、家族の物語。",
        "見守ったり、話しかけたり。文鳥たちは、自分で暮らしを見つけます。",
      ) + '<div id="game-root"></div>';
  } else if (route === "credits/") {
    title = "出典と素材";
    view = credits();
  } else if (route === "help/") {
    title = "遊び方と設定";
    view = help();
  } else {
    notFound = true;
    title = "ページが見つかりません";
    view =
      heading("道に迷ったら", "文鳥たちの庭へ戻ろう。") +
      `<p>この場所にはページがありません。</p><a class="button" href="${url()}">トップへ戻る</a>`;
  }
  document.title = (title ? title + " | " : "") + SITE_NAME;
  main.innerHTML = view;
  const description = plain(
    main.querySelector(".lede,.article-summary")?.innerHTML ||
      title ||
      "おもちと学ぶ文鳥図鑑。写真で知る、アートをつくる、文鳥たちの暮らしを見守る。",
  );
  const canonical = location.origin + location.pathname;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content =
    description;
  document.querySelector('meta[property="og:url"]').content = canonical;
  document.querySelector('meta[property="og:type"]').content =
    route.startsWith("encyclopedia/") && slug ? "article" : "website";
  document.querySelector('link[rel="canonical"]').href = canonical;
  let robots = document.querySelector('meta[name="robots"]');
  if (notFound) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex, follow";
  } else robots?.remove();
  main
    .querySelectorAll('a[href^="#"]')
    .forEach((a) =>
      a.setAttribute("href", location.pathname + a.getAttribute("href")),
    );
  document.querySelector(".skip-link").href = location.pathname + "#main";
  main.querySelectorAll("[data-video-play]").forEach(
    (b) =>
      (b.onclick = () => {
        const v = b.closest("figure").querySelector("video");
        v.play().catch(() =>
          announce(
            "映像を再生できませんでした。この端末の対応形式をご確認ください。",
          ),
        );
      }),
  );
  main.querySelectorAll("[data-video-mute]").forEach(
    (b) =>
      (b.onclick = () => {
        const v = b.closest("figure").querySelector("video");
        v.muted = !v.muted;
        b.setAttribute("aria-pressed", String(v.muted));
        b.textContent = v.muted ? "音を出す" : "音を消す";
      }),
  );
  main.querySelectorAll("[data-video-stop]").forEach(
    (b) =>
      (b.onclick = () => {
        const v = b.closest("figure").querySelector("video");
        v.pause();
        v.currentTime = 0;
      }),
  );
  main.className = route || query !== null ? "page-content" : "home-content";
  if (query !== null) {
    document.querySelector("#search-results-form").onsubmit = submitSiteSearch;
    document.querySelector("#global-query").value = query.slice(0, 80);
  } else if (route === "encyclopedia/") bindEncyclopedia();
  else if (route.startsWith("encyclopedia/") && slug) {
    const a = articles.find((a) => a.id === slug);
    if (a) {
      document.querySelector("#favorite").onclick = (e) => {
        favorites = favorites.includes(a.id)
          ? favorites.filter((x) => x !== a.id)
          : [...favorites, a.id];
        writeLocal("buncho-favorites", favorites);
        e.target.textContent = favorites.includes(a.id)
          ? "♥ お気に入り"
          : "♡ お気に入りにする";
        e.target.setAttribute("aria-pressed", String(favorites.includes(a.id)));
      };
      document.querySelector("#speak").onclick = () =>
        speak(a.title + "。" + a.summary + "。" + a.body);
      document.querySelector("#stop-speak").onclick = () =>
        window.speechSynthesis?.cancel();
    }
  } else if (route === "challenge/") bindQuiz();
  else if (route === "studio/") {
    teardown =
      mountStudio(document.querySelector("#studio-root"), {
        photos: photos.map((p) => ({ ...p, src: photoUrl(p) })),
        birdSvg,
        seed: studioSeed,
      }) || (() => {});
    studioSeed = null;
  } else if (route === "game/") {
    const gameRoot = document.querySelector("#game-root");
    Promise.resolve(
      mountGame(gameRoot, {
        birdSvg: gameBirdSvg,
        goArticle: (id) => {
          const patterns = {
            bathing: /水浴/,
            food: /食べ|食事/,
            behavior: /しぐさ|行動/,
          };
          const a =
            articles.find((a) => a.id === id) ||
            articles.find((a) => (patterns[id] || /水浴/).test(a.title)) ||
            articles[0];
          navigate(`encyclopedia/${a.id}/`);
        },
        goArt: (seed) => {
          studioSeed = seed;
          navigate("studio/");
        },
      }),
    )
      .then((cleanup) => {
        if (gameRoot.isConnected)
          teardown = typeof cleanup === "function" ? cleanup : () => {};
        else if (typeof cleanup === "function") cleanup();
      })
      .catch((error) => {
        if (gameRoot.isConnected)
          gameRoot.innerHTML = `<p>ゲームをひらけませんでした。読み直してみてください。</p><p>${esc(error.message)}</p>`;
      });
  } else if (route === "help/")
    document.querySelector("#motion-toggle").onchange = (e) => {
      settings.motion = e.target.checked;
      applySettings();
    };
  else if (route === "body/")
    document.querySelectorAll("[data-part]").forEach(
      (b) =>
        (b.onclick = () => {
          document.querySelectorAll("[data-part]").forEach((button) => button.setAttribute("aria-pressed", String(button === b)));
          document.querySelector("#part-detail").innerHTML = bodyPartDetail(b.dataset.part);
        }),
    );
  else if (route === "omochi/") {
    const draw = () => {
      const notes = readObservations();
      document.querySelector("#observations").innerHTML = notes.length
        ? notes
            .map(
              (n, i) =>
                `<article class="observation"><p class="eyebrow">${esc(n.date)} · あなたが入力した観察</p><p>${esc(n.note)}</p><button data-delete-note="${i}">この記録を削除</button></article>`,
            )
            .join("")
        : '<p class="empty-note">まだ記録はありません。見えたことを、一つずつ。</p>';
      document.querySelectorAll("[data-delete-note]").forEach(
        (b) =>
          (b.onclick = () => {
            const n = readObservations();
            n.splice(Number(b.dataset.deleteNote), 1);
            writeLocal("buncho-observations", n);
            draw();
          }),
      );
    };
    draw();
    document.querySelector("#observation-form").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target),
        note = String(f.get("note")).trim();
      if (!note) return;
      const n = readObservations();
      n.unshift({ date: String(f.get("date")), note: note.slice(0, 600) });
      if (writeLocal("buncho-observations", n.slice(0, 100))) {
        e.target.note.value = "";
        draw();
        announce("観察をこの端末に保存しました。");
      } else announce("保存できませんでした。端末の空き容量をご確認ください。");
    };
  }
}
document.querySelector("#brand").innerHTML = logoSvg("header-logo");
document.querySelector("#ruby-toggle").onclick = () => {
  settings.ruby = !settings.ruby;
  applySettings();
};
document.querySelector("#menu-toggle").onclick = (e) => {
  const menu = document.querySelector("#menu");
  menu.hidden = !menu.hidden;
  e.currentTarget.setAttribute("aria-expanded", String(!menu.hidden));
};
document.querySelector("#site-search").onsubmit = submitSiteSearch;
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (
    !a ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    a.target ||
    a.hasAttribute("download")
  )
    return;
  const link = new URL(a.href);
  if (
    link.origin !== location.origin ||
    !link.pathname.startsWith(BASE) ||
    link.hash
  )
    return;
  e.preventDefault();
  navigate(link.pathname.slice(BASE.length) + link.search);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelector("#menu").hidden = true;
    document
      .querySelector("#menu-toggle")
      .setAttribute("aria-expanded", "false");
    window.speechSynthesis?.cancel();
  }
});
window.addEventListener("popstate", () => {
  teardown();
  teardown = () => {};
  render(location.pathname.slice(BASE.length));
});
applySettings();
render(
  location.pathname.startsWith(BASE)
    ? location.pathname.slice(BASE.length)
    : "",
);

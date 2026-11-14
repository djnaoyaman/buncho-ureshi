import { buildGameInstallIcons } from './game-install-icons.mjs';
import { optimizeEncounterImages } from './optimize-encounter-images.mjs';
import { renderHome } from "../src/home.js";
import { quizzes } from "../src/data/quizzes.js";
import { createHash } from "node:crypto";
import { cp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { articles } from "../src/data/articles.js";
import { photos } from "../src/data/photos.js";
import { morphAtlas } from "../src/data/morphs.js";
import { morphPhotos, newMorphPhotos } from "../src/data/morph-photos.js";
import { prepareMorphAtlas, renderMorphOverview, renderMorphProfile, renderMorphPhoto } from "../src/morph-ui.js";
import { SITE_NAME, esc, logoSvg } from "../src/visuals.js";
import { PAGE_CATALOG, routeMetadata, PRODUCTION_ORIGIN, BASE_PATH, stripText } from "../src/metadata.js";
const base = BASE_PATH, origin = PRODUCTION_ORIGIN, pages = PAGE_CATALOG;
const atlasData = prepareMorphAtlas(morphAtlas, morphPhotos);
const reviewDate = "2026-11-02";
// Reload the corrected presentation even when an earlier stylesheet is cached.
const styleVersion = createHash("sha256").update(await readFile(new URL("../src/style.css", import.meta.url))).digest("hex").slice(0, 12);
const presentationVersion = createHash("sha256").update((await Promise.all(["analytics.js", "analytics-loader.js", "home.js", "app.js", "metadata.js", "studio.js", "studio.css", "editorial-parallax.js", "editorial-photo-focus.js", "storage.js", "data/articles.js", "data/photos.js", "data/quizzes.js", "data/morphs.js", "data/morph-photos.js", "morph-ui.js", "morph-ui.css"].map(name => readFile(new URL("../src/" + name, import.meta.url))))).map(bytes => bytes.toString()).join("\n")).update(await readFile(new URL(import.meta.url))).digest("hex").slice(0, 12);
const metadataVersion = createHash("sha256").update(await readFile(new URL("../src/metadata.js", import.meta.url))).digest("hex").slice(0, 12);
const brandVersion = createHash("sha256").update(await readFile(new URL("../src/visuals.js", import.meta.url))).digest("hex").slice(0, 12);
const gameVersion = createHash("sha256").update((await Promise.all(["game-keepsake-card.css", "game-keepsake-bookmark.css", "garden-keepsake-layout.js", "garden-expedition.js", "garden-expedition-ui.js", "garden-leaf-event.js", "garden-leaf-event-ui.js", "collection-endings.js", "collection-ending-player.js", "game-next-goals.js", "care-rules.js", "home-scene.js", "away-reports.js", "away-session.js", "family-care.js", "care-guidance.js", "friend-cages.js", "gacha-machines.js", "gacha-motion.js", "world-birds.js", "game-environment.js", "game-feedback.js", "habitat-layout.js", "bird-poses.js", "data/pose-atlases.js", "garden-predator-clock.js", "garden-raptors.js", "garden-raptor-controller.js", "garden-raptor-ui.js", "garden-raptor-return-prompt.js", "data/raptor-species.js", "data/raptor-art.js", "garden-crows.js", "garden-crow-ui.js", "protagonist.js", "life-care.js", "life-care-ui.js", "caretaker-recruitment-ui.js", "memorial-designs.js", "memorial.css", "life-care.css", "caretaker-recruitment.css", "preservation-box.js", "preservation-box.css", "game.js", "life-menu-icons.js", "game-help.js", "game-help-guide.css", "encounters.js", "garden-visit-sessions.js", "garden-jog.js", "garden-jog-feedback.js", "garden35-migration.js", "data/garden35-music.js", "data/garden35-plan.js", "data/garden35-assets.js", "encounter-body-art.js", "encounter-controller.js", "petting-clock.js", "encounter-media.js", "garden-bird-motion.js", "garden-social-plan.js", "encounter-ui.js", "encounter-ui.css", "garden-about-booklet.js", "garden-about-booklet.css", "garden-friend-cards.js", "garden-friend-card-art.js", "garden-friend-action-art.js", "garden-friend-cards.css", "garden-friends.js", "garden-companion-ui.js", "data/encounter-catalog.js", "data/gardens.js", "data/garden-assets.js", "economy.js", "game-chrome.js", "family-layout.js", "relationship-map.js", "relationship-map.css", "diary-paper.js", "diary-paper.css", "consultation-letter.js", "consultation-letter.css", "engine.js", "care-schedule.js", "bird-names.js", "game-store.js", "field-visuals.js", "furniture-forms.js", "furniture-styles.js", "game.css", "care-audio.js", "game-music.js", "game-music-ui.js", "game-music.css", "owner-profile.js", "owner-profile-data.js", "owner-peek.js", "owner-profile.css"].map(name => readFile(new URL("../src/" + name, import.meta.url))))).map(bytes=>bytes.toString()).join("\n")).update(await readFile(new URL(import.meta.url))).digest("hex").slice(0,12);
const securityPolicy = "default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.google-analytics.com https://www.googletagmanager.com; media-src 'self' blob:; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const secureLink = (href) => href?.replace(/^http:\/\/creativecommons\.org\//, "https://creativecommons.org/");
const dest = new URL("../dist/", import.meta.url);
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(new URL("../src/", import.meta.url), new URL("src/", dest), {
  recursive: true,
  // Retain archived character source/art, but do not ship the withdrawn editor.
  filter: source => !/[/\\]owner-profile\.(?:js|css)$/.test(source),
});
await cp(new URL("../public/", import.meta.url), dest, { recursive: true });
await optimizeEncounterImages(dest);
await buildGameInstallIcons(dest);
// A new app entry URL alone does not invalidate cached module dependencies.
for (const name of ["garden-keepsake-layout.js", "garden-expedition.js", "garden-expedition-ui.js", "garden-leaf-event.js", "garden-leaf-event-ui.js", "collection-endings.js", "collection-ending-player.js", "data/garden35-music.js", "data/encounter-catalog.js", "garden35-migration.js", "data/garden35-plan.js", "data/garden35-assets.js", "game-next-goals.js", "care-schedule.js", "care-rules.js", "home-scene.js", "away-reports.js", "away-session.js", "family-care.js", "friend-cages.js", "care-guidance.js", "gacha-motion.js", "family-layout.js", "relationship-map.js", "bird-names.js", "life-care.js", "world-birds.js", "editorial-parallax.js", "bird-poses.js", "garden-predator-clock.js", "garden-raptors.js", "garden-raptor-controller.js", "garden-raptor-ui.js", "garden-raptor-return-prompt.js", "garden-crows.js", "garden-crow-ui.js", "protagonist.js", "life-care-ui.js", "caretaker-recruitment-ui.js", "memorial-designs.js", "app.js", "studio.js", "metadata.js", "engine.js", "game.js", "diary-paper.js", "game-help.js", "game-store.js", "field-visuals.js", "game-music.js", "game-music-ui.js", "encounters.js", "garden-visit-sessions.js", "encounter-controller.js", "petting-clock.js", "encounter-media.js", "garden-bird-motion.js", "garden-social-plan.js", "encounter-ui.js", "garden-about-booklet.js", "garden-friend-cards.js", "garden-friend-card-art.js", "garden-friend-action-art.js", "garden-friends.js", "garden-companion-ui.js", "economy.js", "data/gardens.js", "owner-peek.js"]) {
  const file = new URL("src/" + name, dest);
  const code = (await readFile(file, "utf8"))
    .replaceAll("../world-birds.js", `../world-birds.js?v=${gameVersion}`)
    .replaceAll("./world-birds.js", `./world-birds.js?v=${gameVersion}`)
    .replaceAll("./gacha-machines.js", `./gacha-machines.js?v=${gameVersion}`)
    .replaceAll("./gacha-motion.js", `./gacha-motion.js?v=${gameVersion}`)
    .replaceAll("./care-guidance.js", `./care-guidance.js?v=${gameVersion}`)
    .replaceAll("./away-reports.js", `./away-reports.js?v=${gameVersion}`)
    .replaceAll("./away-session.js", `./away-session.js?v=${gameVersion}`)
    .replaceAll("./family-care.js", `./family-care.js?v=${gameVersion}`)
    .replaceAll("./friend-cages.js", `./friend-cages.js?v=${gameVersion}`)
    .replaceAll("./game-environment.js", `./game-environment.js?v=${gameVersion}`)
    .replaceAll("./editorial-parallax.js", `./editorial-parallax.js?v=${presentationVersion}`)
    .replaceAll("./editorial-photo-focus.js", `./editorial-photo-focus.js?v=${presentationVersion}`)
    .replaceAll("./analytics.js", `./analytics.js?v=${presentationVersion}`)
    .replaceAll("./storage.js", `./storage.js?v=${presentationVersion}`)
    .replaceAll("./data/articles.js", `./data/articles.js?v=${presentationVersion}`)
    .replaceAll("./data/photos.js", `./data/photos.js?v=${presentationVersion}`)
    .replaceAll("./data/quizzes.js", `./data/quizzes.js?v=${presentationVersion}`)
    .replaceAll("./data/morphs.js", `./data/morphs.js?v=${presentationVersion}`)
    .replaceAll("./data/morph-photos.js", `./data/morph-photos.js?v=${presentationVersion}`)
    .replaceAll("./game-feedback.js", `./game-feedback.js?v=${gameVersion}`)
    .replaceAll("./habitat-layout.js", `./habitat-layout.js?v=${gameVersion}`)
    .replaceAll("./bird-poses.js", `./bird-poses.js?v=${gameVersion}`)
    .replaceAll("./data/pose-atlases.js", `./data/pose-atlases.js?v=${gameVersion}`)
    .replaceAll("./morph-ui.js", `./morph-ui.js?v=${presentationVersion}`)
    .replaceAll("./home.js", `./home.js?v=${presentationVersion}`)
    .replaceAll("./visuals.js", `./visuals.js?v=${brandVersion}`)
    .replaceAll("./studio.js", `./studio.js?v=${brandVersion}-${presentationVersion}`)
    .replaceAll("./metadata.js", `./metadata.js?v=${brandVersion}-${metadataVersion}-${presentationVersion}`)
    .replaceAll("./game-help.js", `./game-help.js?v=${gameVersion}`)
    .replaceAll("./home-scene.js", `./home-scene.js?v=${gameVersion}`)
    .replaceAll("./game-next-goals.js", `./game-next-goals.js?v=${gameVersion}`)
    .replaceAll("./life-menu-icons.js", `./life-menu-icons.js?v=${gameVersion}`)
    .replaceAll("./family-layout.js", `./family-layout.js?v=${gameVersion}`)
    .replaceAll("./game-chrome.js", `./game-chrome.js?v=${gameVersion}`)
    .replaceAll("./game-music-ui.js", `./game-music-ui.js?v=${gameVersion}`)
    .replaceAll("./game-music.js", `./game-music.js?v=${gameVersion}`)
    .replaceAll("./care-audio.js", `./care-audio.js?v=${gameVersion}`)
    .replaceAll("./collection-endings.js", `./collection-endings.js?v=${gameVersion}`)
    .replaceAll("./collection-ending-player.js", `./collection-ending-player.js?v=${gameVersion}`)
    .replaceAll("./game.js", `./game.js?v=${gameVersion}`)
    .replaceAll("../life-care.js", `../life-care.js?v=${gameVersion}`)
    .replaceAll("../protagonist.js", `../protagonist.js?v=${gameVersion}`)
    .replaceAll("./garden-predator-clock.js", `./garden-predator-clock.js?v=${gameVersion}`)
    .replaceAll("./garden-raptors.js", `./garden-raptors.js?v=${gameVersion}`)
    .replaceAll("./garden-raptor-controller.js", `./garden-raptor-controller.js?v=${gameVersion}`)
    .replaceAll("./garden-raptor-return-prompt.js", `./garden-raptor-return-prompt.js?v=${gameVersion}`)
    .replaceAll("./garden-raptor-ui.js", `./garden-raptor-ui.js?v=${gameVersion}`)
    .replaceAll("./garden-crows.js", `./garden-crows.js?v=${gameVersion}`)
    .replaceAll("./garden-crow-ui.js", `./garden-crow-ui.js?v=${gameVersion}`)
    .replaceAll("./data/raptor-species.js", `./data/raptor-species.js?v=${gameVersion}`)
    .replaceAll("./data/raptor-art.js", `./data/raptor-art.js?v=${gameVersion}`)
    .replaceAll("./protagonist.js", `./protagonist.js?v=${gameVersion}`)
    .replaceAll("./life-care.js", `./life-care.js?v=${gameVersion}`)
    .replaceAll("./life-care-ui.js", `./life-care-ui.js?v=${gameVersion}`)
    .replaceAll("./caretaker-recruitment-ui.js", `./caretaker-recruitment-ui.js?v=${gameVersion}`)
    .replaceAll("./memorial-designs.js", `./memorial-designs.js?v=${gameVersion}`)
    .replaceAll("./engine.js", `./engine.js?v=${gameVersion}`)
    .replaceAll("./game-store.js", `./game-store.js?v=${gameVersion}`)
    .replaceAll("./garden-visit-sessions.js", `./garden-visit-sessions.js?v=${gameVersion}`)
    .replaceAll("./encounters.js", `./encounters.js?v=${gameVersion}`)
    .replaceAll("./garden35-migration.js", `./garden35-migration.js?v=${gameVersion}`)
    .replaceAll("./data/garden35-plan.js", `./data/garden35-plan.js?v=${gameVersion}`)
    .replaceAll("./data/garden35-music.js", `./data/garden35-music.js?v=${gameVersion}`)
    .replaceAll("./garden35-music.js", `./garden35-music.js?v=${gameVersion}`)
    .replaceAll("./garden35-plan.js", `./garden35-plan.js?v=${gameVersion}`)
    .replaceAll("./garden35-assets.js", `./garden35-assets.js?v=${gameVersion}`)
    .replaceAll("./garden-jog-feedback.js", `./garden-jog-feedback.js?v=${gameVersion}`)
    .replaceAll("./garden-jog.js", `./garden-jog.js?v=${gameVersion}`)
    .replaceAll("./encounter-body-art.js", `./encounter-body-art.js?v=${gameVersion}`)
    .replaceAll("./petting-clock.js", `./petting-clock.js?v=${gameVersion}`)
    .replaceAll("./encounter-controller.js", `./encounter-controller.js?v=${gameVersion}`)
    .replaceAll("./encounter-media.js", `./encounter-media.js?v=${gameVersion}`)
    .replaceAll("./garden-social-plan.js", `./garden-social-plan.js?v=${gameVersion}`)
    .replaceAll("./garden-bird-motion.js", `./garden-bird-motion.js?v=${gameVersion}`)
    .replaceAll("./garden-about-booklet.js", `./garden-about-booklet.js?v=${gameVersion}`)
    .replaceAll("./garden-friend-cards.js", `./garden-friend-cards.js?v=${gameVersion}`)
    .replaceAll("./garden-friend-card-art.js", `./garden-friend-card-art.js?v=${gameVersion}`)
    .replaceAll("./garden-friend-action-art.js", `./garden-friend-action-art.js?v=${gameVersion}`)
    .replaceAll("./garden-keepsake-layout.js", `./garden-keepsake-layout.js?v=${gameVersion}`)
    .replaceAll("./garden-expedition.js", `./garden-expedition.js?v=${gameVersion}`)
    .replaceAll("./garden-expedition-ui.js", `./garden-expedition-ui.js?v=${gameVersion}`)
    .replaceAll("./garden-leaf-event.js", `./garden-leaf-event.js?v=${gameVersion}`)
    .replaceAll("./garden-leaf-event-ui.js", `./garden-leaf-event-ui.js?v=${gameVersion}`)
    .replaceAll("./encounter-ui.js", `./encounter-ui.js?v=${gameVersion}`)
    .replaceAll("./garden-friends.js", `./garden-friends.js?v=${gameVersion}`)
    .replaceAll("./garden-companion-ui.js", `./garden-companion-ui.js?v=${gameVersion}`)
    .replaceAll("./economy.js", `./economy.js?v=${gameVersion}`)
    .replaceAll("./data/encounter-catalog.js", `./data/encounter-catalog.js?v=${gameVersion}`)
    .replaceAll("./data/gardens.js", `./data/gardens.js?v=${gameVersion}`)
    .replaceAll("./data/garden-assets.js", `./data/garden-assets.js?v=${gameVersion}`)
    .replaceAll("./garden-assets.js", `./garden-assets.js?v=${gameVersion}`)
    .replaceAll("./consultation-letter.js", `./consultation-letter.js?v=${gameVersion}`)
    .replaceAll("./diary-paper.js", `./diary-paper.js?v=${gameVersion}`)
    .replaceAll("./preservation-box.js", `./preservation-box.js?v=${gameVersion}`)
    .replaceAll("./relationship-map.js", `./relationship-map.js?v=${gameVersion}`)
    .replaceAll("./owner-profile.js", `./owner-profile.js?v=${gameVersion}`)
    .replaceAll("./owner-profile-data.js", `./owner-profile-data.js?v=${gameVersion}`)
    .replaceAll("./owner-peek.js", `./owner-peek.js?v=${gameVersion}`)
    .replaceAll("./care-rules.js", `./care-rules.js?v=${gameVersion}`)
    .replaceAll("./care-schedule.js", `./care-schedule.js?v=${gameVersion}`)
    .replaceAll("./bird-names.js", `./bird-names.js?v=${gameVersion}`)
    .replaceAll("./furniture-styles.js", `./furniture-styles.js?v=${gameVersion}`)
    .replaceAll("./furniture-forms.js", `./furniture-forms.js?v=${gameVersion}`)
    .replaceAll("./field-visuals.js", `./field-visuals.js?v=${gameVersion}`);
  await writeFile(file, code);
}

function articleLinks(list) {
  return `<ul>${list.map(a => `<li><a href="${base}encyclopedia/${a.id}/">${esc(a.title)}</a> — ${a.summary}</li>`).join("")}</ul>`;
}
function photoFigure(id, eager = false) {
  const p = photos.find(photo => photo.id === id);
  return p ? `<figure><img src="${base + p.src.replace(/^\//, "")}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ''}><figcaption>${esc(p.alt)} — ${esc(p.author)} / <a href="${esc(p.source)}" rel="noopener noreferrer">元の写真</a> / <a href="${esc(secureLink(p.licenseUrl))}" rel="noopener noreferrer">${esc(p.license)}</a></figcaption></figure>` : "";
}
function staticMain(route, description, title, article) {
  if (route === "") return renderHome({ photos, articles, quizzes, esc, url: route => base + route, image: (id, cls = "", eager = false) => {
    const p = photos.find(photo => photo.id === id) || photos[0];
    return `<img class="${cls}" src="${base + p.src.replace(/^\//, "")}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  }, atlasDoor: () => `<a class="challenge-banner morph-discovery-link" href="${base}colors/"><span><span class="eyebrow">写真で見つける、小さな羽の世界</span><h2>文鳥の羽色ずかん</h2><p>5つの色・模様と、こどもからおとなへのちがい。大きな実写写真と出典から学ぼう。</p></span><span class="big-arrow" aria-hidden="true">↗</span></a>` });

  if (route === "colors/") return renderMorphOverview(atlasData, { base });
  const morph = morphAtlas.profiles.find(profile => route === `colors/${profile.id}/`);
  if (morph) return renderMorphProfile(morph.id, atlasData, { base });
  if (article) return `<article><h1>${esc(article.title)}</h1><p>${article.summary}</p>${photoFigure(article.photos?.[0], true)}<h2>基本を知る</h2><p>${article.body}</p><h2>もっと調べる</h2><p>${article.deep}</p>${article.terms?.length ? `<dl>${article.terms.map(t => `<dt><ruby>${esc(t.term)}<rt>${esc(t.reading)}</rt></ruby></dt><dd>${esc(t.meaning)}</dd>`).join("")}</dl>` : ""}<h2>観察ミッション</h2><p>${esc(article.mission)}</p><h2>出典</h2><p>情報確認日：${esc(article.checkedAt)}</p><ul>${article.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul><h2>つながる発見</h2>${articleLinks(articles.filter(a => article.related?.includes(a.id)))}</article>`;
  const intros = {
    "": "写真でまず見る、ふりがな付きの本文で基本を知る、出典と詳しい説明でもっと調べる。文鳥の体と暮らしを学び、植物と鳥のアートや、創作の家族の物語を楽しめます。",
    "encyclopedia/": "分類やふるさと、体のしくみ、羽色、しぐさ、鳥と暮らすときの安全をまとめました。各記事には観察ミッション、用語の説明、確認日と情報源があります。",
    "body/": "くちばし、目、耳、翼、羽毛、尾、足を選び、形と役割を調べましょう。耳の穴は羽毛に隠れています。模式図は位置やしくみを説明するための表現です。",
    "omochi/": "おもちは娘さんのペットで、メスの白文鳥です。ご家族が提供した、おもち本人の写真を掲載しています。年齢・誕生日・性格・好物・観察エピソードは未提供です。一般の文鳥写真を本人として扱わず、ゲームの出来事は実際の観察記録と区別します。",
    "challenge/": "写真や図を見て選ぶ文鳥クイズです。正解の解説と関連記事で、理由まで確かめられます。観察ミッションは鳥が嫌がることをせず、静かに見守って取り組みましょう。",
    "studio/": "お手本を選び、文鳥写真やオリジナルの鳥・花・葉を配置します。移動、拡大縮小、回転、配色、文字、元に戻す・やり直すに対応。正方形や縦長の画像には写真のクレジットも入り、対応端末では共有できます。音楽と操作音は利用者が有効にしたときだけ鳴ります。",
    "game/": "メスの白文鳥おもちから始まる、創作の生活シミュレーション。文鳥は性格・気分・相手との関係・記憶から交流し、条件がそろうとつがい、卵、ひな、幼鳥、成鳥へと家族の物語が続きます。近い血縁同士は繁殖せず、寿命はゲーム内10年。実時間3日の給餌なし、未治療の病気やけがでは亡くなり、お墓に思い出が残ります。Goldで飼育員を雇えます。現実の飼育手順ではなく、保存はこの端末内です。",
    "help/": "ふりがなはいつも表示します。解説の読み上げは各記事で操作できます。ゲーム、作品、お気に入り、観察ノートはブラウザ内に保存され、端末間では自動同期しません。ゲームは保存ファイルを書き出して保管できます。声や画像共有の対応は端末によって異なります。",
    "credits/": "実写写真の権利は各作者に帰属し、素材ごとの利用条件に従います。一般の文鳥の資料写真で、おもち本人ではありません。アート用に認められた写真だけを工房で使い、保存画像にも作者・原典・利用条件を残します。",
    "404.html": "この場所にはページがありません。下のリンクから文鳥たちの庭や図鑑へ戻れます。"
  };
  let details = "";
  if (route === "encyclopedia/") details = articleLinks(articles);
  else if (route === "body/") details = articleLinks(articles.filter(a => a.category === "からだ探検"));
  else if (route === "omochi/") details = `<figure class="omochi-real-portrait"><img src="${base}omochi/omochi-original.jpeg" width="925" height="1536" alt="指にとまる白文鳥のおもち本人"><figcaption>おもち本人 · ご家族からの提供写真</figcaption></figure>` + articleLinks(articles.filter(a => ["omochi", "questions", "observation"].includes(a.id)));
  else if (route === "challenge/") details = articleLinks(articles.filter(a => ["species", "young", "bathing"].includes(a.id)));
  else if (route === "credits/") details = `<h2>写真の作者と利用条件</h2><ul>${photos.map(p => `<li><a href="${esc(p.source)}">${esc(p.title)}</a> — ${esc(p.author)} / <a href="${esc(secureLink(p.licenseUrl))}">${esc(p.license)}</a></li>`).join("")}</ul>`;
  else if (route === "") details = photoFigure("photo-39", true);
  if (["", "encyclopedia/"].includes(route)) details += `<section><h2><a href="${base}colors/">文鳥の羽色ずかん</a></h2><p>5つの色・模様と、幼鳥から成鳥へのちがいを写真と出典で比べます。14の追加の呼び名は写真未収録のことば帳です。</p></section>`;
  if (route === "credits/") details += `<section class="morph-atlas"><h2>映像から取り出した静止画 ${newMorphPhotos.length}点</h2><p>42点の独立した写真とは別の派生素材です。CC BY-SA 3.0 の利用条件を維持し、工房の素材には含めません。</p>${newMorphPhotos.map(photo => renderMorphPhoto(photo.id, atlasData, { base })).join("")}<a href="${base}colors/">羽色ずかんの情報源へ</a></section>`;
  const links = pages.filter(page => !page[3] && !page[4] && page[0] !== route).map(([target, , label]) => `<li><a href="${base + target}">${esc(label || "トップへ戻る")}</a></li>`).join("");
  return `<h1>${esc(title || SITE_NAME)}</h1><p>${esc(description)}</p><p>${esc(intros[route] || "")}</p>${details}<nav aria-label="主なコーナー"><h2>文鳥の庭をめぐる</h2><ul>${links}</ul></nav>`;
}
function html(route, description, title, article) {
  const meta = routeMetadata(route);
  const fullTitle = meta.title, canonical = meta.canonical;
  const isGame = route === "game/";
  const fallback = isGame ? `<section class="game-startup" aria-label="おもちの文鳥ぐらしをひらいています"><img src="${base}game-art/game-title.png" width="2172" height="724" alt="おもちの文鳥ぐらし" fetchpriority="high"><p role="status">ひらいています…</p><a href="${base}game/">ひらかないときは、もういちど</a><noscript><p>JavaScriptを有効にするとあそべます。</p></noscript></section>` : staticMain(route, description, title, article);
  // Critical route-scoped CSS is in the document: no script, stylesheet or image
  // request has to finish before the normal site shell is hidden on game entry.
  const startupStyle = isGame ? `<style id="game-startup-style">html[data-game-startup] body{margin:0;background:#e9efd9}html[data-game-startup] .site-header,html[data-game-startup] .site-footer,html[data-game-startup] .skip-link{display:none!important}.game-startup{position:fixed;inset:0;z-index:2000;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));background:radial-gradient(ellipse,#fff9e9,#e9efd9);color:#344d3b;text-align:center;font:16px/1.6 sans-serif;overflow:auto}.game-startup img{width:min(760px,88vw);height:auto;max-height:55dvh;object-fit:contain}.game-startup p{margin:0}.game-startup a{color:inherit;min-height:44px;display:flex;align-items:center;font-size:13px}</style>` : "";
  return `<!doctype html>
<html lang="ja" data-ruby="on"${isGame ? ' data-game-startup="pending"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="${esc(securityPolicy)}"><base href="${base}">${startupStyle}<script src="src/analytics-loader.js?v=1"></script><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f7f8f3"><meta name="robots" content="${route === "404.html" ? "noindex, follow" : "index, follow, max-image-preview:large"}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="${meta.ogType}"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="${esc(SITE_NAME)}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${esc(meta.imageURL)}"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="${esc(meta.imageAlt)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(fullTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(meta.imageURL)}"><meta name="twitter:image:alt" content="${esc(meta.imageAlt)}"><link rel="icon" data-brand-icon="favicon.svg" href="${meta.faviconPrefix}favicon.svg" type="image/svg+xml"><link rel="icon" data-brand-icon="favicon-32.png" href="${meta.faviconPrefix}favicon-32.png" type="image/png" sizes="32x32"><link rel="icon" data-brand-icon="favicon-16.png" href="${meta.faviconPrefix}favicon-16.png" type="image/png" sizes="16x16"><link rel="icon" data-brand-icon="favicon.ico" href="${meta.faviconPrefix}favicon.ico" sizes="16x16 32x32 48x48"><link rel="apple-touch-icon" href="${meta.installIcon}" sizes="180x180"><link rel="manifest" href="${meta.installManifest}"><link rel="mask-icon" href="safari-pinned-tab.svg" color="#244c3b"><meta name="application-name" content="${esc(meta.installName)}"><meta name="apple-mobile-web-app-title" content="${esc(meta.installName)}"><link rel="stylesheet" href="src/style.css?v=${styleVersion}"><link rel="stylesheet" href="src/studio.css?v=${presentationVersion}"><link rel="stylesheet" href="src/game-music.css?v=${gameVersion}"><link rel="stylesheet" href="src/game.css?v=${gameVersion}"><link rel="stylesheet" href="src/preservation-box.css?v=${gameVersion}"><link rel="stylesheet" href="src/game-help-guide.css?v=${gameVersion}"><link rel="stylesheet" href="src/diary-paper.css?v=${gameVersion}"><link rel="stylesheet" href="src/consultation-letter.css?v=${gameVersion}"><link rel="stylesheet" href="src/life-care.css?v=${gameVersion}"><link rel="stylesheet" href="src/caretaker-recruitment.css?v=${gameVersion}"><link rel="stylesheet" href="src/memorial.css?v=${gameVersion}"><link rel="stylesheet" href="src/encounter-ui.css?v=${gameVersion}"><link rel="stylesheet" href="src/garden-about-booklet.css?v=${gameVersion}"><link rel="stylesheet" href="src/garden-friend-cards.css?v=${gameVersion}"><link rel="stylesheet" href="src/relationship-map.css?v=${gameVersion}"><link rel="stylesheet" href="src/morph-ui.css?v=${presentationVersion}"><script id="site-jsonld" type="application/ld+json">${JSON.stringify(meta.structuredData).replace(/</g, "\\u003c")}</script></head><body><a class="skip-link" href="${base + route}#main">本文へすすむ</a><header class="site-header"><a class="brand" id="brand" href="${base}" aria-label="${esc(SITE_NAME)} トップ">${logoSvg("header-logo")}</a><nav class="desktop-nav" aria-label="主なメニュー"><a href="${base}encyclopedia/" data-nav="encyclopedia/">文鳥図鑑</a><a href="${base}omochi/" data-nav="omochi/">おもち観察室</a><a href="${base}studio/" data-nav="studio/">アート工房</a><a href="${base}game/" data-nav="game/">文鳥ぐらし</a></nav><div class="header-controls"><button id="menu-toggle" aria-expanded="false" aria-controls="menu" aria-label="メニューをひらく"><span class="menu-bars" aria-hidden="true"></span>メニュー</button></div><div class="header-menu" id="menu" hidden><form id="site-search" role="search"><label for="global-query">サイト内をさがす</label><input id="global-query" name="query" type="search" placeholder="気になることば" maxlength="80" enterkeyhint="search"><button aria-label="検索する">検索</button></form><nav aria-label="すべてのメニュー"><a href="${base}" aria-labelledby="menu-title-1" aria-describedby="menu-description-1"><strong id="menu-title-1">トップ</strong><span id="menu-description-1">今日の発見をひらく</span></a><a href="${base}encyclopedia/" aria-labelledby="menu-title-2" aria-describedby="menu-description-2"><strong id="menu-title-2">文鳥図鑑</strong><span id="menu-description-2">写真で知る、文鳥の暮らし</span></a><a href="${base}colors/" aria-labelledby="menu-title-3" aria-describedby="menu-description-3"><strong id="menu-title-3">羽色ずかん</strong><span id="menu-description-3">色と模様を見くらべる</span></a><a href="${base}body/" aria-labelledby="menu-title-4" aria-describedby="menu-description-4"><strong id="menu-title-4">からだ探検</strong><span id="menu-description-4">気になる部分を拡大</span></a><a href="${base}omochi/" aria-labelledby="menu-title-5" aria-describedby="menu-description-5"><strong id="menu-title-5">おもち観察室</strong><span id="menu-description-5">おもちの写真と観察ノート</span></a><a href="${base}challenge/" aria-labelledby="menu-title-6" aria-describedby="menu-description-6"><strong id="menu-title-6">文鳥チャレンジ</strong><span id="menu-description-6">学んだことを30問で発見</span></a><a href="${base}studio/" aria-labelledby="menu-title-7" aria-describedby="menu-description-7"><strong id="menu-title-7">アート工房</strong><span id="menu-description-7">写真でつくる、自分の作品</span></a><a href="${base}game/" aria-labelledby="menu-title-8" aria-describedby="menu-description-8"><strong id="menu-title-8">文鳥ぐらし</strong><span id="menu-description-8">出会って、飾って、家族になる</span></a><a href="${base}help/" aria-labelledby="menu-title-9" aria-describedby="menu-description-9"><strong id="menu-title-9">遊び方・設定</strong><span id="menu-description-9">操作と音の設定</span></a><a href="${base}credits/" aria-labelledby="menu-title-10" aria-describedby="menu-description-10"><strong id="menu-title-10">出典と素材</strong><span id="menu-description-10">写真と資料の出どころ</span></a></nav></div></header><main id="main" tabindex="-1"><div class="${route === "" ? "art-static-home" : "page-content"}" data-static-content>${fallback}</div><noscript><p class="page-content">ゲーム・工房・検索・読み上げにはJavaScriptを有効にしてください。図鑑の本文は上から読めます。</p></noscript></main><footer class="site-footer"><div class="footer-top"><div><h2>${esc(SITE_NAME)}</h2><p>おもちと学ぶ文鳥図鑑<br>見る。知る。つくる。いっしょに暮らす。</p></div><nav class="footer-links" aria-label="フッターメニュー"><a href="${base}colors/">羽色ずかん</a><a href="${base}help/">遊び方・設定</a><a href="${base}credits/">出典と素材</a><a href="https://github.com/djnaoyaman/buncho-ureshi" target="_blank" rel="noopener noreferrer">ソースコード</a></nav></div><div class="footer-bottom"><span>実際のおもちの観察と、ゲームの物語は別のものです。</span><span>© 2026 Buncho Ureshi · 写真は各作者に帰属</span></div></footer><div id="status" class="sr-only" role="status" aria-live="polite"></div><script type="module" src="src/app.js?v=${brandVersion}-${gameVersion}-${presentationVersion}"></script></body></html>`;
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
      .map(([route, , , article, morph]) => `<url><loc>${origin + base + route}</loc><lastmod>${article?.checkedAt || morph?.reviewedAt || reviewDate}</lastmod></url>`)
      .join("") +
    "</urlset>",
);
await writeFile(
  new URL("robots.txt", dest),
  `# This project-level copy is informational. Crawlers use /robots.txt at the host root.\n# This repository cannot change https://djnaoyaman.github.io/robots.txt.\nUser-agent: *\nAllow: /buncho-ureshi/\nSitemap: ${origin + base}sitemap.xml\n`,
);
await writeFile(new URL(".nojekyll", dest), "");
const llmIntro = `# ${SITE_NAME}\n\n> おもちと学ぶ、日本語の文鳥図鑑・アート工房・創作の生活ゲーム。\n\n公開URL: ${origin + base}\n情報確認日: ${reviewDate}\n\n実際のおもちは依頼者のお嬢さんのペットで、メスの白文鳥です。ご家族が提供した、おもち本人の写真を掲載しています。年齢・誕生日・性格・好物・観察エピソードは未提供です。ゲームの性格・家族・会話・日記は創作であり、実際の観察記録ではありません。実写資料は一般の文鳥の写真です。体調・飼育の判断は鳥を診療する獣医師に相談してください。\n\n図鑑は「まず見る・基本を知る・もっと調べる」の三段階。読み上げは端末機能です。工房のBGM・操作音は合成音であり、本物の文鳥の声ではありません。声の資料映像は出典付きの別素材です。保存は端末内で、サーバー投稿や端末間同期はありません。Google Analyticsでページ閲覧と操作の利用状況を計測します。独自イベントには名前・入力文・作品内容を含めません。\n\nこのファイルは公開済みの説明を機械が参照しやすくまとめたものです。検索順位・AI回答への掲載や採用を保証しません。転載は各素材のライセンスに従ってください。\n`;
const llmAtlasSummary = `\n## 羽色ずかんの範囲\n${morphAtlas.coverage.claim}\n既存の記事は${articles.length}件、独立した実写写真は${photos.length}点です。羽色ずかんは5つの色・模様の解説と1つの成長比較を追加し、既存写真13点を再利用します。追加画像1点は映像から取り出した派生静止画で、独立した写真の点数には数えません。\n${morphAtlas.profiles.map(profile => `- [${profile.name}](${origin + base}colors/${profile.id}/): ${profile.summary}`).join("\n")}\n`;
const llmAtlasFull = `\n## 羽色ずかん\n\nURL: ${origin + base}colors/\n${morphAtlas.coverage.claim}\n\n${morphAtlas.introduction.map(item => `### ${item.title}\n${item.text}`).join("\n\n")}\n\n${morphAtlas.profiles.map(profile => `### ${profile.name}\nURL: ${origin + base}colors/${profile.id}/\n情報確認日: ${profile.reviewedAt}\n${profile.summary}\n${profile.levels.map(level => `#### ${level.title}\n${level.text}`).join("\n\n")}\n#### 見える特徴\n${profile.diagnostics.map(part => `- ${part.part}: ${part.text}`).join("\n")}\n#### 成長と不確実性\n${profile.ageNotes}\n${profile.confidence}\n${profile.comparisonTips.join("\n")}\n観察ミッション: ${profile.mission}\n#### 写真と出典\n${profile.photoIds.map(id => { const photo = morphPhotos.find(p => p.id === id); return `- ${profile.photoNotes[id]}\n  ${photo.credit} — ${photo.source} — ${secureLink(photo.licenseUrl)}\n  加工: ${photo.modifications}`; }).join("\n")}\n#### 参考資料\n${profile.sources.map(source => `- ${source.title}: ${source.url}`).join("\n")}`).join("\n\n")}\n\n### 写真未収録のことば帳\n${morphAtlas.terminology.map(term => `#### ${term.name}\n${term.text}\n写真: ${term.photoStatus}\n${term.sources.map(source => `- ${source.title}: ${source.url}`).join("\n")}`).join("\n\n")}\n`;
const llmLinks = `\n## 主なページ\n${pages.filter(p => !p[3] && !p[4]).map(([route, description, title]) => `- [${title || "トップ"}](${origin + base + route}): ${description}`).join("\n")}\n\n## 図鑑の記事\n${articles.map(a => `- [${a.title}](${origin + base}encyclopedia/${a.id}/): ${stripText(a.summary)}`).join("\n")}\n\n## 詳細資料\n- [図鑑全文と情報源](${origin + base}llms-full.txt)\n- [出典と写真の利用条件](${origin + base}credits/)\n- [サイトマップ](${origin + base}sitemap.xml)\n`;
await writeFile(new URL("llms.txt", dest), llmIntro + llmLinks + llmAtlasSummary);
await writeFile(new URL("llms-full.txt", dest), llmIntro + "\n" + articles.map(a => `## ${a.title}\n\nURL: ${origin + base}encyclopedia/${a.id}/\n分類: ${a.category}\n情報確認日: ${a.checkedAt}\n\n### まず見る\n${stripText(a.summary)}\n\n### 基本を知る\n${stripText(a.body)}\n\n### もっと調べる\n${stripText(a.deep)}\n\n### 用語\n${(a.terms || []).map(t => `- ${t.term}（${t.reading}）: ${t.meaning}`).join("\n")}\n\n### 観察ミッション\n${a.mission}\n\n### 情報源\n${a.sources.map(s => s.url ? `- [${s.title}](${s.url})` : `- ${s.title}（利用者提供の非公開資料。外部リンクなし）`).join("\n")}\n`).join("\n") + llmAtlasSummary + llmAtlasFull);
console.log(
  `Built ${pages.length} pages, ${articles.length} articles and ${photos.length} photographs, 5 color profiles, 1 age profile and 1 derived still at ${base}`,
);



// Keep nested keepsake styles in lockstep with the current game release.
const keepsakeStylesFile=new URL('src/game.css',dest);
await writeFile(keepsakeStylesFile,(await readFile(keepsakeStylesFile,'utf8')).replace(/(game-keepsake-(?:card|bookmark)\.css)(?=['"])/g,`$1?v=${gameVersion}`));

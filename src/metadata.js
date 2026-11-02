import { articles } from "./data/articles.js";
import { photos } from "./data/photos.js";
import { SITE_NAME } from "./visuals.js";
export const PRODUCTION_ORIGIN = "https://djnaoyaman.github.io";
export const BASE_PATH = "/buncho-ureshi/";
export const IMAGE_ALT = `${SITE_NAME} — おもちと学ぶ文鳥図鑑。鳥と植物を配した案内用ロゴ。`;
export const PAGE_CATALOG = [
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
    stripText(a.summary),
    a.title,
    a,
  ]),
];
export function stripText(s) {
  return String(s)
    .replace(/<rt>.*?<\/rt>/g, "")
    .replace(/<[^>]+>/g, "");
}
function structuredData(route, description, title, article) {
  const canonical = PRODUCTION_ORIGIN + BASE_PATH + route, home = PRODUCTION_ORIGIN + BASE_PATH;
  const graph = [
    { "@type": "WebSite", "@id": home + "#website", name: SITE_NAME, url: home, inLanguage: "ja", description: PAGE_CATALOG[0][1], isAccessibleForFree: true },
    { "@type": "WebPage", "@id": canonical + "#webpage", name: title, url: canonical, description, inLanguage: "ja", isPartOf: { "@id": home + "#website" }, isAccessibleForFree: true, primaryImageOfPage: { "@type": "ImageObject", url: home + "ogp.png", width: 1200, height: 630, caption: IMAGE_ALT } },
  ];
  if (article) {
    graph.push({ "@type": "Article", "@id": canonical + "#article", headline: article.title, description, inLanguage: "ja", articleSection: article.category, dateModified: article.checkedAt, mainEntityOfPage: { "@id": canonical + "#webpage" }, isAccessibleForFree: true, image: article.photos.map(id => photos.find(p => p.id === id)).filter(Boolean).map(p => PRODUCTION_ORIGIN + BASE_PATH + p.src.replace(/^\//, "")), citation: article.sources.filter(s => s.url).map(s => s.url) });
    graph.push({ "@type": "BreadcrumbList", itemListElement: [[home, "トップ"], [home + "encyclopedia/", "文鳥図鑑"], [canonical, article.title]].map(([item, name], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function routeMetadata(route = "", { query = null, notFound = false } = {}) {
  const entry = PAGE_CATALOG.find(p => p[0] === route);
  const isSearch = query !== null;
  const missing = !isSearch && (notFound || !entry);
  const title = (isSearch ? "サイト内検索 | " : missing ? "ページが見つかりません | " : entry[2] ? entry[2] + " | " : "") + SITE_NAME;
  const description = isSearch ? "文鳥図鑑、アート工房、ゲーム、保存の手引きをサイト全体から検索します。" : missing ? "ページが見つかりません。文鳥たちの庭へ戻れます。" : entry[1];
  const canonicalRoute = isSearch ? "" : route;
  const article = !isSearch && !missing ? entry[3] : undefined;
  return {
    title, description, canonical: PRODUCTION_ORIGIN + BASE_PATH + canonicalRoute,
    robots: isSearch || missing ? "noindex, follow" : "index, follow, max-image-preview:large",
    imageAlt: IMAGE_ALT, imageURL: PRODUCTION_ORIGIN + BASE_PATH + "ogp.png",
    ogType: article ? "article" : "website",
    structuredData: structuredData(canonicalRoute, description, title, article),
  };
}

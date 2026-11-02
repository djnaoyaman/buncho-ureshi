# Launch Package 30 — 文鳥♬文鳥♬文鳥って嬉しいな♪

実装・公開前検査の記録時点：2026-11-02 05:52 UTC。対象は **djnaoyaman/buncho-ureshi のみ**。既存の別サイトは変更していません。

## 公開後の更新と、この表の時点

下の30項目表は05:52 UTCの履歴です。初期Launch対応はPR 2（main `3f3e41d39bebb9eff83afa209618cd306f839108`）で公開し、その時点の本番ブラウザ検査は139合格・失敗0・flaky0・意図した参照スキップ3でした。羽色ずかんの追加により、現在の静的ルート・canonical・sitemapは **53件**（専用404は別）です。7つの追加ルートにもメタデータ、JSON-LD、LLM資料と直接アクセス検査を適用します。

最新のゲーム変更を含む exact-commit / 公開後結果は [Actions](https://github.com/djnaoyaman/buncho-ureshi/actions) と納品の `RELEASE-VERIFICATION.json` を参照してください。実装・テスト登録だけを合格とは扱いません。GA ID未提供のため解析タグなし、実SNSキャッシュ・実機ホーム画面・フィールド性能・Search Console登録は未検証のままです。ホスト直下robotsは本リポジトリの管理外です。ロゴは、その後ユーザーが最終選択した refined 04 に更新しています（詳細は BRAND-04.md）。

## 判定の読み方

2026-11-01 の既存「15 サイト・450 項目」監査で使われた **同じ 30 項目**を採用しました。下表は実装・ローカル検査・実ブラウザ・公開確認を分けます。「実装済み」は公開確認済みと同義ではありません。本変更の exact-commit CI、本番 Pages、実端末表示、SNS 側のキャッシュ更新は、公開担当者の検証待ちです。

- **ローカル確認**：`npm run build && node --test tests/seo.test.js` は 8 / 8 合格。46 ページと専用 404 の静的 HTML、画像バイト、manifest、サイトマップ、LLM テキスト、ローカル HTTP 404 を検査しました。
- **ブラウザ回帰**：`tests/browser/launch.spec.js` にメタデータ遷移、共有と失敗時の代替、配信ファイル、ふりがな固定表示、狭幅・トップ復帰の実操作テストを追加。Chromium / Firefox / WebKit に適用します。ここでのテスト追加・discovery は実行合格を意味しません。
- **ロゴ採用**：ユーザーが選択した refined 04 の原本をバイト単位で保存し、同じ絵からヘッダー・トップ・工房 PNG・各種アイコン・OGP を書き出しました。原本はビットマップです。SVG ラッパーを純ベクター版とは呼びません。作成条件・ハッシュ・検証範囲は [BRAND-04.md](BRAND-04.md) を参照。

## 30 項目の台帳

| # | 既存分類 | このサイトの実装・証拠 | 未確認 / 適用外 |
|---|---|---|---|
| 1 | title・description・canonical | `src/metadata.js` をビルドと実行時で共用。46 URL の正式名、固有説明、固定 HTTPS canonical を Node 検査。 | 実行時の遷移と公開配信は新 CI 待ち。 |
| 2 | robots と検索対象 | 正常ページは `index, follow, max-image-preview:large`、404 と検索結果は `noindex, follow`。 | GitHub Pages プロジェクト内 `/buncho-ureshi/robots.txt` は案内用。検索ロボットが読む **ホスト直下 `/robots.txt` はこのリポジトリの管理外**。05:51 UTC の HTTP 200 読み取りで、`User-agent: *` の禁止は `/MINERALion/` のみで、本サイトは拒否されていないことを確認。本サイトの sitemap はホスト直下の一覧に未登録。管理外のファイルは変更していない。 |
| 3 | sitemap.xml | 46 件、重複なし。404・検索パラメータを除外。記事の確認日・サイトの実確認日から lastmod を生成。 | Search Console への登録や検索エンジンの受領は未実施。 |
| 4 | JSON-LD | WebSite / WebPage、記事の Article / BreadcrumbList。本文のカテゴリ・確認日・写真・情報源と一致することを検査。 | 著者資格・運営法人・評価・受賞・公開日を捏造しない。Rich Results 掲載保証はしない。 |
| 5 | llms.txt・llms-full.txt | 日本語の概要・全記事リンク、37 記事の公開本文・用語・確認日・情報源をビルド生成。実在おもちと創作ゲームの区別も記載。 | LLM が参照・採用する保証はない。利用者のノート・ゲーム保存・非公開依頼書本文は含めない。 |
| 6 | SEM 準備 | 検索意図別の図鑑・アート・ゲーム・保存案内と共有用メタデータを整備。 | **広告出稿は N/A**。媒体・予算・広告アカウントの承認なし。登録・購入・タグ導入はしていない。 |
| 7 | OGP・X カード | 全ページに title / description / image / alt、OG locale・site_name・URL・画像形式・寸法、X large-image card を明示。 | X 等の実カード生成・SNS キャッシュは未確認。 |
| 8 | ページ / 結果固有 OGP | 記事・コーナーごとの title / description / URL を静的生成、SPA も共通モジュールで更新。 | ブランド画像は共通の採用済み refined 04 OGP。私的なゲーム結果・観察ノートの公開 URL や動的 OGP を作らない。 |
| 9 | 画像 URL・寸法・形式・alt | OGP は 1200×630 PNG、画像バイトを検査。静的記事写真に元画像寸法・alt・loading / decoding を付与。 | 実公開 URL の decode は新 CI 待ち。 |
| 10 | 縮小時の読みやすさ・世界観 | 既存 favicon / OGP と新しい 32px アイコン・maskable を実見。鳥・くちばし・背景の区別を確認。 | 実端末のホーム画面・ピン固定タブと SNS 縮小カードは未確認。採用済み refined 04 の本番ブラウザ検査は統合担当が別途記録。 |
| 11 | 共有・コピー・失敗時代替 | 全ページ footer に共有・URL コピー、明示的な状態表示と手動コピー用 URL。共有対象は公開 canonical のみ。 | ネイティブ共有シートで実際の送信はしない。成功・拒否・非対応の API 分岐をテストし、ユーザーの外部投稿は行わない。 |
| 12 | SVG / ICO / PNG favicon | 元 SVG、16/32/48px PNG、3 サイズを持つ ICO。形式ヘッダと寸法を検査。 | 実ブラウザ UI のタブ表示は未確認。 |
| 13 | Apple Touch Icon | 既存 180×180 PNG を保持し sizes を宣言。 | iPhone 実機でのホーム追加は未確認。 |
| 14 | Android 192 / 512・maskable | 同一 SVG から 192 / 512 PNG。maskable は不透明背景と鳥の安全余白。manifest の宣言と実寸を検査。 | Android 実機での切り抜き表示は未確認。 |
| 15 | Safari 固定タブ | 同じ鳥の単色 SVG、16×16 viewBox、mask-icon 色を宣言。 | Safari 実機ピン表示は未確認。 |
| 16 | manifest 表示名・説明・表示 mode | name / short_name と Apple 表示名は省略せず同じ正式名、日本語、説明、standalone、色、start_url / scope / id をプロジェクト内に限定。 | service worker は未導入。インストール可能表示やオフライン動作を保証しない。 |
| 17 | ホーム追加・bookmark 案内 | ヘルプに Safari / Chrome の案内、ブックマーク、通信が必要なことを記載。 | OS / ブラウザ版による実メニュー差、実際の追加操作は未確認。 |
| 18 | 全幅・縦横 responsive | 既存 320–1440px・縦横テストを維持。Launch controls は 375px 回帰を追加。 | 新 UI を含む全画面の最終 CI / スクリーンショット確認待ち。 |
| 19 | safe-area・touch・keyboard | viewport-fit=cover、safe-area CSS、44px 操作領域、キーボード・トップ復帰の焦点制御。 | ノッチ付き実機の表示は未確認。数値・疑似端末の検証だけで実機合格としない。 |
| 20 | 読み上げ・contrast・reduced motion | ふりがなは常時 ON。旧 ruby:false を引き継がない。端末読み上げ、停止、動き軽減と焦点表示を維持。 | 実音声の品質・全色組合せの contrast は別検証。 |
| 21 | トップへ戻る | footer のトップボタンでスクロール 0、本文へ focus。 | ブラウザ回帰の実行結果待ち。 |
| 22 | 操作 bar 不要余白なし | 共有操作は footer の通常フロー。固定バーや余白用の見えない spacer を追加しない。 | 縦横の最終スクリーンショットで確認待ち。 |
| 23 | 404 復帰・noindex・icon | 専用 404、実 pathname の canonical、noindex、通常のホームリンク、同じ favicon 群。Node で HTTP 404 を実取得。 | Pages の不明 URL と復帰操作は新本番 CI 待ち。 |
| 24 | performance・画像・error handling | 画像寸法で領域確保、主画像 eager/high、他は lazy/async。OGP 200KB 未満、生成 HTML 180KB 未満を検査。既存安全な保存・画像失敗処理を維持。 | 実ユーザー LCP / CLS / INP、低速回線の評価は未実施。速度スコアを捏造しない。 |
| 25 | 日本語・正確性・独創性・統一 | 正式名と実在おもちの既知事実を統一。事実出典・画像ライセンス・確認日を継承。語義のない外国語クレジットを勝手に翻訳しない。 | 全学術情報の新規再調査ではない。ロゴは refined 04 の採用が確定。 |
| 26 | 音楽 Premium 案内 | **N/A**。配信音楽サービス・YouTube 埋め込みなし。合成 BGM と利用許可された鳥の声資料のみ。 | Premium 契約を勧める必要はない。 |
| 27 | GA 設置（受信と分離） | **意図的に未設置**。GA ID、解析 SDK、広告トラッカーを追加していないことを静的検査。 | 承認された測定目的・ID・プライバシー方針・同意要件を確定するまで保留。稼働・送信・受信済みと主張しない。 |
| 28 | CSP・referrer・外部 link | self 基準の meta CSP、object-src none、base-uri self、form-action self。CSS の inline 値は既存編集 UI のため許可。strict-origin-when-cross-origin、外部 blank の noopener/noreferrer。既知 CC URL を HTTPS 化。 | Pages の独自 HTTP ヘッダは設定していない。meta で無効な frame-ancestors は入れない。全外部ページの生存・安全性は未検査。 |
| 29 | 実公開・画面・主要操作 | 変更を exact-commit CI と本番ブラウザテストに渡す。既存図鑑・アート・ゲーム回帰を減らさない。 | **本変更の公開は担当親エージェント待ち**。この文書は公開完了証明ではない。 |
| 30 | 完了 / 未確認 / N/A 明示 | 本台帳とテストで実装・ローカル・ブラウザ・公開を区別。広告・Premium は適用外、GA は意図的保留。 | 最終 CI と本番の SHA / run URL / 残件は親担当が追記する。 |

## 実装契約

- `routeMetadata(route, { query, notFound })` は production origin を返します。検索語・QA パラメータ・URL hash・個人保存データを canonical / 共有へ含めません。
- `#site-jsonld` は静的・実行時で同じ schema データを使います。
- 共有要素：`#page-share`、`#page-copy-url`、`#page-share-status`、`#page-share-fallback`、`#page-share-url`。トップ操作：`#page-top`。ホーム追加案内：`#help-access`。
- CSP は meta による制御であり、HTTP ヘッダによる全保護を意味しません。Canvas の同一 origin 画像、data/blob の画像、Web Audio、ローカル保存を妨げない範囲で設定しています。新しい外部サービスを追加するときは CSP とプライバシー方針を再確認します。

## 参考にした一次資料

- [Google Search Central: robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google Search Central: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [MDN: Web app manifest icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons)
- [MDN: manifest scope](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope)
- [Apple: Safari pinned tab icons](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [llms.txt proposal](https://llmstxt.org/)

これらは実装仕様の参考です。仕様ページを読んだことと、各プラットフォームが実際に表示・採用したことは別です。

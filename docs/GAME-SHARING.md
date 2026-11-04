# ゲームページの共有カード

`/game/` はゲーム専用のタイトル・説明・画像を、静的HTMLと画面内のページ移動の両方で出力します。OGP、X/Twitterの大きい画像カード、JSON-LDの代表画像は同じ `game-ogp-v1.png` を参照します。共有URLはクエリーやフラグメントを含まない公開URLです。図鑑・トップ・工房などのカードは従来のままです。

## 素材と公開範囲

- 唯一の画像素材は、既にこの公開リポジトリにあるゲームタイトル `public/game-art/game-title.png` です。元画像の描き直し・着色・切り抜きは行っていません。
- 元画像のSHA-256: `b214cf45cf7e42ee5ffe26e88e55700c7cd68610ebba90ad7742a37977030cc3`。
- 個人写真、観察室の本人写真、未公開の参照画像、ゲームの保存内容はカードに含みません。生成ゲームイラストを実写写真として説明しません。
- `scripts/game-share-card.svg` は背景・文字・既存ロゴ配置だけのレイアウト原稿です。書体は Noto Sans CJK JP。新しい外部素材やフォントファイルを配信物に追加していません。
- 配信用PNG: 1200×630、491,718 bytes。SHA-256: `86f30cf4c458cca369b3dedafd80d014f9659485aead4820b99d1021a60cb21c`。
- ロゴ自体の利用条件を変更せず、生成画像に独自のCreative Commonsライセンスを付けていません。

## 再出力と検証

Inkscape と Noto Sans CJK JP を備えた環境で、リポジトリ直下から次を実行します。通常のサイトビルドは既に検証したPNGをコピーするだけで、Inkscapeに依存しません。

```sh
inkscape scripts/game-share-card.svg --export-type=png --export-filename=public/game-ogp-v1.png
npm run check
npm test
npx playwright test tests/browser/game-sharing.spec.js --project=chrome --project=webkit --retries=0
```

単体テストは静的HTML・ルートの分離・PNGの寸法・公開済み素材・キャッシュ更新を確認します。ブラウザテストはJavaScriptなしの初回HTML、画像配信、直接アクセス、画面内遷移、戻る・進む・再読込を確認します。Pagesの公開前チェックにも含めます。配信先が古いカードを保持している場合、SNS側の再取得まで表示が変わらないことがあります。

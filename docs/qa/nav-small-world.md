# B「小さな世界」上部ナビゲーション

基点: 9a8e70c5d888a5ca20ce6993fc43c2cc3662e8d9（庭BGM5曲公開後）。

承認された木の家、緑の芽、向かい合う白文鳥2羽を、おうち・おにわ・友だちの既存button内に装飾画像として追加。ラベル・全button属性・ARIA・イベント・下線offsetは保持。画像はalt空、aria-hidden、pointer-events:none。26px（360px以下24px）。既存ナビ以外のJS全文と既存CSS接頭辞は同一。

Library引継ぎ: libfile_fde3_f-c3f73eb376cc81919fadbc8789d46c9c_1e5190e96ae0819195a4cad3042d859b version 0、nav-b-release-handoff.zip、9792 bytes、SHA256 b095aa5f5dfa938446a1a9cccb6e09c3829f5c4221d507b014ffdfee4c5d2691。
採用見本: libfile_fde3_f-58dc8230f26881919f528f595fd5dffe_1e5190e96ae0819195a4cad3042d859b version 0、nav-b-reference.png。両方正規Library materializationで取得、実ピクセル確認。patchによる末尾改行のみ取り除き、manifestの採用SVG hashそのものと一致。

- nav-mini-home.svg: 41e5901123b828680db7bc822456c4bd9b683087e491ac5a775a015a1d02ea4b
- nav-mini-garden.svg: 8761efce32c02b2b591a712cc40719842df8ac47f65136d2dbc1db0e7d415554
- nav-mini-friends.svg: 2c8fe75fff5083e9f4bf03101ed1733b2e7c2c0f9dade4dbc4d72a9b073d9e0f

## 保護と検査

前回封印成果物と旧保護baselineをまず照合。出力の実変更はgame.jsのナビ内装飾とgame.cssの追加6行のみ。他の既存変更はキャッシュURL更新のみ。新規SVG3点を保護対象へ追加（計602）。監査記録はnav-small-world-output-audit.json。音楽全曲・音量/復帰・心拍・鳥/遭遇音・保存/得点/RNGのソースと既存資産に差分なし。

引継ぎ元の8件はブラウザ起動前停止だったため合格に数えない。この環境で新たに同じ実CSS fixtureの8件を実行して合格。実ゲーム検査は320/375/390/430px、旧ナビと同じゲーム/保存で位置・サイズ・ラベル・選択下線・下段dockを比較し、キーボード/画像失敗/戻る/反復/再読込を検査。既存音楽検査と直前公開5曲検査を併用。

自動WebKitはiPhone実機Safariの検査ではない。本人端末ブラウザは使用しない。主観的試聴は本変更の検査には含めない。

## アイコンだけ戻す手順

新しい修正PRでgame.jsのfieldControls内3画像とラベルspan、game.css末尾のBブロックを基点の表示へ戻す。3つのnav-mini SVGは未参照にするか削除し、出力差分を同じ方法で再監査してbaselineを更新。全必須検査・公開・本番照合を行う。音楽やセーブを巻き戻さず、他の公開済み変更をrevertしない。この復旧手順は記録のみで未実行。

既存color-play単体検査は同一セレクターの最後のブロックだけから背景色を読んでいたため、後続の配置専用ブロックで空文字になった。CSSでは未指定の背景色はリセットされない。背景色の期待値を維持したまま、同じ詳細度のブロックから最後の背景宣言を検査するよう修正。実ブラウザの変更前後比較も継続し、検査削除は行わない。

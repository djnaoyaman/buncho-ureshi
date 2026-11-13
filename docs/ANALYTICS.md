# アクセス解析

2026-11-14 実装。指定された GTM-W9SQSCBT の公開設定にある GA4 G-VVFMFGKXNL へ gtag の event コマンドで送信。GTMに個別のカスタムイベントトリガーを追加する必要はない。GTMの既存Googleタグ・拡張計測がpage_viewと履歴変更を担当し、サイトからpage_viewを重ねて送らない。content_viewは描画完了時の分類用イベント。

| 対象 | イベント | 意味 |
| --- | --- | --- |
| 全ページ | content_view | SPA遷移を含むコンテンツ表示。site_area / content_type |
| 通常ページなど | navigation_select | ゲーム・工房への移動。destination |
| ゲーム | game_start | 保存データを読み込み、プレイ可能になった時。新規ユーザー数ではない |
| ゲーム | game_panel_view | パネル切替。同じパネルの再描画は除外 |
| ゲーム | game_care | ごはん・なでる・掃除の変更が保存された時。action |
| ゲーム | game_gacha | ガチャ抽選が成功した時。machine / tier |
| ゲーム | game_travel / game_decorate / game_friend_invite | 移動・飾り変更・友達招待が成功した時 |
| 工房 | studio_open | 制作画面が使用可能になった時。sourceはgameかdirect（ゲームのカード受渡し以外） |
| 工房 | studio_edit_start | その工房利用で最初に編集した時 |
| 工房 | studio_material_add | 素材追加が成功した時。material_type |
| 工房 | studio_export | PNG生成が完了した時。format |
| 工房 | studio_download | 生成済みPNGの保存リンクを押した時。OSでの保存完了を意味しない |
| 工房 | studio_share | 共有APIが成功した時。キャンセルは除外 |

独自イベントのパラメーターは許可リスト制。名前、個体ID、入力文、写真、作品、保存データ、通貨残高を送らない。広告パーソナライズとGoogleシグナルはサイト初期化時に無効化。既存Googleタグの自動計測は管理画面側の設定に従う。GoogleタグのCookie利用は「遊び方・設定」に表示。

分析ではsite_area別に利用を比較し、ゲームは開始→お世話→ガチャ、工房は表示→編集→PNG生成→保存の到達率を見る。GA4でsite_area、content_type、destination、panel、action、machine、tier、material_type、format、sourceをイベントスコープのカスタムディメンションとして登録するとレポートに使える。イベント自体の送信にこの登録は不要。studio_exportをキーイベント候補とする。purchaseは使わない（仮想通貨を実売上に混ぜない）。

テストは外部タグをブロックした発火検査と、実際の公開Googleタグによる送信検査を分ける。GA管理画面のRealtime/DebugViewでの受信確認はアカウントへのアクセスが必要。

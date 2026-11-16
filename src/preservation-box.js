/**
 * Presentation only. Keep the management details wrapper, feedback, event
 * delegation and import safety controller in game.js. Export feedback has one
 * dedicated status node so the controller need not replace the open panel.
 * There is no user text / HTML input, state, file read or interactive artwork.
 */
export function renderPreservationBox() {
  return `<section class="game-preservation" aria-labelledby="game-preservation-title">
    <h4 id="game-preservation-title">庭の思い出を、たいせつに。</h4>
    <p>この端末のこのブラウザに保存します。ほかの端末へは自動で同期しません。大切な物語は「保存ファイルを書き出す」で保管してね。</p>
    <figure class="game-preservation-art">
      <img src="assets/preservation/preservation-box-B-v1.png" width="1312" height="1199" alt="眠る白文鳥と花の彫刻、真鍮の金具、緑の内布を備えた陶器調の保管箱">
      <figcaption>思い出の保管箱</figcaption>
    </figure>
    <section class="game-preservation-card game-preservation-export" aria-labelledby="game-preservation-export-title">
      <h5 id="game-preservation-export-title">今の物語を、しまう</h5>
      <p>最後に保存できた家族や記録を、保存ファイルに。書き出すだけでは庭の時間は進みません。保存に失敗した変更は含まれません。</p>
      <button type="button" data-game-action="export">保存ファイルを書き出す</button>
      <p data-preservation-export-status role="status" class="game-small"></p>
    </section>
    <section class="game-preservation-card game-preservation-import" aria-labelledby="game-preservation-import-title">
      <h5 id="game-preservation-import-title">しまった物語を、ひらく</h5>
      <p id="game-preservation-warning"><strong>読み込むと、今の庭と入れ替わります。</strong>読み込む前に、今の保存も書き出しておくと安心です。</p>
      <label class="game-import-label" for="game-import">保存ファイルを読み込む（今の庭と入れ替え）</label>
      <input id="game-import" type="file" accept="application/json,.json" aria-describedby="game-preservation-warning game-preservation-validation">
      <p id="game-preservation-validation" class="game-small">読み込み前に形式・版・血縁・人数を検査します。不正なファイルで今の庭は壊れません。読み込む前に、今の保存も書き出しておくと安心です。</p>
    </section>
    <p class="game-small">保存に失敗したら、リセットやブラウザのデータ削除をせず、まず書き出してください。ファイルを保管できたら、ほかのタブを閉じて空き容量や保存設定を確認します。復旧には、保管したファイルを上の欄から選び、確認して読み込みます。以前の記録に戻り、その後の変更は合流しません。</p>
    <div class="game-preservation-reset"><button type="button" id="game-reset-open" data-game-action="reset-state">リセットするものを選ぶ</button></div>
  </section>`;
}

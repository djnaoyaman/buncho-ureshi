// Presentation only: never changes progress, rewards or saved data.
export function pausedEventMessage(){
 return '<section data-event-status="paused"><h4>ゲームの<ruby>時間<rt>じかん</rt></ruby>を<ruby>一時停止<rt>いちじていし</rt></ruby>しています</h4><p>イベントは、じかんを とめている あいだは あそべません。まっているだけでは はじまらないよ。</p><button type="button" data-game-action="resume-events">じかんを うごかして つづける</button><p class="leaf-gift-note">とりの せいちょうや、にわのできごとも また すすみます。いままでの おもいでは そのままだよ。</p></section>';
}

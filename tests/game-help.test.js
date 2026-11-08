import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {renderGameHelp} from '../src/game-help.js';
function help(options){const w=new Window();w.document.body.innerHTML=renderGameHelp(options);return w.document.body;}
function plain(root){const copy=root.cloneNode(true);copy.querySelectorAll('rt').forEach(n=>n.remove());return copy.textContent;}
test('help uses five short steps and explains technical words with always-present ruby',()=>{
 const root=help();assert.equal(root.querySelectorAll('ol > li').length,5);assert.equal(root.querySelectorAll('.game-help > details').length,3);assert(root.querySelectorAll('ruby').length>100);assert([...root.querySelectorAll('ruby')].every(n=>n.querySelector('rt')?.textContent));
 const unannotated=root.cloneNode(true);unannotated.querySelectorAll('ruby').forEach(n=>n.remove());assert.doesNotMatch(unannotated.textContent,/[一-龠々]/);assert.doesNotMatch(root.innerHTML,/[{}]/);
 assert.match(plain(root),/家族のつながりがわかる図/);assert.match(plain(root),/むかえるかどうかは、自分でえらべる/);
});
test('plain help preserves care, life, price and fictional-safety facts',()=>{
 const text=plain(help());for(const expected of ['7時・17時・20時','12時','10年','3日間','24時間','12 Gold','24 Gold','むりにさわらない','録音したものではない','AIの絵','ゲームの外へ送ることもない','お手本ではない'])assert(text.includes(expected),expected);
 assert.match(text,/物語を止めても、ごはんや病院に行くまでの時間は止まらない/);
});
test('unknown holiday coverage is readable and annotated only when needed',()=>{
 assert.doesNotMatch(plain(help()),/この年の祝日/);const root=help({holidayCoverageKnown:false});assert.match(plain(root),/この年の祝日は、まだゲームに入っていない/);assert.match(plain(root),/12時のお世話は、土曜日と日曜日だけ/);
});

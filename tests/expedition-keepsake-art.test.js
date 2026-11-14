import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync,existsSync} from 'node:fs';
import {GARDEN_REGULARS} from '../src/garden-friends.js';
import {expeditionKeepsakeArt,expeditionDiscovery} from '../src/garden-expedition-ui.js';
const pair=GARDEN_REGULARS.slice(2,4);
test('illustrated paper uses the exact two participants rather than fixed white and sakura sample',()=>{
 const win=new Window();try{const e={path:'brook',discovery:'brook-watch-watch',actorIds:pair.map(b=>b.id),approach:'look'};const before=JSON.stringify(e);win.document.body.innerHTML=expeditionKeepsakeArt(e,'/custom/');const art=win.document.querySelector('[data-expedition-art]');assert.equal(art.getAttribute('role'),'img');assert.deepEqual([...art.querySelectorAll('[data-keepsake-actor]')].map(n=>n.dataset.keepsakeActor),e.actorIds);assert.deepEqual([...art.querySelectorAll('[data-keepsake-color]')].map(n=>n.dataset.keepsakeColor),['silver','white']);assert.match(art.querySelector('.keepsake-paper').getAttribute('src'),/^\/custom\/game-art\/keepsakes\/brook.webp$/);assert.match(art.textContent,/みなも と しずく/);assert.equal(JSON.stringify(e),before);assert.ok(art.querySelector('.keepsake-bird-1'));}finally{win.happyDOM.abort();}});
test('all 18 discovery labels remain unique and available, no new rewards or missing image assets',()=>{
 const names=new Set(),arts=new Set();for(const path of ['brook','grove','flower']){assert.ok(existsSync(`public/game-art/keepsakes/${path}.webp`));for(const combo of ['chat-chat','chat-play','chat-watch','play-play','play-watch','watch-watch']){const e={path,discovery:`${path}-${combo}`,actorIds:pair.map(b=>b.id)};names.add(expeditionDiscovery(e)[0]);arts.add(expeditionKeepsakeArt(e));}}assert.equal(names.size,18);assert.equal(arts.size,18);const source=readFileSync('src/garden-expedition-ui.js','utf8');assert.doesNotMatch(source,/Math.random|Date.now|gold\s*[+]=|gems\s*[+]=/);assert.doesNotMatch(source,/const motifs=/);
});
test('paper art is responsive, no decorative animation or new tap targets and text remains real text',()=>{const css=readFileSync('src/game-keepsake-card.css','utf8');assert.match(css,/width:min\(100%,380px\)/);assert.match(css,/max-width:360px/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/pointer-events:none/);const art=expeditionKeepsakeArt({path:'flower',discovery:'flower-chat-watch',actorIds:pair.map(b=>b.id)});assert.match(art,/keepsake-title/);assert.doesNotMatch(art,/<button|<canvas/);});

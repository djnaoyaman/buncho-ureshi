import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {GARDENS} from '../src/data/gardens.js';
import {GARDEN_TRACK_CREDITS} from '../src/data/garden-track-credits.js';
import {renderGardenAboutBooklet} from '../src/garden-about-booklet.js';
import {renderGardenTrackCredit} from '../src/garden-track-credit.js';
import {createWorld,serializeWorld} from '../src/engine.js';
const plain=node=>{const copy=node.cloneNode(true);copy.querySelectorAll('rt').forEach(n=>n.remove());return copy.textContent;};
test('35 unique themes match the current assigned garden music exactly',()=>{
 assert.equal(GARDENS.length,35);assert.deepEqual(Object.keys(GARDEN_TRACK_CREDITS).sort(),GARDENS.map(g=>g.music.themeId).sort());
});
for(const garden of GARDENS)test(garden.id+' assigned credit precedes illustration and preserves native disclosure',()=>{
 const w=new Window(),doc=w.document,credit=GARDEN_TRACK_CREDITS[garden.music.themeId];
 doc.body.innerHTML=renderGardenAboutBooklet({...garden,themeId:garden.music.themeId,base:'/buncho-ureshi/',art:{src:'/buncho-ureshi/'+garden.background.src,width:941,height:1672}});
 const block=doc.querySelector('[data-garden-track-credit]'),chapter=doc.querySelector('.garden-about-booklet__chapter');
 assert.equal(block.dataset.gardenTrackCredit,garden.music.themeId);assert.equal(block.parentElement,chapter);assert.equal(block.nextElementSibling.tagName,'FIGURE');
 assert.equal(plain(block.querySelector('.garden-about-booklet__track-title')),credit.trackTitle);assert.equal(plain(block.querySelector('[data-track-production]')),'制作：みやざきなおや');assert.equal(plain(block.querySelector('[data-track-description]')),credit.description);
 assert.equal(doc.querySelector('details').open,false);assert.equal(block.querySelectorAll('button,input,audio,video,[role=status]').length,0);assert.ok(!block.textContent.includes('再生中'));
 assert.equal(block.querySelectorAll('a,[data-track-composer]').length,0);
 assert.doesNotMatch(block.textContent,/BWV|バッハ|Runway/);
 w.happyDOM.close();
});
test('unknown theme adds no invented credit; rendering cannot modify save or audio state',()=>{
 assert.equal(renderGardenTrackCredit('__proto__'),'');assert.equal(renderGardenTrackCredit('unknown'),'');
 const world=createWorld(1000,42),before=serializeWorld(world);
 for(const g of GARDENS)renderGardenTrackCredit(g.music.themeId);
 assert.equal(serializeWorld(world),before);
});

test('all 35 display mappings retain the published audio bytes and catalog',async()=>{
 const {readFile}=await import('node:fs/promises');const {createHash}=await import('node:crypto');
 const hash=b=>createHash('sha256').update(b).digest('hex');
 const audit=JSON.parse(await readFile(new URL('../docs/qa/garden-track-credit-scope.json',import.meta.url)));
 assert.equal(audit.audio.length,35);
 for(const g of GARDENS){const row=audit.audio.find(r=>r.gardenId===g.id);assert.ok(row);assert.equal(row.themeId,g.music.themeId);assert.equal(row.asset,g.music.asset);assert.equal(row.title,GARDEN_TRACK_CREDITS[g.music.themeId].trackTitle);assert.equal(hash(JSON.stringify(g.music)),row.catalogSha256);assert.equal(hash(await readFile(new URL('../public/'+row.asset,import.meta.url))),row.sha256);}
 assert.equal(GARDEN_TRACK_CREDITS['garden-paris-unrest'].trackTitle,'海の向こうまで');assert.equal(GARDEN_TRACK_CREDITS['garden-hanadokei'].trackTitle,'まるい冠のワルツ');assert.equal(GARDEN_TRACK_CREDITS['garden-bird-hooded-siskin'].trackTitle,'谷をわたるひかり');
});

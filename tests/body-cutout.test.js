import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Window } from 'happy-dom';
import { birdSvg, birdPhotoCredit } from '../src/visuals.js';
import { photos } from '../src/data/photos.js';

test('every educational bird illustration uses one unmodified, licensed photographic view', async()=>{
 const p=photos.find(p=>p.id==='photo-23');
 assert.equal(p.license,'CC BY-SA 3.0');
 const original=await readFile(new URL('../public/photos/photo-23.webp',import.meta.url));
 assert.equal(createHash('sha256').update(original).digest('hex'),p.sha256);
 const w=new Window();w.document.body.innerHTML=['white','gray','chick'].map(c=>birdSvg(c)).join('');
 const images=[...w.document.querySelectorAll('image')];assert.equal(images.length,3);
 assert(images.every(i=>i.getAttribute('href')==='photos/photo-23.webp'));
 const clips=[...w.document.querySelectorAll('clipPath')];assert.equal(new Set(clips.map(c=>c.id)).size,3);
 assert.equal(w.document.querySelectorAll('ellipse,circle').length,0);
 assert.equal(w.document.querySelectorAll('g[transform="translate(990 0) scale(-1 1)"]').length,3);
 assert.match(birdPhotoCredit(),/DickDaniels/);assert.match(birdPhotoCredit(),/切り抜き・左右反転/);assert.match(birdPhotoCredit(),/同じライセンス/);
 w.happyDOM.abort();
});
test('body and quiz identify photography and preserve existing part-detail/save behavior', async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert(!source.includes('独自制作の模式図'));
 assert(!source.includes('文鳥の体の模式図'));
 assert(source.includes('耳の穴は羽毛にかくれて'));
 assert(source.includes('data-part="${id}"'));
 assert(source.includes('aria-controls="part-detail"'));
 assert(source.includes('<figcaption>${birdPhotoCredit()}</figcaption>'));
});

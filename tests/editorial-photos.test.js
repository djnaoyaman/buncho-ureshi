import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { photos } from '../src/data/photos.js';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');
test('editorial index has individual non-destructive profiles and conserves every source photo',async()=>{
 const css=await read('src/style.css');
 const section=css.split('/* Editorial index only.')[1];assert(section);
 const profiles=[...section.matchAll(/#article-grid img\[src\$="(photo-\d+)\.webp"\]/g)].map(m=>m[1]);
 assert.equal(profiles.length,33);assert.equal(new Set(profiles).size,33);
 for(const p of photos){const file=await readFile(new URL('../public'+p.src,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),p.sha256,p.id);}
 assert(!section.includes('hue-rotate'));assert(!section.includes('sepia'));
 assert(!section.includes('.article-hero'));assert(!section.includes('.photo-row'));
 assert(section.includes('--photo-ratio:3/4'));assert(section.includes('--photo-ratio:9/10'));
 const app=await read('src/app.js');assert(app.includes('一覧の写真は、構図と明るさ・彩度'));assert(app.includes('元写真・作者・利用条件'));assert(app.includes('article-cover-credit'));
});
import { photoDrift, bindEditorialParallax } from '../src/editorial-parallax.js';
test('parallax stays within reserved space and gracefully supports a static document',()=>{
 for(const center of [-5000,0,200,500,1000,9000]) assert(Math.abs(photoDrift(center,900))<=8);
 assert.equal(photoDrift(450,900),0);assert.equal(photoDrift(0,0),0);assert.equal(photoDrift(NaN,900),0);
 assert.equal(typeof bindEditorialParallax(null),'function');
});

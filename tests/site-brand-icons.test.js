import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {PAGE_CATALOG,routeMetadata} from '../src/metadata.js';
const read=p=>readFile(new URL('../'+p,import.meta.url));
test('every non-game route has dedicated approved artwork and matching social metadata',async()=>{
 for(const [route] of PAGE_CATALOG){const m=routeMetadata(route);const game=route==='game/';const html=(await read('dist/'+route+'index.html')).toString();assert.equal(m.faviconPrefix,game?'':'site-brand-v1/');assert.ok(html.includes(`href="${m.faviconPrefix}favicon.svg"`));assert.ok(html.includes(`content="${m.imageURL}"`));assert.equal(m.imageURL.endsWith(game?'game-ogp-v1.png':'site-brand-v1/ogp-artposter.png'),true);}
});
test('dedicated image derivatives are correctly sized and opaque',async()=>{
 for(const [name,size] of [['favicon-16.png',16],['favicon-32.png',32],['favicon-48.png',48],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]]){const b=await read('public/site-brand-v1/'+name);const m=await sharp(b).metadata();assert.equal(m.width,size);assert.equal(m.height,size);const {data}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);}
 const b=await read('public/site-brand-v1/ogp-artposter.png');const m=await sharp(b).metadata();assert.equal(m.width,1200);assert.equal(m.height,630);assert.ok(b.length<500000);
});
test('art poster embeds the actual approved logo, not regenerated text',async()=>{const svg=(await read('public/site-brand-v1/ogp-artposter.svg')).toString();const logo=await sharp(await read('public/brand/wordmark-04-transparent.webp')).png().toBuffer();assert.ok(svg.includes('../brand/wordmark-04-transparent.webp'));assert.ok(logo.length>10000);});

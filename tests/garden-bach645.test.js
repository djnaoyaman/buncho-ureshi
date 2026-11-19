import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GARDEN35_MUSIC} from '../src/data/garden35-music.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const manifest=JSON.parse(read('docs/qa/garden-bach645.json'));
test('archived Bach preserves the approved independent performance and guarded MP3 metadata',()=>{
 const m=GARDEN35_MUSIC.hanadokei;
 const audio=read('public/'+manifest.asset);
 assert.equal(createHash('sha256').update(audio).digest('hex'),manifest.sha256);
 assert.equal(audio.length,manifest.bytes);assert.ok(audio.length<2_000_000);
 assert.notEqual(m.asset,manifest.asset,'replacement must not overwrite or falsely relabel the archived Bach performance');
 assert.equal(manifest.loopSamples,44100*70);assert.equal(manifest.guardSamples,882);
 assert.equal(manifest.original.sha256,'e7f1afff5e6f63e577c7a5dad4944daec805f537f89c03c453cc2872f3434e10');
 assert.equal(manifest.losslessMaster.sha256,'b2800a49580034328407a5bff1efc33b18a1a2460899f597776a52cc128906dd');
 assert.equal(manifest.sourcePackage.sha256,'4734fa95b71ab55e4ca88b8ec92aa40941789ea6f51535e043a1507cf1cff8be');
 assert.deepEqual(manifest.scoreQuarterBeats,[4.5,88.5]);assert.equal(m.originalComposition,undefined);
});
test('Bach attribution is present in static and interactive credits and scopes the adaptation',()=>{
 const doc=read('public/audio/gardens35/bach-bwv645-license.html').toString();
 assert.ok(doc.includes('以前「まるい冠の花庭」で使っていた'));
 for(const text of ['Wachet auf, ruft uns die Stimme','Johann Sebastian Bach','Bart Golsteijn','Copyright © 2006','Mutopia-2006/06/29-601','第2〜22小節','装飾音','https://creativecommons.org/licenses/by-sa/2.5/','https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=601','ゲームコード・画像・他の楽曲を同ライセンスへ変更するものではありません'])assert.ok(doc.includes(text),text);
 for(const source of ['src/app.js','scripts/build.mjs']){const content=read(source).toString();assert.ok(content.includes('audio/gardens35/bach-bwv645-license.html'));assert.ok(content.includes('target="_self">出典・改変・利用条件</a>'),'independent document must bypass SPA routing: '+source);}
 assert.ok(read('public/audio/gardens35/bach-bwv645-sources.zip').length>1000);
});

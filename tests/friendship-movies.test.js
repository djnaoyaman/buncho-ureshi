import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createWorld,validateWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {renderFriendshipMovieCard,renderFriendshipMovieDiary,unlockedFriendshipMovies,newlyUnlockedFriendshipMovies} from '../src/collection-ending-player.js';
const id='eurasian-tree-sparrow',other='masked-finch',at=Date.UTC(2026,10,18,9);
const fixture=(points,bird=id)=>{const w=createWorld(at,2026);w.encounters.nextId=2;w.encounters.discoveries=[{id:bird,firstTick:0,lastTick:0,visits:1,instanceId:1}];w.encounters.friendship=[{id:bird,petPoints:points-10}];return validateWorld(w);};
test('only an earned native friendship crosses the documented milestone',()=>{
 const w=fixture(99),baseline=unlockedFriendshipMovies(w);
 assert.deepEqual(baseline,[]);
 assert.ok(renderFriendshipMovieCard(w,id).includes('100ポイント'));
 assert.ok(!renderFriendshipMovieCard(w,id).includes('data-friendship-movie-open'));
 const response=encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision});assert.equal(response.changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies(baseline,w.worldId,w),[id]);
 assert.deepEqual(newlyUnlockedFriendshipMovies([id],w.worldId,w),[]);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId+'other',w),[]);
 const old=structuredClone(w);
 assert.match(renderFriendshipMovieCard(w,id),/城北中央公園.*The Nature Box.*CC BY 4.0/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="eurasian-tree-sparrow"/);
 assert.deepEqual(w,old);
 assert.deepEqual(unlockedFriendshipMovies(fixture(101,other)),[]);
 assert.equal(renderFriendshipMovieCard(fixture(101,other),other),'');
 assert.deepEqual(unlockedFriendshipMovies(createWorld(at)),[]);
});
test('publishes exactly the approved original mini film',()=>{
 const bytes=readFileSync(new URL('../public/game-endings/friendship-eurasian-tree-sparrow-v2.mp4',import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');assert.equal(bytes.length,3999033);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'29c1dcdd5cba472d884916aab2c3d13cd9710fdd594d3fac36c1df3bbcf49f56');
});
for (const [bird,title,license,digest] of [
 ['eurasian-bullfinch','ウソ','3.0','4f6277b8b9990b85abdd1bfb5fb880553b113ef2d3e7eb8cf30c18b9657cd300'],
 ['hawfinch','シメ','3.0','90477ff3ae3eb3bb4d98a7f1de2800977e28815f1d790c02511892f434b4e7c7'],
 ['tricolored-munia','ギンパラ','2.0','95f86d8fb0063630ab551172a21a3e23e5a4759e4c12179283a0cb6952db8cdc'],
])test(title+' uses only its own licensed film at native 100 points',()=>{
 const w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const html=renderFriendshipMovieCard(w,bird);
 assert.ok(html.includes(title+'と なかよしになった記念'));
 assert.ok(html.includes('href="https://creativecommons.org/licenses/by/'+license+'/">CC BY '+license+'</a>'));
 const bytes=readFileSync(new URL('../public/game-endings/friendship-'+bird+'-v1.mp4',import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
});

for(const [bird,license,place] of [['gouldian-finch','Pixabay Content License','原典に記載なし'],['red-crossbill','Public Domain','ロングマイア・メドウ']])test(bird+' uses the native milestone and shows exact attribution',()=>{
 const w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const html=renderFriendshipMovieCard(w,bird);
 assert.ok(html.includes(license));assert.ok(html.includes(place));assert.ok(!html.includes('CC BY'));
});

test('ベニスズメ uses the authentic exact edition, native milestone and actual author',()=>{
 const bird='red-avadavat',w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const html=renderFriendshipMovieCard(w,bird);
 assert.match(html,/Hari K Patibanda/);
 assert.match(html,/テランガーナ州/);
 assert.ok(html.includes('https://www.flickr.com/photos/krishnacolor/51482148959/'));
 assert.ok(html.includes('href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>'));
 const bytes=readFileSync(new URL('../public/game-endings/friendship-red-avadavat-logo09.mp4',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'59f684bd6457a6633d4ac786b1b297987b818f2da2f6c2f4f0960f3b4265b437');
});

test('マヒワ uses exact edited edition and accurately displays source and license',()=>{
 const bird='eurasian-siskin',w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const html=renderFriendshipMovieCard(w,bird);
 assert.match(html,/jLasWilson/);assert.match(html,/原典に記載なし/);
 assert.ok(html.includes('https://pixabay.com/videos/siskins-garden-birds-bird-feeder-2226/'));
 assert.ok(html.includes('href="https://pixabay.com/service/terms/">Pixabay Content License</a>'));
 assert.ok(html.includes('5.25秒'));assert.ok(!html.includes('CC BY'));
 const bytes=readFileSync(new URL('../public/game-endings/friendship-eurasian-siskin-logo09.mp4',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'41b79719ff2f7d8555bbcee13aabc44cc17f8805a7e09be4d34a9d7b9a1257db');
});

test('ベニヒワ merits precisely its own real-footage film and credits',()=>{
 const bird='common-redpoll',w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const snapshot=structuredClone(w),html=renderFriendshipMovieCard(w,bird);
 assert.match(html,/ベニヒワと なかよしになった記念/);
 assert.match(html,/ワショー郡ドライバレー.*Seabamirum.*CC BY 2.0/);
 assert.ok(html.includes('https://commons.wikimedia.org/wiki/File:Common_redpolls_(Acanthis_flammea).webm'));
 assert.ok(html.includes('https://creativecommons.org/licenses/by/2.0/'));
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="common-redpoll"/);
 assert.deepEqual(w,snapshot);
 const bytes=readFileSync(new URL('../public/game-endings/friendship-common-redpoll-logo09.mp4',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'0dd3a7a67cc6cf39209c478e8866b37dec6b6ea25269c1ffb31d51e6b8db05c5');
});

test('キンカチョウ unlocks at 100 with honest generated provenance and two photo credits',()=>{
 const id='zebra-finch',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.doesNotMatch(renderFriendshipMovieCard(w,id),/data-friendship-movie-open/);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const before=structuredClone(w),html=renderFriendshipMovieCard(w,id);
 assert.match(html,/実写ではなく、写真を参考にした生成映像/);
 assert.match(html,/Taeniopygia_guttata_-Australia_-male-8a\.jpg/);
 assert.match(html,/Zebra_Finch_in_hand\.JPG/);
 assert.doesNotMatch(html,/撮影地：/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="zebra-finch"/);
 assert.deepEqual(w,before);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/game-endings/friendship-zebra-finch-logo09.mp4',import.meta.url))).digest('hex'),'4603293423a989e63ec8ac58950063cc18937288a126e926ffdf1f7e87cdf5ce');
});

test('ダイヤモンドフィンチ unlocks at 100 with both of its own licensed photo references',()=>{
 const id='diamond-firetail',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.doesNotMatch(renderFriendshipMovieCard(w,id),/data-friendship-movie-open/);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const before=structuredClone(w),html=renderFriendshipMovieCard(w,id);
 assert.match(html,/実写ではなく、写真を参考にした生成映像/);
 assert.match(html,/Stagonopleura_guttata_49654460[.]jpg.*aussiegall/);
 assert.doesNotMatch(html,/撮影地：|Janet/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="diamond-firetail"/);
 assert.deepEqual(w,before);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/game-endings/friendship-diamond-firetail-logo09.mp4',import.meta.url))).digest('hex'),'88ba893b86955674214331d528ab1bb81e9b11c01bd81b64fc4c6dce3f2d0dab');
});

test('ヒノマルチョウ unlocks at 100 without autoplay and credits primary image and comparison separately',()=>{
 const id='red-throated-parrotfinch',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.doesNotMatch(renderFriendshipMovieCard(w,id),/data-friendship-movie-open/);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const before=structuredClone(w),html=renderFriendshipMovieCard(w,id);
 assert.match(html,/実写ではなく、写真を参考にした生成映像/);
 assert.match(html,/324096623.*Ben Keen（映像のもとになった写真）.*CC0.*69886942.*Lennart Hudel（姿の確認に使った写真）.*CC BY 4[.]0/);
 assert.doesNotMatch(html,/撮影地：|Andrew Allen/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="red-throated-parrotfinch"/);
 assert.deepEqual(w,before);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/game-endings/friendship-red-throated-parrotfinch-logo09.mp4',import.meta.url))).digest('hex'),'a6179e4ffcdedce47aaff3c9cb62a37b51727992119dc366598bee8749548452');
});

test('キビタイシメ uses the native milestone and independent CC BY-SA footage with attribution',()=>{
 const id='evening-grosbeak',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.doesNotMatch(renderFriendshipMovieCard(w,id),/映像のみ|data-friendship-movie-open/);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const before=structuredClone(w),html=renderFriendshipMovieCard(w,id);
 assert.match(html,/Cephas.*Hesperiphona vespertina CT1.*CC BY-SA 3[.]0/);
 assert.match(html,/ゲームのタイトルカードは別の作品.*friendship-evening-grosbeak-cc-by-sa[.]mp4.*映像のみ/);
 assert.doesNotMatch(html,/生成映像|音楽を加え/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="evening-grosbeak"/);
 assert.deepEqual(w,before);
 const mp4=readFileSync(new URL('../public/game-endings/friendship-evening-grosbeak-cc-by-sa.mp4',import.meta.url));
 assert.equal(mp4.length,3656910);
 assert.equal(createHash('sha256').update(mp4).digest('hex'),'95e5425e28fdb3679c5fbc1f75614f14b0b41691ab31c2714c42c10dc84730c8');
 const logo=readFileSync(new URL('../public/game-endings/friendship-evening-grosbeak-card-logo09.webp',import.meta.url));
 assert.equal(logo.subarray(8,12).toString(),'WEBP');
});

test('カノコスズメ credits its archive film and keeps the Logo09 card separate',()=>{
 const id='double-barred-finch',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const html=renderFriendshipMovieCard(w,id);
 assert.match(html,/Double-barred_Finch94.*CC BY-SA 3[.]0/);
 assert.match(html,/Aviceda.*CC BY-SA/);
 assert.match(html,/friendship-double-barred-finch-cc-by-sa[.]mp4/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="double-barred-finch"/);
 for(const [file,sha] of Object.entries({"public/game-endings/friendship-double-barred-finch-cc-by-sa.mp4": "d1d49821c2237623901ee5868b068fa5b15cb7ba048768e7d9644e15d11fd5f7", "public/game-endings/friendship-double-barred-finch-card-logo09.webp": "8b5f202e5d2785bc42586feaf95bd6d2ec004009cba449cc65b726ea90de626e"}))
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),sha);
});

test('ギンザンマシコ credits its archive film and keeps the Logo09 card separate',()=>{
 const id='pine-grosbeak',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const html=renderFriendshipMovieCard(w,id);
 assert.match(html,/Pinicola_enucleator_CT2.*CC BY-SA 3[.]0/);
 assert.match(html,/Cephas/);
 assert.match(html,/friendship-pine-grosbeak-cc-by-sa[.]mp4/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="pine-grosbeak"/);
 for(const [file,sha] of Object.entries({"public/game-endings/friendship-pine-grosbeak-cc-by-sa.mp4": "3024d041eeb772d608fb60cb3696a22bb4f32a79ea20acab851b0c95ee6204b7", "public/game-endings/friendship-pine-grosbeak-card-logo09.webp": "c9183220ecb004522147dfce4be2897f80295edfbd12cde1102be0e5f25299ba"}))
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),sha);
});

test('アトリ credits its archive film and keeps the Logo09 card separate',()=>{
 const id='brambling',w=fixture(99,id);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[id]);
 const html=renderFriendshipMovieCard(w,id);
 assert.match(html,/Keep_op_de_voerplek-4961722.*CC BY-SA 3[.]0 NL/);
 assert.match(html,/Marc Plomp.*Stichting Natuurbeelden/);
 assert.match(html,/friendship-brambling-cc-by-sa[.]mp4/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="brambling"/);
 for(const [file,sha] of Object.entries({"public/game-endings/friendship-brambling-cc-by-sa.mp4": "37687bc34d52b4b3228fcfb86cfad7ad9bd65807f74abbab327226e5c8de88c8", "public/game-endings/friendship-brambling-card-logo09.webp": "7674e5eaffc7b14e6193cfcea426bdf088530e128c49687a6dc961afe0657b13"}))
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),sha);
});

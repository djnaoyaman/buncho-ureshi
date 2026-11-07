/** Approved memorial art. The v1 draw is a permanent compatibility contract:
 * never reorder/extend its nine IDs or change the hash/salt/input fields.
 * Bird IDs are unique within a saved garden. epoch/id/bornTick survive renames,
 * succession, import worldId replacement and pre-death backup restoration.
 * This derives a fixed draw without changing saves or consuming game RNG.
 */
const V1_IDS=Object.freeze(["bauhaus", "de-stijl", "art-deco", "streamline-moderne", "scandinavian-modern", "mid-century-modern", "swiss-style", "brutalism", "memphis"]);
export const MEMORIAL_DESIGNS=Object.freeze([
 {
  "id": "bauhaus",
  "title": "バウハウス",
  "file": "memorial-01-modern.png",
  "sha256": "ae49d2865d392d707fbc4c167a9fd11ddb75120462f905f7b87573f8b4a5360e",
  "width": 1536,
  "height": 1024,
  "position": [
   0.41,
   0.43,
   0.46,
   0.5,
   0.918
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/bauhaus.html",
  "linkLabel": "バウハウスをみる"
 },
 {
  "id": "de-stijl",
  "title": "デ・ステイル",
  "file": "memorial-02-modern.png",
  "sha256": "ce76287ad57ad66f0454ec7b74c715fddd5300ff1df637d2ca2709da60853422",
  "width": 1536,
  "height": 1024,
  "position": [
   0.45,
   0.48,
   0.4,
   0.655,
   0.855
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/de-stijl.html",
  "linkLabel": "デ・ステイルをみる"
 },
 {
  "id": "art-deco",
  "title": "アール・デコ",
  "file": "memorial-03-modern.png",
  "sha256": "7fd512fb770ecadcacc6c72f782ab8a177c8a22e8054919d03fa11f9d44201bd",
  "width": 1199,
  "height": 1312,
  "position": [
   0.51,
   0.49,
   0.38,
   0.51,
   0.82
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/art-deco.html",
  "linkLabel": "アール・デコをみる"
 },
 {
  "id": "streamline-moderne",
  "title": "ストリームライン",
  "file": "memorial-04-modern.png",
  "sha256": "9b48d6aac5bf66e9d8a3402d860a394473cb215f7d630bfed695c505761f5be7",
  "width": 1774,
  "height": 887,
  "position": [
   0.29,
   0.46,
   0.55,
   0.695,
   0.7
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/streamline-moderne.html",
  "linkLabel": "ストリームラインをみる"
 },
 {
  "id": "scandinavian-modern",
  "title": "北欧モダン",
  "file": "memorial-05-modern.png",
  "sha256": "568f2d3c6b7cb32fd5a87582e15307204e8ae9a78852cc8546b54e8fcb4b9340",
  "width": 1220,
  "height": 1289,
  "position": [
   0.48,
   0.5,
   0.4,
   0.48,
   0.879
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/scandinavian-modern.html",
  "linkLabel": "北欧モダンをみる"
 },
 {
  "id": "mid-century-modern",
  "title": "ミッドセンチュリー",
  "file": "memorial-06-modern.png",
  "sha256": "4cfc280a9652137cc90a1963d228ab31319ecd3b19fc302056d9bda4af3b9028",
  "width": 1536,
  "height": 1024,
  "position": [
   0.5,
   0.38,
   0.42,
   0.488,
   0.916
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/mid-century-modern.html",
  "linkLabel": "ミッドセンチュリーをみる"
 },
 {
  "id": "swiss-style",
  "title": "スイス・スタイル",
  "file": "memorial-07-modern.png",
  "sha256": "60bd30a1c417f1c2c1d9d6db2df14bd64e934dc2a4ce9cfdd9da438eb7e4c42b",
  "width": 1536,
  "height": 1024,
  "position": [
   0.7,
   0.47,
   0.56,
   0.18,
   0.36
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/swiss-style.html",
  "linkLabel": "スイス・スタイルをみる"
 },
 {
  "id": "brutalism",
  "title": "ブルータリズム",
  "file": "memorial-08-modern.png",
  "sha256": "02ce1332ee30090e1c3316a391028f995ee0d191ebd0fb2bb2265c148fccdbbe",
  "width": 1312,
  "height": 1199,
  "position": [
   0.457,
   0.54,
   0.4,
   0.44,
   0.91
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/brutalism.html",
  "linkLabel": "ブルータリズムをみる"
 },
 {
  "id": "memphis",
  "title": "メンフィス",
  "file": "memorial-09-modern.png",
  "sha256": "12480dfe58807365db8264f54e934c6ce83e3a6e5bbb2d1ab5b53d39b2e18242",
  "width": 1448,
  "height": 1086,
  "position": [
   0.51,
   0.43,
   0.35,
   0.49,
   0.91
  ],
  "sourceURL": "https://djnaoyaman.github.io/design-lineage/entries/memphis.html",
  "linkLabel": "メンフィスをみる"
 }
].map(d=>Object.freeze({...d,position:Object.freeze(d.position)})));
const byId=new Map(MEMORIAL_DESIGNS.map(d=>[d.id,d]));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function memorialDesignId(world,bird){
 const key=JSON.stringify(['memorial-v1',world.epoch,bird.id,bird.bornTick]);
 let hash=0x811c9dc5;
 for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),0x01000193);
 hash=Math.imul(hash^(hash>>>16),0x85ebca6b);
 hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);
 return V1_IDS[((hash^(hash>>>16))>>>0)%9];
}
export function memorialDesignForBird(world,bird){return byId.get(memorialDesignId(world,bird));}
// Reuse the original bird photographs at their native aspect ratio. Do not
// substitute a sample bird/name or let mutable animation poses change a grave.
function portrait(bird){
 const color=['white','sakura','cinnamon','silver'].includes(bird.color)?bird.color:'white';
 const stage=['egg','chick','juvenile','adult'].includes(bird.stage)?bird.stage:'adult';
 const file=stage==='adult'?color:stage==='juvenile'?(color==='sakura'?'juvenile':`juvenile-${color}`):stage;
 const size=stage==='adult'?[1157,1359]:stage==='egg'?[850,1000]:stage==='juvenile'&&color==='white'?[1295,1214]:[1312,1199];
 return {url:new URL(`../game-art/${file}.${stage==='egg'?'svg':'webp'}`,import.meta.url).href,width:size[0],height:size[1]};
}
export function renderMemorialArtwork(design,bird){
 const [bx,by,bh,nx,ny]=design.position,w=design.width,h=design.height;
 const p=portrait(bird),height=h*bh,width=height*p.width/p.height;
 const fit=Math.min(490/w,462/h),swiss=design.id==='swiss-style';
 const fontSize=(swiss?31:16)/fit;
 const name=String(bird.name??''),maxWidth=w*(swiss?.35:design.id==='de-stijl'?.29:design.id==='mid-century-modern'?.22:.36);
 const compress=Array.from(name).length*fontSize>maxWidth?` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`:'';
 const art=new URL(`../game-art/memorial-modern/${design.file}`,import.meta.url).href;
 return `<div class="memorial-artwork" aria-hidden="true"><svg viewBox="0 0 ${w} ${h}" focusable="false" xmlns="http://www.w3.org/2000/svg"><image class="memorial-design-art" href="${art}?v=${design.sha256.slice(0,12)}" width="${w}" height="${h}"/><image class="memorial-bird-art" href="${p.url}" x="${w*bx-width/2}" y="${h*by-height/2}" width="${width}" height="${height}"/><text x="${w*nx}" y="${h*ny+5/fit}" text-anchor="${swiss?'start':'middle'}" fill="${design.id==='brutalism'?'#f8f2e5':'#435647'}" font-size="${fontSize}" font-weight="700"${compress}>${escape(name)}</text></svg></div>`;
}

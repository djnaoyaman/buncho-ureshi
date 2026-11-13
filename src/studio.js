import { trackEvent } from './analytics.js';
import { BRAND_ASSET, BRAND_SIZE } from './visuals.js';
/* Original browser-local Java sparrow atelier. No service calls or image uploads. */
// Muting is an immediate state change, not an asymptotic automation target.
// Cancel queued gain changes so a suspended/resumed context cannot restore them.
export function applyStudioMasterGain(master, audio, muted, volume) {
  if (!master || !audio) return;
  const value = muted ? 0 : Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0)) * .22;
  const time = Math.max(0, Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
  master.gain.cancelScheduledValues(time);
  master.gain.value = value;
  master.gain.setValueAtTime(value, time);
}
export const STUDIO_PALETTES=[
 ['植物園','#f5efdf','#214d40','#739681','#dda9a6'],
 ['さくら','#fff0ec','#71404c','#9dafa1','#d68b9c'],
 ['月の池','#e5eef0','#28445a','#7b9d9c','#b6a3c7'],
 ['たんぽぽ','#fff6d9','#53512d','#869a56','#e2b84d'],
 ['すみれ','#f0eaf7','#514263','#9aa18e','#ac90be'],
 ['あさつゆ','#edf4ea','#36584b','#93b49c','#b9c9e2'],
 ['ゆうやけ','#f9e7da','#754a3a','#9b9b73','#d79270'],
 ['白い花','#fffdfa','#343e3b','#a7b5ac','#d8cbb4']
];
export const STUDIO_ART_BACKGROUNDS=Object.freeze([
 {index:8,name:'アール・ヌーヴォー',file:'art-nouveau.png'},
 {index:9,name:'バウハウス',file:'bauhaus.png'},
 {index:10,name:'琳派',file:'rinpa.png'}
]);
export const STUDIO_BACKGROUNDS=['植物の縁飾り','花のメダリオン','しなやかな帯','木の実の庭','水の波紋','葉の便り','花びらの窓','静かな紙',...STUDIO_ART_BACKGROUNDS.map(x=>x.name)];
export const STUDIO_TEMPLATES=['文鳥ポスター','植物図譜','家族の肖像','孵化のお祝い','お名前の花園','季節の便り'];
const STORE='buncho-ureshi-studio-v1',MAX_ITEMS=36,MAX_PHOTOS=6,HISTORY=50,MAX_SAVE_CHARS=64000;
const STATE_KEYS=new Set(['version','format','background','palette','title','items']);
const ITEM_KEYS=new Set(['id','kind','x','y','w','r','tint','color','birdColor','birdStage','birdName','text','photoId','clip']);
const isRecord=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const boundedText=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),clone=x=>JSON.parse(JSON.stringify(x));
const clean=(s,n=36)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n);
// Canvas and textContent do not interpret markup: keep literal author credits intact.
const plain=s=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ');
const safeURL=s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
function uid(){return globalThis.crypto?.randomUUID?.()||'a-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function item(kind,x,y,w=280,extra={}){return {id:uid(),kind,x,y,w,r:0,tint:0,color:'#739681',...extra};}
export function makeStudioTemplate(index=0,seed={}){
 if(!Number.isInteger(index)||index<0||index>=STUDIO_TEMPLATES.length)index=0;
 if(!isRecord(seed))seed={};
 const birds=Array.isArray(seed.birds)?seed.birds.filter(isRecord).slice(0,5):[];
 const names=(Array.isArray(seed.names)?seed.names.slice(0,5):birds.map(b=>b.name)).map(x=>clean(x,16));
 const title=clean(seed.title||(seed.name?seed.name+'の記念日':names.length?names.join(' と ')+'の記念日':''));
 const s={version:1,format:'square',background:index%8,palette:0,title:title||['文鳥と、花のある日','文鳥の小さな植物園','みんなで、ひとやすみ','ようこそ、小さないのち','おもちの花園','季節をはこぶ文鳥'][index],items:[]};
 const bird=(x,y,w=350,color='white',stage='adult',name='')=>item('bird',x,y,w,{birdColor:['white','sakura','silver','cinnamon','juvenile'].includes(color)?color:'white',birdStage:['egg','chick','juvenile','adult'].includes(stage)?stage:'adult',birdName:clean(name,16)});
 if(index===0)s.items=[item('branch',.5,.7,700),bird(.5,.42,460),item('flower',.19,.23,150),item('flower',.83,.72,130)];
 if(index===1){s.format='portrait';s.background=5;s.palette=5;s.items=[item('branch',.23,.5,650,{r:72}),bird(.57,.42,450),item('text',.57,.78,390,{text:'Lonchura oryzivora',color:'#36584b'}),item('leaf',.8,.16,160,{r:30})];}
 if(index===2){s.background=2;s.palette=2;const family=birds.length?birds:[{color:'white'},{color:'sakura'},{color:'white'}];s.items=[item('branch',.5,.75,850),...family.map((b,i)=>bird((i+1)/(family.length+1),.4+(i%2)*.12,Math.min(300,850/family.length),b.color,b.stage,b.name))];family.forEach((b,i)=>{const name=clean(b.name||names[i],16);if(name)s.items.push(item('text',(i+1)/(family.length+1),.64+(i%2)*.12,Math.min(250,900/family.length),{text:name,color:STUDIO_PALETTES[s.palette][2]}));});}
 if(index===3){s.background=6;s.palette=3;s.items=[item('nest',.5,.65,530),item('egg',.5,.43,210),item('flower',.22,.28,160),item('flower',.79,.31,150),item('ribbon',.5,.84,580)];}
 if(index===4){s.background=1;s.palette=1;s.items=[item('medallion',.5,.45,630),bird(.5,.45,350),item('flower',.17,.75,180),item('flower',.82,.23,180)];}
 if(index===5){s.format='portrait';s.background=3;s.palette=6;s.items=[item('ribbon',.5,.2,760),bird(.43,.48,420),item('branch',.52,.76,800),item('leaf',.8,.57,180,{r:25}),item('flower',.22,.78,170)];}
 if(seed.event||seed.date)s.items.push(item('text',.5,.9,650,{text:clean([seed.event,seed.date].filter(Boolean).join(' · '),48),color:STUDIO_PALETTES[s.palette][2]}));
 return s;
}
export function validateStudioState(v,photoIds=[]){
 const photos=new Set(photoIds),ids=new Set();
 if(!isRecord(v)||Object.keys(v).some(k=>!STATE_KEYS.has(k))||v.version!==1||!['square','portrait'].includes(v.format)||!Number.isInteger(v.background)||v.background<0||v.background>=STUDIO_BACKGROUNDS.length||!Number.isInteger(v.palette)||v.palette<0||v.palette>7||!boundedText(v.title,36)||!Array.isArray(v.items)||v.items.length>MAX_ITEMS)return false;
 for(const o of v.items){if(!isRecord(o)||Object.keys(o).some(k=>!ITEM_KEYS.has(k))||!boundedText(o.id,100)||!o.id.length||ids.has(o.id)||!['bird','photo','branch','leaf','flower','ribbon','medallion','egg','nest','text'].includes(o.kind)||!['x','y','w','r','tint'].every(k=>Number.isFinite(o[k]))||o.x<0||o.x>1||o.y<0||o.y>1||o.w<60||o.w>900||Math.abs(o.r)>360||o.tint<0||o.tint>.8||!/^#[0-9a-f]{6}$/i.test(o.color))return false;ids.add(o.id);if(o.text!==undefined&&!boundedText(o.text,48)||o.birdName!==undefined&&!boundedText(o.birdName,16)||o.birdColor!==undefined&&!['white','sakura','silver','cinnamon','juvenile'].includes(o.birdColor)||o.birdStage!==undefined&&!['egg','chick','juvenile','adult'].includes(o.birdStage)||o.photoId!==undefined&&!boundedText(o.photoId,100)||o.clip!==undefined&&!['rectangle','oval','leaf'].includes(o.clip))return false;if(o.kind==='photo'&&(!boundedText(o.photoId,100)||!photos.has(o.photoId)||(o.clip&&!['rectangle','oval','leaf'].includes(o.clip))))return false;if(o.kind==='text'&&(!boundedText(o.text,48)))return false;if(o.kind==='bird'&&(!['white','sakura','silver','cinnamon','juvenile'].includes(o.birdColor)||(o.birdStage&&!['egg','chick','juvenile','adult'].includes(o.birdStage))||(o.birdName!==undefined&&(!boundedText(o.birdName,16)))))return false;}
 return new Set(v.items.filter(o=>o.kind==='photo').map(o=>o.photoId)).size<=MAX_PHOTOS;
}
function ellipse(c,x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);c.fill();}
function leaf(c,x,y,w,h,r,color){c.save();c.translate(x,y);c.rotate(r);c.fillStyle=color;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-w/2,-h/3,-w/3,-h,0,-h);c.bezierCurveTo(w/2,-h*.7,w/2,-h*.25,0,0);c.fill();c.restore();}
function flower(c,x,y,r,p){c.save();c.translate(x,y);c.fillStyle=p[4];for(let j=0;j<5;j++){c.save();c.rotate(j*Math.PI*2/5);ellipse(c,0,-r*.52,r*.38,r*.64);c.restore();}c.fillStyle=p[1];ellipse(c,0,0,r*.2,r*.2);c.fillStyle=p[2];ellipse(c,0,0,r*.075,r*.075);c.restore();}
function vine(c,x,y,w,h,p,mirror=1){c.save();c.translate(x,y);c.scale(mirror,1);c.strokeStyle=p[3];c.lineWidth=3;c.beginPath();c.moveTo(0,h);c.bezierCurveTo(w,-h*.1,-w*.5,h*.2,w*.25,0);c.stroke();for(let j=0;j<6;j++){const t=j/6;leaf(c,Math.sin(t*5)*w*.22,h*(1-t),w*.32,h*.19,j%2?-.8:.8,p[3]);}flower(c,w*.25,0,w*.17,p);c.restore();}
function drawBird(c,color='white',stage='adult'){
 if(stage==='egg'){c.fillStyle='#fffdf2';c.strokeStyle='#9c9e8a';c.lineWidth=2;c.beginPath();c.ellipse(0,0,24,34,0,0,Math.PI*2);c.fill();c.stroke();return;}
 const sakura=color==='sakura',silver=color==='silver',cinnamon=color==='cinnamon',young=color==='juvenile'||stage==='juvenile'||stage==='chick';
 if(stage==='chick')c.scale(.72,.72);
 c.strokeStyle='#c4746e';c.lineWidth=3;c.lineCap='round';for(const x of [-15,9]){c.beginPath();c.moveTo(x,22);c.lineTo(x-2,46);c.lineTo(x-15,50);c.moveTo(x-2,46);c.lineTo(x+9,49);c.stroke();}
 c.fillStyle=sakura?'#4a5056':silver?'#a3adb1':cinnamon?'#a58e78':color==='juvenile'?'#7d7465':'#d8e0dc';c.beginPath();c.moveTo(-34,0);c.lineTo(-79,26);c.lineTo(-67,9);c.lineTo(-76,4);c.lineTo(-28,-15);c.fill();
 c.fillStyle=sakura?'#9a9ca0':silver?'#d5dadd':cinnamon?'#d8c3aa':color==='juvenile'?'#b6aa92':'#fffefa';ellipse(c,-8,0,46,34,-.15);
 c.fillStyle=sakura?'#6d7379':silver?'#b8c1c4':cinnamon?'#b7a18b':color==='juvenile'?'#928775':'#e8ede7';ellipse(c,-23,-1,29,16,-.25);
 c.fillStyle=sakura?(young?'#77746e':'#262d32'):silver?'#9da7ad':cinnamon?'#927c68':color==='juvenile'?'#a99d85':'#fffefa';ellipse(c,24,-25,26,27,-.1);
 if(sakura||silver||cinnamon){c.fillStyle='#fffdfa';ellipse(c,29,-16,15,13,-.15);}
 c.fillStyle=young?'#655d53':'#d44f58';c.beginPath();c.moveTo(44,-32);c.quadraticCurveTo(60,-30,66,-21);c.quadraticCurveTo(53,-13,43,-18);c.closePath();c.fill();
 c.strokeStyle=young?'#5c544a':'#a73642';c.lineWidth=1;c.beginPath();c.moveTo(47,-25);c.lineTo(65,-21);c.stroke();
 c.fillStyle=young?'#8a7766':'#e46770';ellipse(c,32,-30,6.1,6.1);c.fillStyle='#202a29';ellipse(c,32,-30,3.7,3.7);c.fillStyle='#fff';ellipse(c,33.3,-31.3,1.1,1.1);
}
// Draw the same approved bitmap, with its original palette and aspect ratio.
function logo(c, image) {
 if (!image.complete || !image.naturalWidth) return;
 const w=295,h=w*BRAND_SIZE.height/BRAND_SIZE.width;
 c.save();c.drawImage(image,(1000-w)/2,8,w,h);c.restore();
}
function wrap(c,text,width){const out=[];let line='';for(const ch of String(text)){if(line&&c.measureText(line+ch).width>width){out.push(line);line='';}line+=ch;}if(line)out.push(line);return out;}
function background(c,index,p,H,art=null){
 c.fillStyle=p[1];c.fillRect(0,0,1000,H);
 if(index>=8){if(art?.complete&&art.naturalWidth){const scale=Math.max(1000/art.naturalWidth,H/art.naturalHeight),w=art.naturalWidth*scale,h=art.naturalHeight*scale;c.drawImage(art,(1000-w)/2,(H-h)/2,w,h);}return;}
 c.save();
 if(index===0){vine(c,65,190,155,H-380,p);vine(c,935,190,155,H-380,p,-1);}
 if(index===1){c.strokeStyle=p[3];c.lineWidth=2;for(const d of [0,15]){c.beginPath();c.ellipse(500,H*.49,350+d,H*.32+d,0,0,Math.PI*2);c.stroke();}for(let i=0;i<8;i++){const a=i*Math.PI/4;flower(c,500+355*Math.cos(a),H*.49+H*.325*Math.sin(a),22,p);}}
 if(index===2){c.globalAlpha=.28;c.strokeStyle=p[3];c.lineWidth=95;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-60,270+i*290);c.bezierCurveTo(300,130+i*270,650,600+i*220,1100,250+i*280);c.stroke();}}
 if(index===3){c.globalAlpha=.5;for(let i=0;i<9;i++)vine(c,50+i*115,H*.72,65,H*.2,p,i%2?-1:1);}
 if(index===4){c.strokeStyle=p[3];c.globalAlpha=.34;c.lineWidth=2;for(let i=0;i<15;i++){c.beginPath();c.ellipse(500,H*.67,80+i*48,25+i*18,0,0,Math.PI*2);c.stroke();}}
 if(index===5){c.globalAlpha=.18;for(let y=100;y<H;y+=160)for(let x=60;x<1000;x+=180)leaf(c,x+(y%3)*8,y,70,130,.65,p[3]);}
 if(index===6){c.fillStyle=p[4];c.globalAlpha=.2;for(let i=0;i<8;i++){c.save();c.translate(500,H*.48);c.rotate(i*Math.PI/4);ellipse(c,0,-H*.26,125,H*.22);c.restore();}}
 if(index===7){c.strokeStyle=p[3];c.globalAlpha=.3;c.lineWidth=1;c.beginPath();c.moveTo(45,160);c.bezierCurveTo(250,80,750,230,955,150);c.moveTo(45,H-160);c.bezierCurveTo(250,H-230,750,H-80,955,H-150);c.stroke();}
 c.restore();
}
function shape(c,o,p){
 const col=o.color||p[3];c.save();c.scale(o.w/200,o.w/200);
 if(o.kind==='bird'){c.scale(1.2,1.2);drawBird(c,o.birdColor,o.birdStage||'adult');}
 if(o.kind==='leaf')leaf(c,0,65,90,160,.1,col);
 if(o.kind==='flower')flower(c,0,0,85,[...p.slice(0,4),col]);
 if(o.kind==='branch'){c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.moveTo(-95,30);c.bezierCurveTo(-35,-20,30,60,95,-20);c.stroke();for(let i=0;i<5;i++)leaf(c,-75+i*36,17+Math.sin(i)*8,24,47,i%2?-.7:.6,col);}
 if(o.kind==='ribbon'){c.fillStyle=col;c.beginPath();c.moveTo(-100,-23);c.bezierCurveTo(-35,-65,35,28,100,-23);c.lineTo(85,5);c.lineTo(100,25);c.bezierCurveTo(35,75,-35,-20,-100,25);c.lineTo(-85,0);c.closePath();c.fill();}
 if(o.kind==='medallion'){c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(0,0,90,80,0,0,Math.PI*2);c.stroke();for(let j=0;j<8;j++){const a=j*Math.PI/4;leaf(c,90*Math.cos(a),80*Math.sin(a),17,34,a,col);}}
 if(o.kind==='egg'){c.fillStyle='#fffcf0';c.strokeStyle='#9c9e8a';c.lineWidth=2;c.beginPath();c.moveTo(0,-90);c.bezierCurveTo(65,-83,95,77,0,80);c.bezierCurveTo(-95,77,-65,-83,0,-90);c.fill();c.stroke();}
 if(o.kind==='nest'){c.strokeStyle=col;c.lineWidth=5;for(let i=0;i<8;i++){c.beginPath();c.ellipse(0,i*3,95-i*6,26-i*.8,-.07+i*.02,0,Math.PI);c.stroke();}leaf(c,-65,10,22,60,-.8,p[3]);leaf(c,65,10,22,60,.8,p[3]);}
 c.restore();
}

export function mountStudio(root,{photos=[],birdSvg,seed}={}){
 let destroyed=false,selected=null,undo=[],redo=[],drag=null,prepared=null,exportURL=null,revision=0;
 const sourceURL=s=>{try{if(!boundedText(s,2048)||!s)return '';const u=new URL(s.replace(/^\/photos\//,'photos/'),document.baseURI),folder=new URL('photos/',document.baseURI);return /^https?:$/.test(u.protocol)&&u.origin===location.origin&&!u.username&&!u.password&&u.pathname.startsWith(folder.pathname)&&/\.(?:webp|png|jpe?g)$/i.test(u.pathname)?u.href:'';}catch{return '';}};
 const seenPhotos=new Set();
 const safePhotos=(Array.isArray(photos)?photos:[]).filter(p=>{if(!isRecord(p)||p.artAllowed!==true||!boundedText(p.id,100)||!p.id||seenPhotos.has(p.id)||!boundedText(p.author,512)||!p.author||!boundedText(p.license,32)||!/^(CC0|CC BY (2\.0|3\.0|4\.0))$/.test(p.license)||!boundedText(p.source,2048)||!boundedText(p.licenseUrl,2048)||!safeURL(p.source)||!safeURL(p.licenseUrl)||!sourceURL(p.src)||['title','credit','modifications','alt'].some(k=>p[k]!==undefined&&!boundedText(p[k],1024)))return false;seenPhotos.add(p.id);return true;}).map(p=>({...p,src:sourceURL(p.src),author:plain(p.author),license:plain(p.license),credit:plain(p.credit),source:safeURL(p.source),licenseUrl:safeURL(p.licenseUrl)}));
 const photoMap=new Map(safePhotos.map(p=>[p.id,p])),images=new Map();
 let state=makeStudioTemplate(seed?2:0,seed),invalidSaved=false;
 try{const raw=localStorage.getItem(STORE);if(raw!==null){const saved=typeof raw==='string'&&raw.length<=MAX_SAVE_CHARS?JSON.parse(raw):null;if(validateStudioState(saved,safePhotos.map(p=>p.id))){if(seed)undo.push(saved);else state=saved;}else invalidSaved=true;}}catch{invalidSaved=true;}
 selected=state.items.at(-1)?.id??null;
 const abort=new AbortController(),signal=abort.signal;
 root.innerHTML='<section class="studio" aria-label="文鳥アート工房">'
 +'<div class="studio-intro"><p class="studio-kicker">BUNCHO BOTANICAL ATELIER</p><h2>文鳥アート工房</h2><p>かたちをえらんで、動かして。世界にひとつの文鳥の庭をつくろう。</p></div>'
 +'<section class="studio-audio studio-music-intro" aria-labelledby="studio-music-heading"><div><h3 id="studio-music-heading">作る前に、音楽をえらぼう</h3><p>好きな音楽をえらんで、聴きながらつくってね。音なしでもつくれます。</p><p class="studio-small">工房のためのオリジナル合成音です。文鳥の本物の鳴き声ではありません。</p></div><div class="studio-music-controls"><label>音楽<select data-studio="music"><option value="0">花のワルツ</option><option value="1">朝のしずく</option><option value="2">月の温室</option></select></label><div class="studio-edit-row"><button type="button" data-action="play">音楽を再生</button><button type="button" data-action="stop">音楽をオフ</button></div>'
 +'<label>音量<input type="range" min="0" max="100" value="25" data-studio="volume"></label><div class="studio-edit-row"><button type="button" data-action="mute" aria-pressed="false">ミュート</button><button type="button" data-action="sfx" aria-pressed="false">操作音をつける</button></div><p class="studio-small" data-studio="audio-status" role="status">再生を押すまで音は出ません。</p></div></section>'
 +'<nav class="studio-steps" aria-label="工房の目次"><a href="#studio-templates">① お手本</a><a href="#studio-materials">② そざい</a><a href="#studio-tools">③ 動かす</a><a href="#studio-save">④ 保存</a></nav>'
 +'<div class="studio-layout"><div class="studio-preview"><div class="studio-canvas-wrap"><canvas width="1000" height="1000" data-studio="canvas" tabindex="0" aria-label="作品。矢印キーで選んだ素材を移動、Deleteで削除。Tabで素材一覧へ。"></canvas></div>'
 +'<p class="studio-canvas-hint">動かすときは作品の上をドラッグ。ページをめくるときは作品の外をなぞってね。</p>'
 +'<div class="studio-history"><button type="button" data-action="undo">↶ もどす</button><button type="button" data-action="redo">↷ やりなおす</button><button type="button" data-action="reset">作り直す</button></div>'
 +'<p class="studio-status" role="status" aria-live="polite" data-studio="status">お手本から、すぐにつくれます。</p>'
 +'<section id="studio-tools" class="studio-tools"><h3>③ えらんだものを動かす</h3><label>素材をえらぶ<select data-studio="layers" aria-label="作品内の素材"></select></label><p data-studio="selected" class="studio-selected"></p>'
 +'<div class="studio-move"><button type="button" data-action="left" aria-label="左へ移動">← 左</button><button type="button" data-action="up" aria-label="上へ移動">↑ 上</button><button type="button" data-action="down" aria-label="下へ移動">↓ 下</button><button type="button" data-action="right" aria-label="右へ移動">右 →</button></div>'
 +'<label>大きさ<input type="range" min="60" max="900" step="10" data-studio="size"><output data-studio="size-value"></output></label><label>回転<input type="range" min="-180" max="180" step="5" data-studio="rotation"><output data-studio="rotation-value"></output></label>'
 +'<div class="studio-edit-row"><button type="button" data-action="smaller">小さく</button><button type="button" data-action="larger">大きく</button><button type="button" data-action="rotate-left">左回り</button><button type="button" data-action="rotate-right">右回り</button></div>'
 +'<label>素材の色<input type="color" data-studio="color" value="#739681"></label><label>写真の色を重ねる<input type="range" min="0" max="0.8" step="0.1" data-studio="tint"><output data-studio="tint-value"></output></label><label>写真の切り抜き<select data-studio="clip"><option value="rectangle">四角い写真</option><option value="oval">まるい切り抜き</option><option value="leaf">葉っぱの切り抜き</option></select></label>'
 +'<div class="studio-edit-row"><button type="button" data-action="back">ひとつ後ろ</button><button type="button" data-action="front">ひとつ前</button><button type="button" data-action="duplicate">コピー</button><button type="button" data-action="delete">消す</button></div>'
 +'<p class="studio-small">写真の色を変えた作品はアートです。図鑑の羽色とは区別してね。</p></section>'
 +'<section id="studio-save" class="studio-save"><h3>④ 作品を保存しよう</h3><label>かたち<select data-studio="format"><option value="square">正方形（1400 × 1400）</option><option value="portrait">縦長（1400 × 1750）</option></select></label><button type="button" class="studio-primary" data-action="export">画像をつくる・保存</button>'
 +'<p class="studio-small">画像には作品名・ロゴ・写真のクレジットも入ります。音楽は入りません。</p><div data-studio="export-panel" hidden><img data-studio="export-preview" alt="保存する完成作品"><a data-studio="download" download="buncho-art.png">PNG画像を保存</a><button type="button" data-action="share">画像を共有</button><p data-studio="share-help" class="studio-small"></p></div></section>'
 +'</div><aside class="studio-options" aria-label="作品の材料と設定">'
 +'<section id="studio-templates"><h3>① お手本をえらぶ</h3><div data-studio="templates" class="studio-template-grid"></div></section>'
 +'<section><h3>背景といろ</h3><div class="studio-art-backgrounds" data-studio="art-backgrounds" role="group" aria-label="3つのアート背景"></div><label>すべての背景<select data-studio="background"></select></label><div class="studio-palettes" data-studio="palettes" aria-label="配色"></div><p class="studio-small" data-studio="palette-name"></p><label>作品のタイトル<input type="text" data-studio="title" maxlength="36" autocomplete="off"></label><button type="button" data-action="title">タイトルを入れる</button></section>'
 +'<section id="studio-materials"><h3>② そざいをふやす</h3><p class="studio-small">写真は一般の文鳥です。実在のおもち本人の写真ではありません。</p><div class="studio-material-grid" data-studio="shapes"></div><details class="studio-photo-details"><summary>文鳥の写真をえらぶ</summary><div class="studio-photo-grid" data-studio="photos"></div></details>'
 +'<label>短いことば<input type="text" data-studio="text" maxlength="48" placeholder="おたんじょうび おめでとう" autocomplete="off"></label><button type="button" data-action="text">ことばを追加</button><button type="button" data-action="apply-text">選んだことばを変更</button><p class="studio-small">素材は36個、写真は6種類まで。一部の素材は自由に色を変えられます。</p></section>'

 +'<details class="studio-help"><summary>あそび方・保存と写真のきまり</summary><p>お手本を選んだあと、素材をさわって動かします。下のボタンでも同じことができます。素材一覧で選び、矢印キーでも動かせます。もどす・やりなおすは50回まで。作り直す操作も「もどす」で取り消せます。</p>'
 +'<p>作品はこのブラウザ内に自動保存します。他の端末とは自動で同期しません。個人情報を書かず、完成した画像を手元に保存してね。共有ボタンは使える端末だけ表示されます。使えない場合は画像を保存してから共有できます。</p>'
 +'<p>図鑑写真の作者と利用条件を完成画像の下に入れます。共有するときも切り取らずに残してください。工房にはCC BYまたはCC0の写真だけを使っています。作者・元写真・ライセンスのリンクを残して共有してください。写真の出典・条件は素材台帳でも読めます。</p></details>'
 +'</aside></div></section>';
 const q=s=>root.querySelector(s),el=n=>q('[data-studio="'+n+'"]'),btn=n=>q('[data-action="'+n+'"]'),on=(target,type,fn)=>target.addEventListener(type,fn,{signal});
 root.querySelectorAll('.studio-steps a').forEach(a=>a.setAttribute('href',location.pathname+location.search+a.getAttribute('href')));
 const canvas=el('canvas'),ctx=canvas.getContext('2d');
 if(!ctx){root.textContent='この環境では画像を描く機能が使えません。別のブラウザで工房を開いてください。';return()=>{};}
 trackEvent('studio_open',{site_area:'studio',source:seed?'game':'direct'});
 let editTracked=false;
 const noteEdit=()=>{if(!editTracked){editTracked=true;trackEvent('studio_edit_start',{site_area:'studio'});}};
 const tell=t=>{if(!destroyed)el('status').textContent=t;},current=()=>state.items.find(o=>o.id===selected);
 const artBackgroundImages=new Map();
 function getArtBackground(index){
  const data=STUDIO_ART_BACKGROUNDS.find(x=>x.index===index);if(!data)return null;
  if(artBackgroundImages.has(index))return artBackgroundImages.get(index);
  const img=new Image();img.decoding='async';img.onload=()=>{if(!destroyed)draw();};img.onerror=()=>{if(!destroyed&&state.background===index)tell('背景を読み込めませんでした。通信を確かめて選び直してください。');};
  img.src=new URL('studio-backgrounds/'+data.file,document.baseURI).href;artBackgroundImages.set(index,img);return img;
 }
 const brandImage=new Image();brandImage.decoding='async';
 brandImage.onload=()=>{if(!destroyed)draw();};
 brandImage.onerror=()=>{if(!destroyed)tell('ロゴを読み込めません。通信を確かめて、もう一度開いてください。');};
 brandImage.src=new URL(BRAND_ASSET,document.baseURI).href;

 function persist(){if(invalidSaved)return;try{localStorage.setItem(STORE,JSON.stringify(state));}catch{tell('この端末では自動保存できません。「画像をつくる・保存」で残してください。');}}
 function remember(){undo.push(clone(state));if(undo.length>HISTORY)undo.shift();redo=[];}
 function invalidate(){revision++;prepared=null;el('export-panel').hidden=true;if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}}
 function edit(fn,msg='作品を変えました。'){if(drag)finishDrag({pointerId:drag.pointer});remember();fn();noteEdit();invalidate();refresh();persist();tone('change');tell(msg);}
 function label(o){if(o.kind==='photo')return photoMap.get(o.photoId)?.alt||'文鳥の写真';if(o.kind==='text')return 'ことば「'+o.text+'」';return {bird:(o.birdName?o.birdName+' · ':'')+({white:'白文鳥',sakura:'桜文鳥',silver:'シルバー文鳥',cinnamon:'シナモン文鳥',juvenile:'幼鳥'}[o.birdColor]||'文鳥')+' · '+({egg:'卵',chick:'ひな',juvenile:'幼鳥',adult:'成鳥'}[o.birdStage||'adult'])+'のイラスト',branch:'葉の枝',leaf:'ひとひらの葉',flower:'花',ribbon:'曲線の帯',medallion:'花のメダリオン',egg:'たまご',nest:'巣'}[o.kind]||'素材';}
 function getImage(pid){if(images.has(pid))return images.get(pid);const p=photoMap.get(pid);if(!p)return null;const img=new Image();img.decoding='async';img.onload=()=>{if(!destroyed)draw();};img.onerror=()=>{if(!destroyed)tell('読み込めない写真があります。通信を確かめて、もう一度開いてください。');};img.src=p.src;images.set(pid,img);return img;}
 function creditLines(c){
  const used=[...new Set(state.items.filter(o=>o.kind==='photo').map(o=>o.photoId))],lines=[];c.save();c.font='11px sans-serif';
  used.forEach((pid,i)=>{const p=photoMap.get(pid);if(!p)return;const changed=state.items.some(o=>o.photoId===pid&&o.tint>0);let source=p.source;try{source=decodeURI(source);}catch{}
   const credit='['+(i+1)+'] '+(p.title?plain(p.title)+' / ':'')+p.author+(p.credit&&p.credit!==p.author?' / '+p.credit:'')+' / '+p.license+' / '+source+' / '+p.licenseUrl+' / '+(changed?'配置・切り取り・回転・色調整':'配置・切り取り・回転')+'（元写真からの変更）'+(p.modifications?' / 素材準備: '+plain(p.modifications):'');lines.push(...wrap(c,credit,900));});
  c.restore();return lines;
 }
 function layout(c=ctx){const H=state.format==='portrait'?1250:1000,lines=creditLines(c),requiredFooter=80+lines.length*14,overflow=requiredFooter>H-509,footer=overflow?108:requiredFooter,height=H-footer-249;return {H,lines:overflow?['クレジットが長いため画像を作れません。写真を減らしてから保存してください。']:lines,footer,overflow,top:235,bottom:H-footer-14,height,fit:Math.min(1,height/620)};}
 function dimensions(o,L){let h=o.w;if(o.kind==='photo'){const img=getImage(o.photoId);h=img?.naturalWidth?o.w*img.naturalHeight/img.naturalWidth:o.w*.72;h=o.clip&&o.clip!=='rectangle'?o.w:Math.min(h,o.w*1.6);}else if(o.kind==='text')h=o.w*.16*Math.ceil(o.text.length/12);else if(['branch','ribbon','nest'].includes(o.kind))h=o.w*.35;else if(o.kind==='bird')h=o.w*.72;return {w:o.w*L.fit,h:h*L.fit};}
 function position(o,L){const d=dimensions(o,L),rad=Math.min(Math.hypot(d.w,d.h)/2,Math.min(470,L.height/2));return {x:clamp(o.x*1000,rad+10,990-rad),y:clamp(L.top+o.y*L.height,L.top+rad,L.bottom-rad),...d};}
 function drawItem(c,o,L,selection){
  const p=STUDIO_PALETTES[state.palette],pos=position(o,L);c.save();c.translate(pos.x,pos.y);c.rotate(o.r*Math.PI/180);
  if(o.kind==='photo'){const img=getImage(o.photoId);c.fillStyle='#fffdfa';if(!o.clip||o.clip==='rectangle')c.fillRect(-pos.w/2-5,-pos.h/2-5,pos.w+10,pos.h+10);
   if(img?.complete&&img.naturalWidth){c.save();c.beginPath();if(o.clip==='oval')c.ellipse(0,0,pos.w/2,pos.h/2,0,0,Math.PI*2);else if(o.clip==='leaf'){c.moveTo(-pos.w/2,pos.h/2);c.bezierCurveTo(-pos.w*.7,-pos.h*.6,pos.w*.4,-pos.h*.7,pos.w/2,-pos.h/2);c.bezierCurveTo(pos.w*.7,pos.h*.6,-pos.w*.4,pos.h*.7,-pos.w/2,pos.h/2);}else c.rect(-pos.w/2,-pos.h/2,pos.w,pos.h);c.clip();const ratio=pos.w/pos.h,iw=img.naturalWidth,ih=img.naturalHeight,cw=iw/ih>ratio?ih*ratio:iw,ch=iw/ih>ratio?ih:iw/ratio;c.drawImage(img,(iw-cw)/2,(ih-ch)/2,cw,ch,-pos.w/2,-pos.h/2,pos.w,pos.h);if(o.tint){c.globalAlpha=o.tint;c.fillStyle=o.color;c.fillRect(-pos.w/2,-pos.h/2,pos.w,pos.h);}c.restore();}
   else{c.fillStyle=p[2];c.font='18px sans-serif';c.textAlign='center';c.fillText('写真を読みこみ中',0,0);}
  }else if(o.kind==='text'){c.fillStyle=o.color;c.font='600 '+Math.max(14,pos.w/13)+'px "Noto Serif JP", "Yu Mincho", serif';c.textAlign='center';c.textBaseline='middle';const lines=wrap(c,o.text,pos.w);lines.forEach((t,i)=>c.fillText(t,0,(i-(lines.length-1)/2)*pos.w/10));}
  else shape(c,{...o,w:pos.w},p);
  if(selection){c.strokeStyle='#ba5d48';c.lineWidth=3;c.setLineDash([8,6]);c.strokeRect(-pos.w/2-8,-pos.h/2-8,pos.w+16,pos.h+16);c.setLineDash([]);c.fillStyle='#ba5d48';for(const x of [-pos.w/2-8,pos.w/2+8])for(const y of [-pos.h/2-8,pos.h/2+8])c.fillRect(x-4,y-4,8,8);}c.restore();
 }
 function draw(c=ctx,selection=true){
  const L=layout(c),p=STUDIO_PALETTES[state.palette];if(c===ctx&&canvas.height!==L.H)canvas.height=L.H;background(c,state.background,p,L.H,getArtBackground(state.background));logo(c,brandImage);
  c.fillStyle=p[2];c.font='500 35px "Noto Serif JP", "Yu Mincho", serif';c.textAlign='center';c.textBaseline='middle';let size=35;while(c.measureText(state.title).width>880&&size>20)c.font='500 '+(--size)+'px "Noto Serif JP", "Yu Mincho", serif';c.fillText(state.title,500,202);
  c.save();c.beginPath();c.rect(0,L.top,1000,L.height);c.clip();state.items.forEach(o=>drawItem(c,o,L,selection&&o.id===selected));c.restore();c.fillStyle=p[1];c.fillRect(0,L.H-L.footer,1000,L.footer);c.strokeStyle=p[3];c.lineWidth=1;c.beginPath();c.moveTo(50,L.H-L.footer+8);c.lineTo(950,L.H-L.footer+8);c.stroke();
  c.fillStyle=p[2];c.textAlign='left';c.textBaseline='top';c.font='13px sans-serif';c.fillText('文鳥アート工房 ｜ 文鳥♬文鳥♬文鳥って嬉しいな♪',50,L.H-L.footer+19);c.font='11px sans-serif';c.fillText('写真の色・構図の加工を含むアート作品です。実在のおもちの写真ではありません。',50,L.H-L.footer+39);
  L.lines.forEach((t,i)=>c.fillText(t,50,L.H-L.footer+57+i*14));if(!L.lines.length)c.fillText('オリジナルの文鳥・植物イラスト。作品は端末内で制作され、投稿・送信されません。',50,L.H-L.footer+57);return L;
 }
 function refresh(){
  draw();const o=current();el('layers').replaceChildren();state.items.forEach((it,i)=>{const option=document.createElement('option');option.value=it.id;option.textContent=(i+1)+'. '+label(it);el('layers').append(option);});if(o)el('layers').value=o.id;
  el('selected').textContent=o?label(o):'そざいをえらんでね';el('size').value=o?.w||280;el('rotation').value=o?.r||0;el('color').value=o?.color||STUDIO_PALETTES[state.palette][3];el('tint').value=o?.tint||0;
  el('size-value').textContent=o?Math.round(o.w/10)+'%':'';el('rotation-value').textContent=o?o.r+'°':'';el('tint-value').textContent=o?.kind==='photo'?Math.round(o.tint*100)+'%':'';
  for(const n of ['size','rotation','color'])el(n).disabled=!o;el('color').disabled=!o||['bird','egg'].includes(o.kind);el('tint').disabled=o?.kind!=='photo';el('clip').disabled=o?.kind!=='photo';el('clip').value=o?.clip||'rectangle';btn('apply-text').disabled=o?.kind!=='text';for(const n of ['left','right','up','down','smaller','larger','rotate-left','rotate-right','back','front','duplicate','delete'])btn(n).disabled=!o;
  btn('undo').disabled=!undo.length;btn('redo').disabled=!redo.length;el('format').value=state.format;el('background').value=String(state.background);el('title').value=state.title;el('palette-name').textContent=STUDIO_PALETTES[state.palette][0];el('art-backgrounds').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.artBackground)===state.background)));el('palettes').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.palette)));
 }
 function add(o){
  if(state.items.length>=MAX_ITEMS){tell('そざいは36個まで。いらないものを消してから入れてね。');return;}
  if(o.kind==='photo'&&!state.items.some(x=>x.photoId===o.photoId)&&new Set(state.items.filter(x=>x.kind==='photo').map(x=>x.photoId)).size>=MAX_PHOTOS){tell('写真は6種類まで。クレジットを読みやすく残すための上限です。');return;}
  edit(()=>{state.items.push(o);selected=o.id;},label(o)+'を追加しました。');tone('add');trackEvent('studio_material_add',{site_area:'studio',material_type:o.kind});
 }
 STUDIO_TEMPLATES.forEach((name,i)=>{
  const b=document.createElement('button');b.type='button';b.className='studio-template';b.dataset.template=String(i);const mini=document.createElement('canvas');mini.width=160;mini.height=160;mini.setAttribute('aria-hidden','true');const saved=state;state=makeStudioTemplate(i);const mc=mini.getContext('2d');mc.scale(.16,.16);background(mc,state.background,STUDIO_PALETTES[state.palette],1000);mc.translate(500,510);mc.scale(2.6,2.6);drawBird(mc,i===2?'sakura':'white');state=saved;
  const text=document.createElement('span');text.textContent=name;b.append(mini,text);on(b,'click',()=>edit(()=>{state=makeStudioTemplate(i,seed||{});selected=state.items.at(-1)?.id;},name+'を開きました。前の作品は「もどす」で戻せます。'));el('templates').append(b);
 });
 STUDIO_ART_BACKGROUNDS.forEach(data=>{const b=document.createElement('button');b.type='button';b.dataset.artBackground=String(data.index);b.setAttribute('aria-pressed',String(state.background===data.index));const img=new Image();img.src=new URL('studio-backgrounds/'+data.file,document.baseURI).href;img.alt='';img.loading='lazy';img.width=1254;img.height=1254;const text=document.createElement('span');text.textContent=data.name;b.append(img,text);on(b,'click',()=>edit(()=>{state.background=data.index;},data.name+'の背景にしました。'));el('art-backgrounds').append(b);});
 STUDIO_BACKGROUNDS.forEach((name,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=name;el('background').append(option);});
 STUDIO_PALETTES.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.style.background='linear-gradient(135deg,'+p[1]+' 0 45%,'+p[3]+' 45% 75%,'+p[4]+' 75%)';b.setAttribute('aria-label',p[0]+'の配色');b.title=p[0];on(b,'click',()=>edit(()=>{state.palette=i;state.items.filter(o=>!['photo','bird','egg'].includes(o.kind)).forEach(o=>o.color=o.kind==='flower'?p[4]:p[3]);},p[0]+'のいろにしました。'));el('palettes').append(b);});
 const materials=[['bird','白文鳥','white'],['bird','桜文鳥','sakura'],['bird','幼鳥','juvenile'],['bird','シルバー','silver'],['bird','シナモン','cinnamon'],['branch','葉の枝'],['flower','お花'],['leaf','葉っぱ'],['ribbon','曲線の帯'],['medallion','花の輪'],['nest','巣'],['egg','たまご']];
 materials.forEach(([kind,name,color])=>{const b=document.createElement('button');b.type='button';b.textContent='＋ '+name;b.dataset.material=kind+(color?'-'+color:'');on(b,'click',()=>add(item(kind,.5,.5,kind==='branch'?600:300,{birdColor:color||'white',color:kind==='flower'?STUDIO_PALETTES[state.palette][4]:STUDIO_PALETTES[state.palette][3]})));el('shapes').append(b);});
 safePhotos.forEach(p=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',p.alt+'を追加');b.dataset.photo=p.id;const img=new Image();img.src=p.src;img.alt=p.alt;img.loading='lazy';img.decoding='async';const span=document.createElement('span');span.textContent=String(p.alt).slice(0,28);b.append(img,span);on(b,'click',()=>add(item('photo',.5,.5,420,{photoId:p.id})));el('photos').append(b);});
 if(!safePhotos.length){const note=document.createElement('p');note.textContent='この環境では工房用写真を読み込めませんでした。イラストと図形は使えます。';el('photos').append(note);}
 on(el('layers'),'change',()=>{const next=el('layers').value;if(drag)finishDrag({pointerId:drag.pointer});selected=next;if(current()?.kind==='text')el('text').value=current().text;refresh();});
 on(el('background'),'change',()=>edit(()=>state.background=Number(el('background').value),'背景を変えました。'));
 on(el('format'),'change',()=>edit(()=>state.format=el('format').value,'作品のかたちを変えました。'));
 on(btn('title'),'click',()=>edit(()=>state.title=clean(el('title').value),'タイトルを入れました。'));on(el('title'),'keydown',e=>{if(e.key==='Enter')btn('title').click();});
 on(btn('text'),'click',()=>{const t=clean(el('text').value,48).trim();if(t)add(item('text',.5,.5,480,{text:t,color:STUDIO_PALETTES[state.palette][2]}));else tell('入れたいことばを書いてね。');});
 on(el('clip'),'change',()=>{if(current()?.kind==='photo')edit(()=>current().clip=el('clip').value,'写真を切り抜きました。');});
 on(btn('apply-text'),'click',()=>{const t=clean(el('text').value,48).trim();if(current()?.kind==='text'&&t)edit(()=>current().text=t,'選んだことばを変えました。');else tell('変えたいことばを入力してね。');});
 for(const [key,prop] of [['size','w'],['rotation','r'],['color','color'],['tint','tint']])on(el(key),'change',()=>{if(current())edit(()=>current()[prop]=prop==='color'?el(key).value:Number(el(key).value));});
 const transform=(fn,msg)=>{if(current())edit(()=>fn(current()),msg);};
 for(const [name,dx,dy]of [['left',-.035,0],['right',.035,0],['up',0,-.035],['down',0,.035]])on(btn(name),'click',()=>transform(o=>{o.x=clamp(o.x+dx,0,1);o.y=clamp(o.y+dy,0,1);},'場所を動かしました。'));
 for(const [name,delta]of [['smaller',-30],['larger',30]])on(btn(name),'click',()=>transform(o=>o.w=clamp(o.w+delta,60,900),'大きさを変えました。'));
 for(const [name,delta]of [['rotate-left',-15],['rotate-right',15]])on(btn(name),'click',()=>transform(o=>o.r=((o.r+delta+540)%360)-180,'回転しました。'));
 for(const [name,delta]of [['back',-1],['front',1]])on(btn(name),'click',()=>{const index=state.items.findIndex(o=>o.id===selected),next=clamp(index+delta,0,state.items.length-1);if(index>=0&&index!==next)edit(()=>{[state.items[index],state.items[next]]=[state.items[next],state.items[index]];},'重なり順を変えました。');});
 on(btn('duplicate'),'click',()=>{if(current())add({...clone(current()),id:uid(),x:clamp(current().x+.05,0,1),y:clamp(current().y+.05,0,1)});});
 on(btn('delete'),'click',()=>{if(current())edit(()=>{state.items=state.items.filter(o=>o.id!==selected);selected=state.items.at(-1)?.id??null;},'素材を消しました。「もどす」で戻せます。');});
 on(btn('undo'),'click',()=>{if(drag)finishDrag({pointerId:drag.pointer});if(!undo.length)return;redo.push(clone(state));state=undo.pop();selected=state.items.at(-1)?.id;invalidate();refresh();persist();tone('undo');tell('ひとつ前にもどりました。');});
 on(btn('redo'),'click',()=>{if(drag)finishDrag({pointerId:drag.pointer});if(!redo.length)return;undo.push(clone(state));state=redo.pop();selected=state.items.at(-1)?.id;invalidate();refresh();persist();tone('add');tell('やりなおしました。');});
 on(btn('reset'),'click',()=>{if(drag)finishDrag({pointerId:drag.pointer});if(!confirm('作品をまっさらにして、作り直しますか？\nやめると今の作品を残します。作り直したあとも「もどす」で戻せます。')){tell('作り直すのをやめました。作品はそのままです。');return;}invalidSaved=false;edit(()=>{state=makeStudioTemplate(0);state.items=[];state.title='わたしの文鳥アート';selected=null;},'まっさらな作品にしました。「もどす」で戻せます。');});
 function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*1000/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
 function hit(p){const L=layout();return [...state.items].reverse().find(o=>{const d=position(o,L),a=-o.r*Math.PI/180,x=p.x-d.x,y=p.y-d.y;return Math.abs(x*Math.cos(a)-y*Math.sin(a))<=d.w/2+12&&Math.abs(x*Math.sin(a)+y*Math.cos(a))<=d.h/2+12;});}
 on(canvas,'pointerdown',e=>{if(e.button>0||drag)return;const p=point(e),o=hit(p);if(!o){selected=null;refresh();return;}selected=o.id;if(o.kind==='text')el('text').value=o.text;refresh();const L=layout(),pos=position(o,L);drag={pointer:e.pointerId,itemId:o.id,start:clone(state),x:p.x,y:p.y,ox:pos.x/1000,oy:(pos.y-L.top)/L.height,moved:false};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});e.preventDefault();});
 on(canvas,'pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const o=state.items.find(o=>o.id===drag.itemId);if(!o)return;const p=point(e),L=layout();if(Math.hypot(p.x-drag.x,p.y-drag.y)<=3&&!drag.moved)return;const x=clamp(drag.ox+(p.x-drag.x)/1000,0,1),y=clamp(drag.oy+(p.y-drag.y)/L.height,0,1);if(o.x===x&&o.y===y)return;drag.moved=true;o.x=x;o.y=y;invalidate();draw();});
 function finishDrag(e,cancel=false){if(!drag||e.pointerId!==drag.pointer)return;const finished=drag;drag=null;if(cancel){state=finished.start;invalidate();refresh();tell('移動を取り消しました。');}else if(finished.moved){noteEdit();undo.push(finished.start);if(undo.length>HISTORY)undo.shift();redo=[];invalidate();refresh();persist();tone('move');tell('素材を動かしました。');}if(canvas.hasPointerCapture?.(finished.pointer))canvas.releasePointerCapture(finished.pointer);}
 on(canvas,'pointerup',e=>finishDrag(e));on(canvas,'pointercancel',e=>finishDrag(e,true));on(canvas,'lostpointercapture',e=>{if(drag)finishDrag(e,true);});
 on(canvas,'keydown',e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Delete:'delete',Backspace:'delete'};if(map[e.key]){e.preventDefault();btn(map[e.key]).click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();btn(e.shiftKey?'redo':'undo').click();}});
 async function loadNeeded(){await Promise.all([brandImage,...(state.background>=8?[getArtBackground(state.background)]:[]),...[...new Set(state.items.filter(o=>o.kind==='photo').map(o=>o.photoId))].map(getImage)].map(img=>new Promise((resolve,reject)=>{if(!img){reject(new Error('photo'));return;}let timer,settled=false;const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);img.removeEventListener('load',loaded);img.removeEventListener('error',failed);signal.removeEventListener('abort',cancelled);error?reject(new Error(img===brandImage&&error==='photo'?'brand':error)):resolve();},loaded=()=>{if(!img.naturalWidth){finish('photo');return;}try{Promise.resolve(typeof img.decode==='function'?img.decode():undefined).then(()=>finish(),()=>finish('photo'));}catch{finish('photo');}},failed=()=>finish('photo'),cancelled=()=>finish('cancelled');timer=setTimeout(()=>finish('timeout'),15000);signal.addEventListener('abort',cancelled,{once:true});if(signal.aborted){cancelled();return;}if(img.complete)loaded();else{img.addEventListener('load',loaded,{once:true});img.addEventListener('error',failed,{once:true});}})));}
 on(btn('export'),'click',async()=>{
  if(drag)finishDrag({pointerId:drag.pointer});const ticket=revision;btn('export').disabled=true;tell('写真と文字をたしかめて、画像をつくっています。');
  try{await loadNeeded();if(document.fonts?.ready)await document.fonts.ready;if(destroyed)return;if(ticket!==revision)throw new Error('changed');if(layout().overflow)throw new Error('credits');
   const out=document.createElement('canvas');out.width=1400;out.height=state.format==='portrait'?1750:1400;const c=out.getContext('2d');c.scale(1.4,1.4);draw(c,false);
   const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('encode')),'image/png'));if(destroyed)return;if(ticket!==revision)throw new Error('changed');
   if(exportURL)URL.revokeObjectURL(exportURL);prepared=blob;exportURL=URL.createObjectURL(blob);el('export-preview').src=exportURL;el('download').href=exportURL;el('download').download='buncho-'+state.format+'.png';el('export-panel').hidden=false;
   let share=false;try{share=!!navigator.canShare?.({files:[new File([blob],'buncho-art.png',{type:'image/png'})]});}catch{}btn('share').hidden=!share;el('share-help').textContent=share?'共有先は次の画面でえらべます。':'このブラウザでは直接共有に対応していません。「PNG画像を保存」で保存してから共有してね。';
   trackEvent('studio_export',{site_area:'studio',format:state.format});
   tell('画像ができました。クレジットまで入っています。「PNG画像を保存」を押してね。');tone('save');
  }catch(e){tell(e.message==='changed'?'作品が変わりました。もう一度「画像をつくる・保存」を押してください。':e.message==='credits'?'写真のクレジットが長すぎて、読みやすく入りません。写真を減らすか、縦長にして保存してください。':e.message==='brand'?'採用ロゴを読み込めず、画像を作れませんでした。通信を確かめて、もう一度開いてください。':'写真をすべて読み込めず、画像を作れませんでした。通信を確かめるか、読み込めない写真を消してやりなおしてください。');}
  finally{if(!destroyed)btn('export').disabled=false;}
 });
 on(el('download'),'click',()=>{if(prepared)trackEvent('studio_download',{site_area:'studio',format:state.format});});
 on(btn('share'),'click',async()=>{if(!prepared)return;try{await navigator.share({files:[new File([prepared],'buncho-art.png',{type:'image/png'})],title:state.title||'文鳥アート工房'});trackEvent('studio_share',{site_area:'studio',format:state.format});tell('共有画面を閉じました。');}catch(e){tell(e.name==='AbortError'?'共有を取り消しました。作品はそのままです。':'この環境では共有できません。「PNG画像を保存」を使ってください。');}});
 let audio=null,master=null,musicTimer=null,noteIndex=0,muted=false,sfx=false,volume=.25;const oscillators=new Set();
 function audioReady(){try{if(!audio){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)throw new Error('no audio');audio=new AC();master=audio.createGain();applyStudioMasterGain(master,audio,muted,volume);master.connect(audio.destination);}if(audio.state==='suspended')audio.resume().catch(()=>{});return true;}catch{el('audio-status').textContent='この環境は音の再生に対応していません。作品づくりは使えます。';return false;}}
 function playNote(freq,duration=.3,delay=0,type='sine',gain=.25){if(!audio||!master)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);oscillators.add(o);o.start(t);o.stop(t+duration+.05);o.onended=()=>{oscillators.delete(o);o.disconnect();g.disconnect();};}
 function tone(name){if(!sfx||!audio)return;const notes={add:[659,880],change:[523],move:[440],undo:[392,330],save:[523,659,784]};(notes[name]||[523]).forEach((f,i)=>playNote(f,.2,i*.075,'sine',.18));}
 function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}for(const o of oscillators){try{o.stop();}catch{}}oscillators.clear();noteIndex=0;el('audio-status').textContent='音楽を停止しました。';btn('play').textContent='音楽を再生';}
 function musicStep(){const melodies=[[60,64,67,69,67,64,62,65,69,71,69,65],[72,67,74,69,76,72,67,69],[48,55,60,62,55,64,60,55]],which=Number(el('music').value),m=melodies[which],n=m[noteIndex%m.length];playNote(440*2**((n-69)/12),which===2?1.5:.7,0,which===1?'sine':'triangle',.18);if(noteIndex%3===0)playNote(440*2**((n-81)/12),1.1,0,'sine',.14);noteIndex++;}
 on(btn('play'),'click',()=>{if(!audioReady())return;stopMusic();musicStep();musicTimer=setInterval(musicStep,Number(el('music').value)===2?800:450);btn('play').textContent='はじめから再生';el('audio-status').textContent=el('music').selectedOptions[0].text+'を再生中。';});
 on(btn('stop'),'click',()=>{stopMusic();if(audio&&!sfx)audio.suspend().catch(()=>{});});on(el('music'),'change',()=>{stopMusic();el('audio-status').textContent='曲をえらびました。再生を押すと始まります。';});
 on(el('volume'),'input',()=>{volume=Number(el('volume').value)/100;applyStudioMasterGain(master,audio,muted,volume);});
 on(btn('mute'),'click',()=>{muted=!muted;applyStudioMasterGain(master,audio,muted,volume);btn('mute').setAttribute('aria-pressed',String(muted));btn('mute').textContent=muted?'音をもどす':'ミュート';el('audio-status').textContent=muted?'すべての音をミュートしました。':'ミュートを解除しました。';});
 on(btn('sfx'),'click',()=>{if(!sfx&&!audioReady())return;sfx=!sfx;btn('sfx').setAttribute('aria-pressed',String(sfx));btn('sfx').textContent=sfx?'操作音を消す':'操作音をつける';el('audio-status').textContent=sfx?'操作に合わせた合成音が鳴ります。':'操作音を消しました。';tone('add');});
 on(document,'visibilitychange',()=>{if(document.hidden){stopMusic();if(audio)audio.suspend().catch(()=>{});}else if(audio&&sfx)audio.resume().catch(()=>{});});
 refresh();persist();if(invalidSaved)tell('以前の保存を読み込めませんでした。元のデータは上書きせず残しています。今の作品はPNGで保存できます。「作り直す」を確認すると端末の保存を置き換えます。');else if(seed)tell('ゲームの記念カードをつくりました。前の作品は「もどす」で戻せます。');
 return()=>{destroyed=true;abort.abort();if(musicTimer)clearInterval(musicTimer);if(audio)audio.close().catch(()=>{});if(exportURL)URL.revokeObjectURL(exportURL);images.forEach(img=>{img.onload=null;img.onerror=null;});artBackgroundImages.forEach(img=>{img.onload=null;img.onerror=null;});};
}

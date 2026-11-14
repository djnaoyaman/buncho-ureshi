// Add an isolated editorial layer AFTER the unchanged legacy/game build.
// Never rewrite an existing runtime/asset file: /game keeps its exact document and dependency graph.
import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PAGE_CATALOG,BASE_PATH} from '../src/metadata.js';
import {photos} from '../src/data/photos.js';
import {articles} from '../src/data/articles.js';
import {quizzes} from '../src/data/quizzes.js';
import {esc} from '../src/visuals.js';
import {renderHome} from '../site/home.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(await readFile('site/game-protected-baseline.json','utf8'));
async function assertGame(){for(const [path,expected]of Object.entries(baseline.files)){if(hash(await readFile('dist/'+path))!==expected)throw Error('Protected game/shared output changed: '+path);}}
await assertGame();
await mkdir('dist/site',{recursive:true});
for(const file of ['home.js','renewal.css','hero.webp','feather.svg','brush.svg'])await cp('site/'+file,'dist/site/'+file);
const assetVersions=Object.fromEntries(await Promise.all(['hero.webp','feather.svg','brush.svg'].map(async file=>[file,hash(await readFile('site/'+file)).slice(0,12)])));
const versionAssets=html=>html.replace(/site\/(hero\.webp|feather\.svg|brush\.svg)(?![?\w])/g,(_,file)=>`site/${file}?v=${assetVersions[file]}`);
const css=await readFile('site/renewal.css'),home=await readFile('site/home.js');
const version=hash(Buffer.concat([css,home,await readFile('site/hero.webp')])).slice(0,12);
let app=await readFile('dist/src/app.js','utf8');
app=app.replace(/from ["']\.\/home\.js(?:\?[^"']*)?["']/,`from "../site/home.js?v=${version}"`);
await writeFile('dist/src/site-app.js',app);
const legacyHomeVersion=hash(await readFile('dist/src/home.js')).slice(0,12);
await writeFile('dist/site/home.js',versionAssets(home.toString().replace('../src/home.js',`../src/home.js?v=${legacyHomeVersion}`)));
const url=(p='')=>BASE_PATH+p;
const image=id=>{const p=photos.find(p=>p.id===id)||photos[0];return `<img src="${url(p.src.replace(/^\//,''))}" alt="${esc(p.alt)}" width="960" height="720" loading="lazy">`;};
const original=await readFile('dist/index.html','utf8');
const atlas=original.match(/<section class="section art-atlas-section"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
for(const route of [...PAGE_CATALOG.map(p=>p[0]),'404.html'].filter(p=>p!=='game/')){
 const path='dist/'+(route.endsWith('.html')?route:route+'index.html');let html=await readFile(path,'utf8');
 html=html.replace('<html lang="ja"','<html data-site-renewal="1" lang="ja"').replace('</head>',`<link rel="stylesheet" href="site/renewal.css?v=${version}"></head>`).replace(/src="src\/app\.js\?([^\"]*)"/,(_,query)=>`src="src/site-app.js?${query}-${version}"`);
 if(route==='')html=html.replace(/(<div class="art-static-home" data-static-content>)[\s\S]*?(<\/div><noscript>)/,`$1${renderHome({photos,articles,quizzes,url,image,atlasDoor:()=>atlas,esc})}$2`);
 await writeFile(path,versionAssets(html));
}
await assertGame();
console.log(`Renewed ${PAGE_CATALOG.length-1} non-game pages + 404. ${Object.keys(baseline.files).length} protected game/shared files byte-identical.`);

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {PAGE_CATALOG,routeMetadata} from '../src/metadata.js';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {Window} from 'happy-dom';
import {articles} from '../src/data/articles.js';
import {SITE_NAME} from '../src/visuals.js';

const origin='https://djnaoyaman.github.io',base='/buncho-ureshi/';
const routes=['','encyclopedia/','body/','omochi/','challenge/','studio/','game/','credits/','help/'];
async function page(route){
  const file=route==='404.html'?'404.html':route+'index.html';
  const html=await readFile(new URL('../dist/'+file,import.meta.url),'utf8');
  const window=new Window({url:origin+base+route,settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  window.document.write(html);return {window,document:window.document,html};
}
function textOf(document,markup){const node=document.createElement('div');node.innerHTML=markup;return node.textContent;}

test('all generated pages have exact formal name and subpath canonical/OGP metadata',async()=>{
  const all=[...routes,...articles.map(a=>`encyclopedia/${a.id}/`)];
  const sitemap=await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
  for(const route of all){
    const {window,document:d}=await page(route);
    try {
      assert.ok(d.title.endsWith(SITE_NAME),route);
      assert.equal(d.querySelector('meta[property="og:title"]').content,d.title,route);
      assert.equal(d.querySelector('meta[property="og:site_name"]').content,SITE_NAME,route);
      assert.equal(d.querySelector('link[rel="canonical"]').getAttribute('href'),origin+base+route,route);
      assert.equal(d.querySelector('meta[property="og:url"]').content,origin+base+route,route);
      assert.ok(d.querySelector('meta[name="description"]').content.length>10,route);
      assert.equal(d.querySelector('base').getAttribute('href'),base,route);
      assert.equal(d.querySelector('meta[name="apple-mobile-web-app-title"]').content,route === 'game/' ? '文鳥ぐらし' : SITE_NAME);
      assert.equal(d.querySelector('#ruby-toggle'),null);
      assert.equal(d.documentElement.dataset.ruby,'on');
      assert.equal(d.querySelector('meta[name="robots"]').content,'index, follow, max-image-preview:large',route);
      assert.ok(sitemap.includes(`<loc>${origin+base+route}</loc>`),route);
      assert.equal(d.querySelectorAll('main h1').length,1,route);
      assert.ok(d.querySelector('main [data-static-content]'),route);
      assert.equal(d.querySelector('main h1').closest('noscript'),null,route);
      assert.equal(d.querySelector('noscript article'),null,route);
    }finally{await window.happyDOM.close();}
  }
});

test('article body, deeper explanations, source links and dates are visible static HTML',async()=>{
  for(const article of articles){
    const {window,document:d}=await page(`encyclopedia/${article.id}/`);
    try {
      const content=d.querySelector('main [data-static-content] article');
      assert.ok(content,article.id);
      assert.ok(content.textContent.includes(textOf(d,article.body)),article.id+' body');
      assert.ok(content.textContent.includes(textOf(d,article.deep)),article.id+' deep');
      assert.ok(content.textContent.includes(article.checkedAt),article.id+' date');
      for(const source of article.sources){
        assert.ok(content.textContent.includes(source.title),article.id+' source title');
        if(source.url)assert.ok([...content.querySelectorAll('a')].some(a=>a.getAttribute('href')===source.url),article.id+' source URL');
      }
      if(article.photos.length)assert.ok(content.querySelector('img[alt]'),article.id+' photo');
    }finally{await window.happyDOM.close();}
  }
});

test('main-route static introductions are specific, linked and truthful before JavaScript runs',async()=>{
  const terms={'':'写真でまず見る','encyclopedia/':'情報源','body/':'耳の穴','omochi/':'ご家族が提供した、おもち本人の写真を掲載しています','challenge/':'正解の解説','studio/':'正方形や縦長','game/':'近い血縁同士は繁殖せず','credits/':'写真の作者と利用条件','help/':'端末間では自動同期しません'};
  for(const route of routes){
    const {window,document:d}=await page(route);
    try {
      const content=d.querySelector('[data-static-content]');
      if (route === 'game/') {
        // Game entry now intentionally presents its startup shell, not a site
        // introduction. Keep the static title and a usable recovery action.
        assert.equal(content.querySelector('h1 img').alt,'おもちの文鳥ぐらし');
        assert.ok(content.querySelector('[role=status]').textContent.includes('ひらいています'));
        assert.equal(content.querySelector('.game-startup a').getAttribute('href'),base+'game/');
        assert.ok(content.querySelector('noscript').textContent.includes('JavaScript'));
      } else {
        assert.ok(content.textContent.includes(terms[route]),route);
        assert.ok(content.querySelectorAll('a').length>=3,route);
      }
      assert.equal(content.closest('noscript'),null,route);
    }finally{await window.happyDOM.close();}
  }
});

test('404 HTML has a real canonical, noindex and an ordinary home link',async()=>{
  const {window,document:d}=await page('404.html');
  try {
    assert.equal(d.querySelector('link[rel=canonical]').getAttribute('href'),origin+base+'404.html');
    assert.equal(d.querySelector('meta[name=robots]').content,'noindex, follow');
    assert.ok(d.querySelector('[data-static-content]').textContent.includes('ページがありません'));
    assert.ok([...d.querySelectorAll('main a')].some(a=>a.getAttribute('href')===base));
    assert.equal(d.querySelector('main h1').closest('noscript'),null);
  }finally{await window.happyDOM.close();}
});

test('local HTTP server serves friendly 404 HTML at unknown subpaths with status 404',async(t)=>{
  const cwd=new URL('..',import.meta.url);
  const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null){child.kill();await once(child,'exit');}});
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('local server did not start')),5000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('local server exited: '+code));});
    child.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+\/buncho-ureshi\//);if(match){clearTimeout(timer);resolve(match[0]);}});
  });
  const missing=await fetch(url+'missing-page/deep/');
  assert.equal(missing.status,404);
  assert.match(missing.headers.get('content-type'),/^text\/html/);
  const html=await missing.text();assert.match(html,/ページが見つかりません/);assert.match(html,/noindex, follow/);assert.ok(html.includes(`href="${base}"`));
  const home=await fetch(url);assert.equal(home.status,200);assert.ok((await home.text()).includes(SITE_NAME));
  const article=await fetch(url+'encyclopedia/beak/');assert.equal(article.status,200);assert.ok((await article.text()).includes('data-static-content'));
});

test('Launch Package explicit social cards, structured data, security and image dimensions cover every generated URL', async()=>{
  for(const [route, description, title, article] of PAGE_CATALOG){
    const {window,document:d,html}=await page(route);
    try{
      const meta=routeMetadata(route);
      assert.equal(d.querySelector('meta[name="twitter:card"]').content,'summary_large_image');
      assert.equal(d.querySelector('meta[name="twitter:title"]').content,meta.title);
      assert.equal(d.querySelector('meta[name="twitter:description"]').content,description);
      assert.equal(d.querySelector('meta[name="twitter:image"]').content,meta.imageURL);
      for(const selector of ['meta[name="twitter:image:alt"]','meta[property="og:image:alt"]'])assert.equal(d.querySelector(selector).content,meta.imageAlt);
      assert.equal(d.querySelector('meta[property="og:image:type"]').content,'image/png');
      assert.equal(d.querySelector('meta[name="referrer"]').content,'strict-origin-when-cross-origin');
      const csp=d.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
      assert.match(csp,/script-src 'self'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/base-uri 'self'/);assert.match(csp,/form-action 'self'/);
      assert.doesNotMatch(csp,/unsafe-eval|frame-ancestors/);
      assert.match(d.querySelector('meta[name="viewport"]').content,/viewport-fit=cover/);
      assert.deepEqual(JSON.parse(d.querySelector('#site-jsonld').textContent),meta.structuredData);
      const graph=meta.structuredData['@graph'];
      assert.equal(graph.find(n=>n['@type']==='WebSite').name,SITE_NAME);
      assert.equal(graph.find(n=>n['@type']==='WebPage').url,meta.canonical);
      if(article){const a=graph.find(n=>n['@type']==='Article');assert.equal(a.headline,article.title);assert.equal(a.dateModified,article.checkedAt);assert.deepEqual(a.citation,article.sources.filter(s=>s.url).map(s=>s.url));assert.equal(graph.find(n=>n['@type']==='BreadcrumbList').itemListElement.at(-1).item,meta.canonical);}
      for(const img of d.querySelectorAll('img')){assert.ok(Number(img.getAttribute('width'))>0);assert.ok(Number(img.getAttribute('height'))>0);assert.ok(img.getAttribute('alt'));}
      for(const a of d.querySelectorAll('a[target="_blank"]')){assert.ok(a.rel.includes('noopener'));assert.ok(a.rel.includes('noreferrer'));}
      assert.equal(d.querySelectorAll('a[href^="http:"]').length,0);
      assert.equal(d.querySelectorAll('script[src^="src/analytics-loader.js"]').length,1);
      assert.match(csp,/https:\/\/www\.googletagmanager\.com/);
      assert.ok(Buffer.byteLength(html)<180000,'static HTML budget: '+route);
    }finally{await window.happyDOM.close();}
  }
});

test('Launch Package manifest, PNG/ICO sizes, safe mask and existing OGP artwork are real files',async()=>{
  const asset=async name=>readFile(new URL('../dist/'+name,import.meta.url));
  const dimensions=buffer=>{assert.equal(buffer.subarray(1,4).toString(),'PNG');return [buffer.readUInt32BE(16),buffer.readUInt32BE(20)];};
  for(const [name,size] of [['favicon-16.png',16],['favicon-32.png',32],['favicon-48.png',48],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]])assert.deepEqual(dimensions(await asset(name)),[size,size],name);
  assert.deepEqual(dimensions(await asset('ogp.png')),[1200,630]);
  assert.ok((await asset('ogp.png')).length<200000);
  const ico=await asset('favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
  assert.deepEqual([ico[6],ico[22],ico[38]],[16,32,48]);
  const mask=(await asset('safari-pinned-tab.svg')).toString();assert.match(mask,/viewBox="0 0 128 128"/);assert.doesNotMatch(mask,/<script|<image|#[a-fA-F0-9]{3,6}/);
  const manifest=JSON.parse(await asset('manifest.webmanifest'));
  assert.equal(manifest.name,SITE_NAME);assert.equal(manifest.short_name,SITE_NAME);assert.equal(manifest.lang,'ja');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');assert.equal(manifest.display,'standalone');
  assert.deepEqual(new Set(manifest.icons.map(i=>i.purpose)),new Set(['any','maskable']));
  for(const icon of manifest.icons){const [w,h]=dimensions(await asset(icon.src));assert.equal(icon.sizes,`${w}x${h}`);assert.equal(icon.type,'image/png');}
  const {window,document:d}=await page('404.html');
  try{for(const link of d.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"],link[rel="manifest"]'))assert.ok((await asset(link.getAttribute('href'))).length);}finally{await window.happyDOM.close();}
});

test('Launch Package sitemap and LLM files reflect actual current articles without invented private Omochi facts',async()=>{
  const read=name=>readFile(new URL('../dist/'+name,import.meta.url),'utf8');
  const sitemap=await read('sitemap.xml'),short=await read('llms.txt'),full=await read('llms-full.txt'),robots=await read('robots.txt');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls.length,PAGE_CATALOG.length);assert.equal(new Set(urls).size,urls.length);
  assert.ok(urls.every(u=>u.startsWith(origin+base)&&!u.includes('?')&&!u.includes('404')));
  assert.equal([...sitemap.matchAll(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)].length,urls.length);
  for(const text of [short,full]){assert.ok(text.startsWith('# '+SITE_NAME));assert.match(text,/ご家族が提供した、おもち本人の写真を掲載しています/);assert.match(text,/Google Analyticsでページ閲覧と操作の利用状況を計測/);assert.match(text,/保証しません/);assert.doesNotMatch(text,/<ruby>|<rt>/);}
  for(const a of articles){assert.ok(short.includes(`${origin+base}encyclopedia/${a.id}/`));assert.ok(full.includes('## '+a.title));assert.ok(full.includes('情報確認日: '+a.checkedAt));for(const source of a.sources)assert.ok(full.includes(source.title));}
  assert.match(robots,/host root/);assert.match(robots,/Sitemap: https:\/\/djnaoyaman.github.io\/buncho-ureshi\/sitemap.xml/);
  assert.equal(routeMetadata('',{query:'保存'}).robots,'noindex, follow');assert.equal(routeMetadata('',{query:'保存'}).canonical,origin+base);
  assert.equal(routeMetadata('unknown/').robots,'noindex, follow');assert.equal(routeMetadata('unknown/').canonical,origin+base+'unknown/');
});

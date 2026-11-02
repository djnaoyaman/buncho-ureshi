import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
      assert.equal(d.querySelector('meta[name="robots"]'),null,route);
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
  const terms={'':'写真でまず見る','encyclopedia/':'情報源','body/':'耳の穴','omochi/':'本人の写真や観察エピソードは未提供','challenge/':'正解の解説','studio/':'正方形や縦長','game/':'近い血縁同士は繁殖せず','credits/':'写真の作者と利用条件','help/':'端末間では自動同期しません'};
  for(const route of routes){
    const {window,document:d}=await page(route);
    try {
      const content=d.querySelector('[data-static-content]');
      assert.ok(content.textContent.includes(terms[route]),route);
      assert.ok(content.querySelectorAll('a').length>=3,route);
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

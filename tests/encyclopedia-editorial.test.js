import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {articles} from '../site/articles.js';
import {photos,birdVideo} from '../src/data/photos.js';
import {BASE_PATH} from '../src/metadata.js';
import {esc} from '../src/visuals.js';
import {chapters,renderEncyclopedia,renderEncyclopediaChapters,renderArticleBase,renderEditorialArticle} from '../site/encyclopedia.js';
const ctx={articles,photos,birdVideo,esc,url:p=>BASE_PATH+p};
function parse(html){const window=new Window();window.document.body.innerHTML=html;return window.document;}
const normalize=text=>(text||'').replace(/\s+/g,' ').trim();
const text=html=>normalize(parse(html).body.textContent);
const render=a=>renderEditorialArticle(a,renderArticleBase(a,ctx),ctx);

test('editorial six chapters cover all 37 canonical article destinations without invented categories',()=>{
 const html=renderEncyclopedia(ctx).replace('<div id="article-grid"></div>',`<div id="article-grid">${renderEncyclopediaChapters(ctx)}</div>`),doc=parse(html);
 assert.equal(articles.length,37);assert.equal(doc.querySelectorAll('.encyclopedia-chapter').length,6);
 assert.deepEqual(new Set(chapters.map(c=>c[0])),new Set(articles.map(a=>a.category)));
 for(const a of articles)assert.ok(doc.querySelector(`a[href="${ctx.url(`encyclopedia/${a.id}/`)}"]`),a.id);
 for(const id of ['article-search','result-count','article-grid'])assert.equal(doc.querySelectorAll(`#${id}`).length,1);
 assert.equal(doc.querySelector('[data-category="favorites"]').textContent,'♡ お気に入り');
 assert.match(doc.querySelector('.editorial-colophon').textContent,/生成写真は使用していません/);
});

test('every editorial article preserves original text, glossary, research sources and canonical related links',()=>{
 for(const a of articles){
  const doc=parse(render(a));assert.equal(doc.querySelector('.encyclopedia-story').dataset.story,a.id);
  assert.equal(doc.querySelectorAll('h1').length,1);assert.equal(doc.querySelector('h1').textContent,a.title);
  for(const id of ['favorite','speak','stop-speak','first','basic',...(a.id==='omochi'?[]:['deep','sources'])])assert.equal(doc.querySelectorAll(`#${id}`).length,1,`${a.id}/${id}`);
  for(const [id,html] of [['basic',a.body],...(a.id==='omochi'?[]:[['deep',a.deep]])])assert.ok(normalize(doc.querySelector(`#${id}`).textContent).includes(text(html)),`${a.id}/${id} retains prose`);
  assert.ok(normalize(doc.querySelector('#first').textContent).includes(text(a.summary)),a.id);
  for(const term of a.terms||[]){assert.ok(doc.querySelector('.glossary').textContent.includes(term.term));assert.ok(doc.querySelector('.glossary').textContent.includes(term.reading));assert.ok(doc.querySelector('.glossary').textContent.includes(term.meaning));}
  for(const s of a.sources){assert.ok(doc.querySelector('#sources').textContent.includes(s.title));if(s.url)assert.ok([...doc.querySelectorAll('#sources a')].some(el=>el.getAttribute('href')===s.url),`${a.id}: ${s.url}`);}
  for(const id of a.related||[])assert.ok(doc.querySelector(`.related-links a[href="${ctx.url(`encyclopedia/${id}/`)}"]`),`${a.id}: related ${id}`);
  if(a.id==='omochi'){assert.equal(doc.querySelector('#sources'),null);assert.equal(doc.querySelector('#deep'),null);}else assert.ok(doc.querySelector('#sources').textContent.includes(a.checkedAt||'2026-11-02'));
  if(['voice','courtship'].includes(a.id))assert.equal(doc.querySelectorAll('video source').length,2);
 }
});

test('crop photos retain original source coordinates, attribution and a direct license trail',()=>{
 for(const a of articles){
  const doc=parse(render(a));
  for(const crop of doc.querySelectorAll('svg.editorial-photo')){
   const image=crop.querySelector('image'),p=photos.find(p=>ctx.url(p.src.slice(1))===image.getAttribute('href'));
   assert.ok(p,`${a.id}: crop points at catalogued real photo`);
   const [x,y,width,height]=crop.getAttribute('viewBox').split(' ').map(Number);
   assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=p.width&&y+height<=p.height,`${a.id}: crop stays in source`);
   assert.match(crop.getAttribute('aria-label'),/部分拡大/);
   assert.ok(crop.closest('figure').querySelector('figcaption').textContent.includes(p.credit));
   const links=[...doc.querySelectorAll('#sources a')].map(a=>a.getAttribute('href'));
   assert.ok(links.includes(p.source),`${a.id}: original source`);
   assert.ok(links.includes(p.licenseUrl)||links.includes(p.licenseUrl.replace(/^http:\/\/creativecommons\.org\//,'https://creativecommons.org/')),`${a.id}: license`);
  }
 }
});

test('Omochi uses the family photograph and is never presented as an unrelated stock bird',()=>{
 const article=articles.find(a=>a.id==='omochi'),doc=parse(render(article));
 assert.ok(doc.querySelector('img[src$="omochi/omochi-original.jpeg"]'));
 assert.equal(doc.querySelector('#sources'),null);
 assert.doesNotMatch(doc.body.textContent,/おもち本人ではありません|制作依頼書/);
 assert.match(doc.querySelector('figcaption').textContent,/ご家族の提供写真/);
});

test('prerendered encyclopedia and all articles exactly match their shared runtime renderer',async()=>{
 const list=parse(await readFile('dist/encyclopedia/index.html','utf8'));
 const expectedList=parse(renderEncyclopedia(ctx).replace('<div id="article-grid"></div>',`<div id="article-grid">${renderEncyclopediaChapters(ctx)}</div>`));
 assert.equal(list.querySelector('.encyclopedia-editorial')?.outerHTML,expectedList.querySelector('.encyclopedia-editorial').outerHTML);
 for(const a of articles){
  const staticDoc=parse(await readFile(`dist/encyclopedia/${a.id}/index.html`,'utf8'));
  assert.equal(staticDoc.querySelector('.encyclopedia-story')?.outerHTML,parse(render(a)).querySelector('.encyclopedia-story').outerHTML,a.id);
 }
});

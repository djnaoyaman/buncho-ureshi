import test from 'node:test';
import assert from 'node:assert/strict';
import {articles} from '../site/articles.js';
test('omochi introduction uses approved natural copy and author link',()=>{
 const body=articles.find(a=>a.id==='omochi').body;
 assert.match(body,/<a href="https:\/\/djnaoyaman.github.io\/">作者<\/a>の娘と暮らす/);
 assert.equal(body.replace(/<rt>.*?<\/rt>/g,'').replace(/<[^>]*>/g,''),'おもちは、作者の娘と暮らす、白文鳥の女の子です。');
});
import {renderArticleBase} from '../site/encyclopedia.js';
import {photos,birdVideo} from '../src/data/photos.js';
import {esc} from '../src/visuals.js';
import {readFile} from 'node:fs/promises';
test('omochi introduction removes internal production notes and empty research sections',async()=>{
 const a=articles.find(a=>a.id==='omochi');
 assert.equal(a.deep,'');
 const html=renderArticleBase(a,{articles,photos,birdVideo,esc,url:p=>'/buncho-ureshi/'+p});
 const built=await readFile('dist/encyclopedia/omochi/index.html','utf8');
 for(const output of [html,built]){
  assert.doesNotMatch(output,/まだ提供されていません|写真ごとの許可|制作依頼書|id="deep"|href="#deep"|id="sources"|href="#sources"/);
  assert.match(output,/<a href="https:\/\/djnaoyaman.github.io\/">作者<\/a>の娘と暮らす/);
 }
});

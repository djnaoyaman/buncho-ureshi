import test from 'node:test';
import assert from 'node:assert/strict';
import {articles} from '../src/data/articles.js';
test('omochi introduction uses approved natural copy and author link',()=>{
 const body=articles.find(a=>a.id==='omochi').body;
 assert.match(body,/<a href="https:\/\/djnaoyaman.github.io\/">作者<\/a>の娘と暮らす/);
 assert.equal(body.replace(/<rt>.*?<\/rt>/g,'').replace(/<[^>]*>/g,''),'おもちは、作者の娘と暮らす、白文鳥の女の子です。');
});

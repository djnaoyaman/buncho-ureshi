import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {Window} from 'happy-dom';
import {gardenFriendActionIllustrations} from '../src/garden-friend-action-art.js';
import {gardenFriendActionArt,renderGardenFriendCards} from '../src/garden-friend-cards.js';
import {GARDENS} from '../src/data/gardens.js';
test('22 new implementation SVGs exactly match their fixtures, safe geometry contracts and 48/76px clear padding',async()=>{
 assert.equal(Object.keys(gardenFriendActionIllustrations).length,22);
 for(const [key,svg] of Object.entries(gardenFriendActionIllustrations)){
 const source=readFileSync(new URL(`./fixtures/garden-friend-action-art/${key}.svg`,import.meta.url),'utf8').trim();
 assert.equal(svg,source.replace('<svg ','<svg aria-hidden="true" focusable="false" '));
 assert.match(svg,/viewBox="0 0 96 96"/);assert.match(svg,/stroke="#52604D" stroke-width="2.4"/);
 assert.doesNotMatch(svg,/<(?:script|foreignObject|image|use|defs)\b|\bid=|\bhref=|\bon\w+=/);
 for(const size of [48,76]){
 const {data,info}=await sharp(Buffer.from(svg)).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=size,minY=size,maxX=0,maxY=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[(y*size+x)*info.channels+3]>10){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 assert.ok(minX>=1&&minY>=1&&maxX<size-1&&maxY<size-1,`${key} at ${size}: paint touches edge`);
 }
 }
});
test('all36 controls have exact garden-specific mapping, visible actual label and decorative nonempty SVG',()=>{
 const window=new Window();try{let count=0;for(const g of GARDENS){
 const model={gardenId:g.id,gardenName:g.name,friends:[{friendId:'test',name:'文鳥',affinity:2,personality:'庭の友達',portraitFile:'white.webp',memories:[],actions:g.actions.map(([kind,label])=>({kind,label,disabled:false}))}]};
 window.document.body.innerHTML=renderGardenFriendCards(model);
 for(const [i,[kind,label]] of g.actions.entries()){
 const button=window.document.querySelectorAll('button')[i];assert.equal(button.dataset.gardenFriendAction,kind);assert.equal(button.querySelector('span').textContent,label);assert.equal(button.querySelector('svg').getAttribute('aria-hidden'),'true');
 const key=gardenFriendActionArt(g.id,kind);assert.equal(key,kind==='chat'?'chat':g.id==='kazaguruma'?(kind==='watch'?'windmill':'pose'):`${g.id}-${kind}`);count++;
 }
 }assert.equal(count,36);}finally{window.happyDOM.close();}
});

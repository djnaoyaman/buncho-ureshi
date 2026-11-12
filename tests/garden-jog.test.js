import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountGardenJog} from '../src/garden-jog.js';
function fixture(t,items=[{id:'a',name:'最初の庭'},{id:'b',name:'長い名前の庭'},{id:'c',name:'最後の庭'}]){
 const win=new Window(),root=win.document.body;
 root.innerHTML='<div class="finch-garden-selector-wrap"><button data-garden-scroll="previous"></button><nav data-garden-jog><div class="garden-jog-cylinder"><span data-jog-before></span><button data-jog-center></button><span data-jog-after></span></div><small data-jog-count></small></nav><button data-garden-scroll="next"></button></div>';
 let current='a',busy=false;const arrivals=[];
 const jog=mountGardenJog(root,{items,getCommitted:()=>current,isBusy:()=>busy,onCommit:id=>arrivals.push(id)});jog.refresh();
 t.after(()=>{jog.destroy();win.happyDOM.close();});
 return {win,root,jog,arrivals,face:root.querySelector('nav'),center:root.querySelector('[data-jog-center]'),key:key=>root.querySelector('[data-jog-center]').dispatchEvent(new win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})),setCurrent:id=>{current=id;jog.refresh();},setBusy:value=>{busy=value;jog.refresh();}};
}
test('candidate changes wrap but never commit until center activation; refresh retains candidate',t=>{
 const f=fixture(t);f.key('ArrowUp');assert.equal(f.face.dataset.preview,'c');assert.deepEqual(f.arrivals,[]);
 f.jog.refresh();assert.equal(f.face.dataset.preview,'c');f.key('Home');assert.equal(f.face.dataset.preview,'a');f.key('End');f.center.click();assert.deepEqual(f.arrivals,['c']);
 f.setCurrent('c');f.center.click();assert.equal(f.arrivals.length,1);f.root.querySelector('[data-garden-scroll="next"]').click();assert.equal(f.face.dataset.preview,'a');assert.match(f.center.getAttribute('aria-label'),/1 \/ 3/);
});
test('busy and empty/singleton lists cannot navigate or arrive',t=>{
 const f=fixture(t);f.setBusy(true);f.key('ArrowDown');assert.equal(f.face.dataset.preview,'a');f.center.click();assert.deepEqual(f.arrivals,[]);
 for(const items of [[],[{id:'a',name:'ひとつ'}]]){const x=fixture(t,items);x.key('ArrowDown');x.center.click();assert.deepEqual(x.arrivals,[]);}
});
test('drag and cancel suppress accidental click and release listeners on destruction',t=>{
 const f=fixture(t),pointer=(type,y,target=f.face)=>target.dispatchEvent(new f.win.PointerEvent(type,{pointerId:1,clientY:y,button:0,bubbles:true,cancelable:true}));
 pointer('pointerdown',100);pointer('pointermove',50);pointer('pointercancel',50);f.center.click();assert.deepEqual(f.arrivals,[]);assert.equal(f.face.style.getPropertyValue('--jog-angle'),'0deg');
 f.jog.destroy();const before=f.face.dataset.preview;f.key('ArrowDown');assert.equal(f.face.dataset.preview,before);
});

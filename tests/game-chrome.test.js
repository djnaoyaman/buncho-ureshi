import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorldChrome} from '../src/game-chrome.js';
function fixture(){
 const window=new Window();const doc=window.document;
 doc.write('<html><head><base href="/buncho-ureshi/"></head><body><header class="site-header"><a id="brand" href="/buncho-ureshi/" aria-label="Original top"><img src="approved-alpha.png" width="200"></a><button id="menu-toggle" aria-label="メニューをひらく" aria-expanded="false"><span>menu</span></button><div id="menu" hidden><nav><a href="/buncho-ureshi/credits/">出典</a><a href="/buncho-ureshi/help/">ヘルプ</a></nav><form id="site-search"></form></div></header><main></main><footer class="site-footer"><nav class="footer-links"><a href="/buncho-ureshi/colors/">色</a><a href="/buncho-ureshi/credits/">出典と素材</a><a href="https://github.com/djnaoyaman/buncho-ureshi">ソースコード</a></nav><section class="page-tools"><button id="page-share">共有</button><button id="page-copy-url">コピー</button></section><div class="footer-bottom"><span>著作権と写真の帰属</span></div></footer></body></html>');
 return{window,doc};
}
test('world shell moves existing tools and legal nodes, retains logo pixels, and exactly restores site chrome',async()=>{
 const {window,doc}=fixture();const footer=doc.querySelector('.site-footer'),footerBefore=footer.innerHTML,brand=doc.querySelector('#brand'),logo=brand.firstElementChild,logoBefore=brand.innerHTML,toggle=doc.querySelector('#menu-toggle'),labelBefore=toggle.innerHTML,share=doc.querySelector('#page-share');let clicks=0;share.addEventListener('click',()=>clicks++);
 const chrome=createWorldChrome(doc);
 for(let n=0;n<20;n++){
  chrome.set(true);assert.equal(doc.body.dataset.world,'buncho');assert.equal(footer.hidden,true);assert.equal(doc.querySelector('#menu #page-share'),share);assert.equal(doc.querySelectorAll('#page-share').length,1);assert.equal(doc.querySelector('#brand img'),logo);assert.equal(brand.innerHTML,logoBefore);assert.equal(brand.getAttribute('href'),'/buncho-ureshi/game/');assert(doc.querySelector('#menu .footer-bottom'));assert(doc.querySelector('.world-menu-about a[href="/buncho-ureshi/credits/"]'));assert(doc.querySelector('#menu a[href="https://github.com/djnaoyaman/buncho-ureshi"]'));share.click();
  chrome.set(true);assert.equal(doc.querySelectorAll('.world-menu-extras').length,1);
  chrome.set(false);assert.equal(doc.body.hasAttribute('data-world'),false);assert.equal(footer.hidden,false);assert.equal(footer.querySelector('#page-share'),share);assert.equal(toggle.innerHTML,labelBefore);assert.equal(brand.getAttribute('href'),'/buncho-ureshi/');assert.equal(brand.getAttribute('aria-label'),'Original top');assert.equal(doc.querySelector('#menu .world-menu-extras').hidden,true);
 }
 assert.equal(clicks,20);chrome.dispose();assert.equal(footer.innerHTML,footerBefore);assert.equal(doc.querySelector('.world-menu-extras'),null);await window.happyDOM.close();
});
test('world menu Escape restores toggle focus; route exit closes optional menu without trapping focus',async()=>{
 const{window,doc}=fixture(),chrome=createWorldChrome(doc),menu=doc.querySelector('#menu'),toggle=doc.querySelector('#menu-toggle');chrome.set(true);menu.hidden=false;toggle.setAttribute('aria-expanded','true');const link=menu.querySelector('a');link.focus();link.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(menu.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(doc.activeElement,toggle);
 menu.hidden=false;toggle.setAttribute('aria-expanded','true');chrome.set(false);assert.equal(menu.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');chrome.dispose();await window.happyDOM.close();
});

test('startup logo waits for decode, remains for2000ms once per entry, and cancels on route exit',async()=>{
 const {window,doc}=fixture(),create=doc.createElement.bind(doc);let img,done,delay,loads=0;
 doc.createElement=(name,...args)=>{const node=create(name,...args);if(name==='img'){img=node;loads++;Object.defineProperty(node,'src',{value:'',writable:true,configurable:true});node.decode=()=>Promise.resolve();}return node;};
 window.setTimeout=(fn,ms)=>{done=fn;delay=ms;return 1;};window.clearTimeout=()=>{};
 const chrome=createWorldChrome(doc);chrome.set(true);assert.equal(doc.querySelector('.game-logo-intro'),null);assert.equal(doc.body.dataset.gameIntro,'loading');await img.onload();assert(doc.querySelector('.game-logo-intro img'));assert.equal(delay,2000);chrome.set(true);assert.equal(loads,1);done();assert.equal(doc.querySelector('.game-logo-intro'),null);assert.equal(doc.body.dataset.gameIntro,'done');
 chrome.set(false);chrome.set(true);const late=img.onload;chrome.set(false);await late();assert.equal(doc.querySelector('.game-logo-intro'),null);chrome.dispose();await window.happyDOM.close();
});

test('game removes general navigation/search and restores original nodes/handlers after repeated entry',async()=>{
 const {window,doc}=fixture(),menu=doc.querySelector('#menu'),nav=menu.querySelector('nav'),search=doc.querySelector('#site-search'),before=menu.innerHTML;let submits=0,actions=0;search.addEventListener('submit',e=>{e.preventDefault();submits++;});doc.addEventListener('buncho-world-action',()=>actions++);const chrome=createWorldChrome(doc);
 for(let n=0;n<3;n++){
  chrome.set(true);assert.equal(doc.querySelector('#site-search'),null);assert(!nav.isConnected);assert.equal(doc.querySelector('.game-world-exit').hidden,false);assert.equal(doc.querySelector('.game-world-exit').getAttribute('href'),'/buncho-ureshi/encyclopedia/');assert.equal(doc.querySelector('[data-world-action=settings]').disabled,true);
  doc.dispatchEvent(new window.CustomEvent('buncho-game-ready'));assert.equal(doc.querySelector('[data-world-action=settings]').disabled,false);menu.hidden=false;doc.querySelector('[data-world-action=settings]').click();assert.equal(menu.hidden,true);assert.equal(actions,n+1);
  chrome.set(false);assert.equal(doc.querySelector('#site-search'),search);assert.equal(menu.querySelector('nav'),nav);assert.equal(doc.querySelector('#menu-toggle').hasAttribute('data-game-world-control'),false);assert.equal(doc.querySelector('.game-world-exit').hidden,true);search.dispatchEvent(new window.Event('submit',{cancelable:true}));
 }
 assert.equal(submits,3);chrome.dispose();assert.equal(menu.innerHTML,before);assert.equal(doc.querySelector('.game-world-exit'),null);await window.happyDOM.close();
});

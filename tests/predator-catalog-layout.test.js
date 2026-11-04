import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {renderCrowNotebook} from '../src/garden-crow-ui.js';

test('enemy notebook keeps all three catalogs in one uncapped outer scroll',()=>{
 const window=new Window();
 window.document.body.innerHTML='<style>'+readFileSync(new URL('../src/encounter-ui.css',import.meta.url),'utf8')+'</style><div class="finch-overlay-content">'+renderCrowNotebook(createWorld(Date.UTC(2026,10,4)))+'</div>';
 const grids=[...window.document.querySelectorAll('.finch-catalog')];
 assert.deepEqual(grids.map(e=>e.children.length),[5,8,1]);
 for(const grid of grids){const s=window.getComputedStyle(grid);assert.equal(s.maxHeight,'none');assert.equal(s.overflow,'visible');}
 const normal=window.document.createElement('div');normal.className='finch-catalog';window.document.querySelector('.finch-overlay-content').append(normal);
 assert.equal(window.getComputedStyle(normal).maxHeight,'58dvh','ordinary 32-bird notebook keeps its own scrolling');
 window.happyDOM.abort();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {familyLayout} from '../src/family-layout.js';
const bird=(id,parents=[],partner=null)=>({id,parents,partner});
const node=(g,id)=>g.nodes.find(n=>n.id===id);
function balanced(g){
 const left=Math.min(...g.nodes.map(n=>n.x-g.cardW/2)),right=Math.max(...g.nodes.map(n=>n.x+g.cardW/2));
 const top=Math.min(...g.nodes.map(n=>n.y)),bottom=Math.max(...g.nodes.map(n=>n.y+g.cardH));
 assert.equal(left,24);assert.equal(g.width-right,24);assert.equal(top,24);assert.equal(g.height-bottom,24);
 assert.equal(new Set(g.nodes.map(n=>n.id)).size,g.nodes.length);
 for(const edge of g.edges){const values=edge.path.match(/-?\d+(?:\.\d+)?/g).map(Number);assert(values.every(v=>Number.isFinite(v)&&v>=0));}
}
test('top-down family places real parents above pair and children below with connectors',()=>{
 const w={birds:[bird('a',['g1','g2'],'b'),bird('b',[],'a'),bird('g1'),bird('g2'),bird('c',['a','b']),bird('d',['a','b'])]},g=familyLayout(w,'a');
 assert.equal(node(g,'a').y,node(g,'b').y);assert(node(g,'g1').y<node(g,'a').y);assert(node(g,'c').y>node(g,'a').y);assert.equal(node(g,'c').y,node(g,'d').y);
 assert.equal(g.edges.filter(e=>e.kind==='pair').length,2);assert(g.edges.some(e=>e.kind==='blood'&&e.path.includes('V 354')));balanced(g);
});
test('absent parents leave no blank generation above a single bird, pair or family',()=>{
 for(const birds of [[bird('a')],[bird('a',[],'b'),bird('b',[],'a')],[bird('a',[],'b'),bird('b',[],'a'),bird('c',['a','b']),bird('d',['a','b'])],[bird('a'),bird('c',['a'])]]){
  const world={birds},before=structuredClone(world),g=familyLayout(world,'a');balanced(g);assert.equal(node(g,'a').y,24);assert.equal(g.height,g.children.length?360:180);assert.deepEqual(world,before);
 }
});
test('wide family retains every child without falsely connecting current mate as parent',()=>{
 const w={birds:[bird('a',[],'b'),bird('b'),...Array.from({length:30},(_,i)=>bird('c'+i,['a','old']))]},g=familyLayout(w,'a'),focus=node(g,'a');
 assert.equal(g.children.length,30);assert(g.width>=4200);balanced(g);
 assert(g.edges.some(e=>e.kind==='blood'&&e.path.startsWith(`M ${focus.x} ${focus.y+g.cardH} V `)));
 assert(!g.edges.some(e=>e.kind==='blood'&&e.path.startsWith(`M ${g.width/2} ${focus.y+g.cardH/2} V `)));
});
test('changing focus retains only actual generations and balances all four sides',()=>{
 const w={birds:[bird('a',['g1','g2'],'b'),bird('b',['g3','g4'],'a'),...['g1','g2','g3','g4'].map(id=>bird(id)),bird('c',['a','b'])]};
 for(const b of w.birds){const g=familyLayout(w,b.id);balanced(g);assert.equal(g.focusId,b.id);assert.equal(node(g,b.id).y,b.parents.length?204:24);}
 const child=familyLayout(w,'c');assert.equal(child.height,360);assert.equal(child.children.length,0);assert.equal(child.mateId,null);
});
test('child from a different parent remains attached to the focus rather than current mate',()=>{
 const g=familyLayout({birds:[bird('a',[],'b'),bird('b'),bird('c',['a','old'])]},'a'),a=node(g,'a'),c=node(g,'c');
 assert(g.edges.some(e=>e.kind==='blood'&&e.path===`M ${a.x} ${a.y+g.cardH} V ${c.y-14} M ${a.x} ${c.y-14} H ${c.x}`));balanced(g);
});

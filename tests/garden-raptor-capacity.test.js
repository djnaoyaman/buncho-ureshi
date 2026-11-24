import test from 'node:test';
import assert from 'node:assert/strict';
import {gardenRaptorCapacity,RAPTOR_CAPACITY_NOW} from './fixtures/garden-raptor-capacity.js';
import {renderGardenStage} from '../src/encounter-ui.js';
import {renderRaptorNotice} from '../src/garden-raptor-ui.js';
for(const [label,options] of [['kestrel with a second companion',{}],['kestrel with a known visitor',{knownVisitor:true}],['non-hostile osprey',{species:'osprey'}],['active warning',{warning:true}]]){
 test('render ' + label + ' without changing the saved encounter',()=>{
  const {w,companionId,nativeId,visitorId}=gardenRaptorCapacity(options),before=JSON.stringify(w),species=options.species||'common-kestrel';
  const html=renderGardenStage(w,{now:RAPTOR_CAPACITY_NOW}),notice=renderRaptorNotice(w);
  assert.ok(html.includes('data-raptor-species="'+species+'"'));
  assert.ok(html.includes('game-art/raptors/'+species+'.webp'));
  assert.match(html,/finch-raptor-java/);
  assert.doesNotMatch(html,/data-garden-household="b1"/);
  assert.match(notice,options.warning?/warning/:/visiting/);
  if(options.warning){assert.doesNotMatch(html,/data-encounter-open="star-finch"/);assert.doesNotMatch(html,/data-garden-household=/);}
  else{
   assert.ok(html.includes('data-encounter-open="'+nativeId+'"'));
   assert.equal((html.match(/class="finch-garden-friend"/g)||[]).length,4);
   if(companionId)assert.ok(html.includes('data-garden-household="'+companionId+'"'));
   if(options.knownVisitor){assert.equal(visitorId,'gouldian-finch');assert.ok(html.includes('data-garden-visiting-friend="'+visitorId+'"'));}
  }
  assert.equal(JSON.stringify(w),before);
 });
}

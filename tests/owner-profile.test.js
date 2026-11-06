import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {OWNER_PROFILE_KEY,LEGACY_OWNER_NAME_KEY,DEFAULT_OWNER,OWNER_CHOICES,normalizeOwnerProfile,readOwnerProfile,loadOwnerProfile,saveOwnerProfile,renderOwnerAvatar,renderOwnerProfileEditor,mountOwnerProfile} from '../src/owner-profile.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),values};};
function setup(storage=memory(),options={}){const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);const editor=mountOwnerProfile(root,{storage,...options});return {win,root,editor,storage,close(){editor.dispose();win.happyDOM.abort();}};}
test('default is natural, no user reference personal name, gender or world data',()=>{assert.equal(DEFAULT_OWNER.name,'飼い主さん');assert.equal(DEFAULT_OWNER.version,1);assert(!('gender' in DEFAULT_OWNER));assert(!('worldId' in DEFAULT_OWNER));assert.deepEqual(normalizeOwnerProfile(null),DEFAULT_OWNER);});
test('normalization whitelists every art choice, strips controls, bounds unicode names',()=>{const p=normalizeOwnerProfile({name:' \u0000'+ '鳥'.repeat(50),hair:'x" onload="bad',outfit:'bad',palette:'javascript:alert(1)',worldId:'evil',gem:100000,version:99});assert.equal(p.name.length,24);assert.equal(p.hair,DEFAULT_OWNER.hair);assert.equal(p.outfit,DEFAULT_OWNER.outfit);assert.equal(p.palette,DEFAULT_OWNER.palette);assert.equal(p.version,1);assert(!('gem' in p));assert.equal(Array.from(normalizeOwnerProfile({name:'🐤'.repeat(30)}).name).length,24);});
test('legacy name imported losslessly on first read, then profile is authoritative',()=>{const s=memory();s.setItem(LEGACY_OWNER_NAME_KEY,'すず');let loaded=readOwnerProfile(s);assert.equal(loaded.profile.name,'すず');saveOwnerProfile({...loaded.profile,name:'つばめ'},{storage:s,expectedRaw:loaded.raw});assert.equal(loadOwnerProfile(s).name,'つばめ');assert.equal(s.getItem(LEGACY_OWNER_NAME_KEY),'すず');});
test('single-key save never touches world, music, notebook or old name',()=>{const s=memory();s.setItem('game','saved');s.setItem('music','off');s.setItem('notebook','entry');const before=new Map(s.values);saveOwnerProfile(DEFAULT_OWNER,{storage:s,expectedRaw:null});assert.equal(s.values.size,before.size+1);for(const [k,v]of before)assert.equal(s.getItem(k),v);});
test('stale dialog save rejects latest profile conflict and preserves latest',()=>{const s=memory();const old=readOwnerProfile(s);saveOwnerProfile({...DEFAULT_OWNER,name:'最新'},{storage:s});assert.throws(()=>saveOwnerProfile({...DEFAULT_OWNER,name:'古い'},{storage:s,expectedRaw:old.raw}),/changed/);assert.equal(loadOwnerProfile(s).name,'最新');});
test('malformed/future records remain untouched and saving is disabled',()=>{for(const raw of ['{','{"version":99,"name":"future"}']){const s=memory();s.setItem(OWNER_PROFILE_KEY,raw);const a=setup(s);assert(a.root.querySelector('[data-owner-save]').disabled);assert.equal(s.getItem(OWNER_PROFILE_KEY),raw);a.close();}});
test('SVG all choices and poses are escaped; no scripts or external resources',()=>{const win=new Window();let count=0;for(const [key,items]of Object.entries(OWNER_CHOICES))for(const [id]of items)for(const pose of ['idle','feed','call','pet']){win.document.body.innerHTML=renderOwnerAvatar({...DEFAULT_OWNER,[key]:id},{pose,label:'<img src=x onerror="bad">'});assert.equal(win.document.querySelectorAll('svg').length,1);assert.equal(win.document.querySelectorAll('script,img,image,foreignObject,[onload],[onclick]').length,0);assert.equal(win.document.querySelector('svg').getAttribute('data-owner-pose'),pose);count++;}assert.equal(count,152);win.happyDOM.abort();});
test('outfits and hair have distinct geometry not just color substitutions',()=>{const svgs=OWNER_CHOICES.outfit.map(([id])=>renderOwnerAvatar({...DEFAULT_OWNER,outfit:id},{idPrefix:'same'}));assert.equal(new Set(svgs).size,5);for(const html of svgs)assert.match(html,/<path/);const hair=OWNER_CHOICES.hair.map(([id])=>renderOwnerAvatar({...DEFAULT_OWNER,hair:id},{idPrefix:'same'}));assert.equal(new Set(hair).size,5);});
test('profile names escaped in editor and never interpolated into SVG paths',()=>{const win=new Window();win.document.body.innerHTML=renderOwnerProfileEditor({...DEFAULT_OWNER,name:'"><img src=x onerror=bad>'});assert.equal(win.document.querySelectorAll('img,[onerror]').length,0);assert.match(win.document.querySelector('input').value,/<img/);win.happyDOM.abort();});
test('trying outfit keeps original until explicit Save; Cancel never writes',()=>{let canceled=0;const a=setup(memory(),{onCancel:()=>canceled++});a.root.querySelector('[data-owner-choice="dress"]').click();assert.equal(a.editor.getDraft().outfit,'dress');assert.equal(a.storage.getItem(OWNER_PROFILE_KEY),null);a.root.querySelector('[data-owner-cancel]').click();assert.equal(canceled,1);assert.equal(a.storage.getItem(OWNER_PROFILE_KEY),null);a.close();});
test('save persists draft/name then a fresh mount restores selections',()=>{const s=memory();let saved;const a=setup(s,{onSave:p=>saved=p});a.root.querySelector('[data-owner-choice="overalls"]').click();const input=a.root.querySelector('[data-owner-name]');input.value='はる';input.dispatchEvent(new a.win.Event('input',{bubbles:true}));a.root.querySelector('[data-owner-save]').click();assert.equal(saved.name,'はる');assert.equal(saved.outfit,'overalls');a.close();const b=setup(s);assert.equal(b.editor.getDraft().name,'はる');assert.equal(b.root.querySelector('[data-owner-choice="overalls"]').getAttribute('aria-pressed'),'true');b.close();});
test('tab keyboard uses arrows/home/end; selected options keep focus',()=>{const a=setup();const tab=a.root.querySelector('[data-owner-category="outfit"]');tab.focus();tab.dispatchEvent(new a.win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(a.win.document.activeElement.dataset.ownerCategory,'palette');a.win.document.activeElement.dispatchEvent(new a.win.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(a.win.document.activeElement.dataset.ownerCategory,'accessory');a.root.querySelector('[data-owner-choice="scarf"]').click();assert.equal(a.win.document.activeElement.dataset.ownerChoice,'scarf');assert.equal(a.editor.getDraft().accessory,'scarf');a.close();});
test('peer edit while open disables save rather than overwriting',()=>{const a=setup();saveOwnerProfile({...DEFAULT_OWNER,name:'別の画面'},{storage:a.storage});a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:OWNER_PROFILE_KEY}));assert(a.root.querySelector('[data-owner-save]').disabled);assert.match(a.root.querySelector('[data-owner-status]').textContent,/ほかの画面/);a.close();});
test('quota failure preserves old record and gives useful error',()=>{const s=memory();saveOwnerProfile(DEFAULT_OWNER,{storage:s});const old=s.getItem(OWNER_PROFILE_KEY);s.setItem=()=>{throw Error('quota');};const a=setup(s);a.root.querySelector('[data-owner-save]').click();assert.equal(s.getItem(OWNER_PROFILE_KEY),old);assert.match(a.root.querySelector('[data-owner-status]').textContent,/保存できません/);assert(!a.root.querySelector('[data-owner-save]').disabled);a.close();});
test('unavailable storage and dispose cause no throws or writes',()=>{const a=setup(null);assert(a.root.querySelector('[data-owner-save]').disabled);a.editor.dispose();a.root.querySelector('[data-owner-choice="dress"]').click();assert.equal(a.editor.getDraft().outfit,DEFAULT_OWNER.outfit);a.close();});
test('caller callback failure never reports an already committed save as lost',()=>{const a=setup(memory(),{onSave(){throw Error('screen transition');}});a.root.querySelector('[data-owner-save]').click();assert(a.storage.getItem(OWNER_PROFILE_KEY));assert.match(a.root.querySelector('[data-owner-status]').textContent,/保存しました/);a.close();});
test('public save API refuses to overwrite future or corrupt records',()=>{for(const raw of ['{','{"version":8}']){const s=memory();s.setItem(OWNER_PROFILE_KEY,raw);assert.throws(()=>saveOwnerProfile(DEFAULT_OWNER,{storage:s,expectedRaw:raw}));assert.equal(s.getItem(OWNER_PROFILE_KEY),raw);}});

test('eyes and face selections render differently and persist across reopening',()=>{
 const s=memory(),a=setup(s);
 for(const key of ['eyes','face']){const visuals=OWNER_CHOICES[key].map(([id])=>renderOwnerAvatar({...DEFAULT_OWNER,[key]:id},{idPrefix:'same'}));assert.equal(new Set(visuals).size,OWNER_CHOICES[key].length);}
 a.root.querySelector('[data-owner-category="eyes"]').click();a.root.querySelector('[data-owner-choice="bright"]').click();
 a.root.querySelector('[data-owner-category="face"]').click();a.root.querySelector('[data-owner-choice="oval"]').click();
 assert.equal(s.getItem(OWNER_PROFILE_KEY),null);a.root.querySelector('[data-owner-save]').click();a.close();
 const b=setup(s);assert.equal(b.editor.getDraft().eyes,'bright');assert.equal(b.editor.getDraft().face,'oval');b.root.querySelector('[data-owner-category="face"]').click();assert.equal(b.root.querySelector('[data-owner-choice="oval"]').getAttribute('aria-pressed'),'true');b.close();
 assert.equal(normalizeOwnerProfile({version:1,eyes:'smile'}).face,DEFAULT_OWNER.face);
});


test('painted wardrobe preview and choices use the same accessible artwork',()=>{
 const a=setup();
 let preview=a.root.querySelector('[data-owner-preview] > .owner-peek-art');
 assert(preview);assert.equal(preview.getAttribute('role'),'img');assert.equal(preview.getAttribute('aria-label'),'飼い主の試着プレビュー');
 const thumbs=[...a.root.querySelectorAll('[data-owner-shelf] .owner-peek-art')];
 assert.equal(thumbs.length,OWNER_CHOICES.outfit.length);
 for(const thumb of thumbs)assert.equal(thumb.getAttribute('aria-hidden'),'true');
 const ids=[...a.root.querySelectorAll('.owner-peek-art [id]')].map(el=>el.id);
 assert(ids.length>0);assert.equal(new Set(ids).size,ids.length,'each rendered illustration has unique SVG definitions');
 a.root.querySelector('[data-owner-choice="dress"]').click();
 preview=a.root.querySelector('[data-owner-preview] > .owner-peek-art');
 assert.equal(preview.getAttribute('data-outfit'),'dress');assert.equal(a.editor.getDraft().outfit,'dress');
 assert.equal(a.storage.getItem(OWNER_PROFILE_KEY),null);
 a.root.querySelector('[data-owner-category="hair"]').click();a.root.querySelector('[data-owner-choice="bun"]').click();
 preview=a.root.querySelector('[data-owner-preview] > .owner-peek-art');assert.equal(preview.getAttribute('data-hair'),'bun');
 assert.equal(preview.getAttribute('data-outfit'),'dress');
 a.root.querySelector('[data-owner-save]').click();assert.equal(loadOwnerProfile(a.storage).hair,'bun');assert.equal(loadOwnerProfile(a.storage).outfit,'dress');
 a.close();
});

test('painted editor preserves every wardrobe category on save and reopening',()=>{
 const storage=memory(),a=setup(storage),expected={};
 for(const [category,choices] of Object.entries(OWNER_CHOICES)){
  a.root.querySelector(`[data-owner-category="${category}"]`).click();
  for(const [id] of choices){
   a.root.querySelector(`[data-owner-choice="${id}"]`).click();
   assert.equal(a.editor.getDraft()[category],id,`${category}:${id}`);
  }
  expected[category]=choices.at(-1)[0];
 }
 assert.equal(storage.getItem(OWNER_PROFILE_KEY),null);
 a.root.querySelector('[data-owner-save]').click();a.close();
 const b=setup(storage);for(const [category,id] of Object.entries(expected))assert.equal(b.editor.getDraft()[category],id,category);b.close();
});

test('first-save snapshot rejects changed or deleted legacy names without writes',()=>{
 for(const next of ['別の名前',null]){
  const s=memory();s.setItem(LEGACY_OWNER_NAME_KEY,'元の名前');const old=readOwnerProfile(s);
  assert.equal(old.legacyNameRaw,'元の名前');assert.equal(old.raw,null);
  if(next===null)s.values.delete(LEGACY_OWNER_NAME_KEY);else s.setItem(LEGACY_OWNER_NAME_KEY,next);
  assert.throws(()=>saveOwnerProfile(old.profile,{storage:s,expectedRaw:old.raw,expectedLegacyNameRaw:old.legacyNameRaw}),/changed/);
  assert.equal(s.getItem(OWNER_PROFILE_KEY),null);assert.equal(s.getItem(LEGACY_OWNER_NAME_KEY),next);
 }
 const s=memory(),old=readOwnerProfile(s);assert.equal(old.legacyNameRaw,null);
 s.setItem(LEGACY_OWNER_NAME_KEY,'後から追加');
 assert.throws(()=>saveOwnerProfile(old.profile,{storage:s,expectedRaw:null,expectedLegacyNameRaw:null}),/changed/);
 assert.equal(s.getItem(OWNER_PROFILE_KEY),null);
});

test('legacy snapshot is optional for old API callers and irrelevant after a profile exists',()=>{
 const s=memory();s.setItem(LEGACY_OWNER_NAME_KEY,'名前');
 saveOwnerProfile(DEFAULT_OWNER,{storage:s,expectedRaw:null});
 const old=readOwnerProfile(s);assert.equal(old.legacyNameRaw,null);
 s.setItem(LEGACY_OWNER_NAME_KEY,'古い名前欄だけ変更');
 saveOwnerProfile({...old.profile,name:'正式名'},{storage:s,expectedRaw:old.raw,expectedLegacyNameRaw:'obsolete'});
 assert.equal(loadOwnerProfile(s).name,'正式名');
});

test('mount protects first save even without a storage notification',()=>{
 const a=setup();a.storage.setItem(LEGACY_OWNER_NAME_KEY,'新しい名前');
 a.root.querySelector('[data-owner-save]').click();
 assert.equal(a.storage.getItem(OWNER_PROFILE_KEY),null);assert(a.root.querySelector('[data-owner-save]').disabled);
 assert.match(a.root.querySelector('[data-owner-status]').textContent,/ほかの画面/);a.close();
});

test('legacy changes and clear notifications lock first-save drafts but unchanged events do not',()=>{
 for(const key of [LEGACY_OWNER_NAME_KEY,null]){
  const a=setup();a.win.dispatchEvent(new a.win.StorageEvent('storage',{key}));
  assert(!a.root.querySelector('[data-owner-save]').disabled);
  a.storage.setItem(LEGACY_OWNER_NAME_KEY,'別の画面');a.win.dispatchEvent(new a.win.StorageEvent('storage',{key}));
  assert(a.root.querySelector('[data-owner-save]').disabled);assert.equal(a.storage.getItem(OWNER_PROFILE_KEY),null);a.close();
 }
 const s=memory();saveOwnerProfile(DEFAULT_OWNER,{storage:s});const a=setup(s);
 s.setItem(LEGACY_OWNER_NAME_KEY,'もう参照しない名前');a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:LEGACY_OWNER_NAME_KEY}));
 assert(!a.root.querySelector('[data-owner-save]').disabled);a.close();
});

test('storage sync ignores unrelated keys and different storage areas',()=>{
 const a=setup();saveOwnerProfile({...DEFAULT_OWNER,name:'外部変更'},{storage:a.storage});
 a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:'unrelated'}));assert(!a.root.querySelector('[data-owner-save]').disabled);
 const event=new a.win.StorageEvent('storage',{key:OWNER_PROFILE_KEY});Object.defineProperty(event,'storageArea',{value:memory()});
 a.win.dispatchEvent(event);assert(!a.root.querySelector('[data-owner-save]').disabled);
 a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:OWNER_PROFILE_KEY}));assert(a.root.querySelector('[data-owner-save]').disabled);a.close();
});

test('same-root remount removes old callbacks, handlers and storage listeners',()=>{
 const a=setup();let first=0,second=0;
 const old=mountOwnerProfile(a.root,{storage:a.storage,onSave:()=>first++});
 const current=mountOwnerProfile(a.root,{storage:a.storage,onSave:()=>second++});
 old.dispose();a.root.querySelector('[data-owner-choice="dress"]').click();a.root.querySelector('[data-owner-save]').click();
 assert.equal(first,0);assert.equal(second,1);assert.equal(old.getDraft().outfit,DEFAULT_OWNER.outfit);assert.equal(current.getDraft().outfit,'dress');
 assert(!a.root.querySelector('[data-owner-save]').disabled);current.dispose();current.dispose();
 const html=a.root.innerHTML;a.storage.setItem(OWNER_PROFILE_KEY,'{');a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:OWNER_PROFILE_KEY}));assert.equal(a.root.innerHTML,html);a.close();
});

test('Cancel restores name, selected buttons and live preview to latest saved draft without writing',()=>{
 const s=memory();saveOwnerProfile({...DEFAULT_OWNER,name:'保存した名前',outfit:'smock'},{storage:s});const a=setup(s);
 const before=s.getItem(OWNER_PROFILE_KEY);a.root.querySelector('[data-owner-choice="dress"]').click();
 const name=a.root.querySelector('[data-owner-name]');name.value='未保存';name.dispatchEvent(new a.win.Event('input',{bubbles:true}));
 a.root.querySelector('[data-owner-cancel]').click();assert.equal(name.value,'保存した名前');assert.equal(a.editor.getDraft().outfit,'smock');
 assert.equal(a.root.querySelector('[data-owner-choice="smock"]').getAttribute('aria-pressed'),'true');
 assert.equal(a.root.querySelector('[data-owner-preview] .owner-peek-art').getAttribute('data-outfit'),'smock');assert.equal(s.getItem(OWNER_PROFILE_KEY),before);
 a.root.querySelector('[data-owner-choice="overalls"]').click();a.root.querySelector('[data-owner-save]').click();const after=s.getItem(OWNER_PROFILE_KEY);
 a.root.querySelector('[data-owner-choice="dress"]').click();a.root.querySelector('[data-owner-cancel]').click();assert.equal(a.editor.getDraft().outfit,'overalls');assert.equal(s.getItem(OWNER_PROFILE_KEY),after);a.close();
});

test('async save and cancel callback rejection is handled with accurate feedback',async()=>{
 for(const action of ['save','cancel']){
  const a=setup(memory(),{[action==='save'?'onSave':'onCancel']:()=>Promise.reject(Error('transition failed'))});
  a.root.querySelector('[data-owner-choice="dress"]').click();a.root.querySelector(`[data-owner-${action}]`).click();await Promise.resolve();await Promise.resolve();
  assert.match(a.root.querySelector('[data-owner-status]').textContent,action==='save'?/保存しました/:/取り消しました/);
  assert.equal(a.editor.getDraft().outfit,action==='save'?'dress':DEFAULT_OWNER.outfit);
  assert.equal(a.storage.getItem(OWNER_PROFILE_KEY)!==null,action==='save');a.close();
 }
 const a=setup(memory(),{onCancel(){throw Error('cancel failed');}});assert.doesNotThrow(()=>a.root.querySelector('[data-owner-cancel]').click());assert.match(a.root.querySelector('[data-owner-status]').textContent,/取り消しました/);a.close();
});

test('late callback failures cannot replace newer feedback or affect a disposed/remounted editor',async()=>{
 for(const action of ['cancel','save','input','choice','tab','storage','dispose','remount']){
  let reject;const pending=new Promise((resolve,rejected)=>{reject=rejected;});let saves=0;
  const a=setup(memory(),{onSave:()=>++saves===1?pending:undefined});a.root.querySelector('[data-owner-save]').click();
  let replacement;
  if(action==='cancel'||action==='save')a.root.querySelector(`[data-owner-${action}]`).click();
  if(action==='input'){const input=a.root.querySelector('[data-owner-name]');input.value='new';input.dispatchEvent(new a.win.Event('input',{bubbles:true}));}
  if(action==='choice')a.root.querySelector('[data-owner-choice="dress"]').click();
  if(action==='tab')a.root.querySelector('[data-owner-category="hair"]').click();
  if(action==='storage'){saveOwnerProfile({...DEFAULT_OWNER,name:'外部'},{storage:a.storage});a.win.dispatchEvent(new a.win.StorageEvent('storage',{key:OWNER_PROFILE_KEY}));}
  if(action==='dispose')a.editor.dispose();
  if(action==='remount')replacement=mountOwnerProfile(a.root,{storage:a.storage});
  const status=a.root.querySelector('[data-owner-status]').textContent;reject(Error('late'));await Promise.resolve();await Promise.resolve();
  assert.equal(a.root.querySelector('[data-owner-status]').textContent,status,action);replacement?.dispose();a.close();
 }
});

test('all 75 hair/eyes/outfit combinations save and reopen with other fields unchanged',()=>{
 const base={...DEFAULT_OWNER,name:'組合せ確認',skin:'umber',hairColor:'silver',palette:'petal',accessory:'leafbag',face:'soft'};
 const s=memory();s.setItem(LEGACY_OWNER_NAME_KEY,'元の名前');s.setItem('world','untouched');saveOwnerProfile(base,{storage:s});
 const a=setup(s),reopenRoot=a.win.document.createElement('div');a.win.document.body.append(reopenRoot);assert.equal(a.root.querySelectorAll('[data-owner-category]').length,8);let count=0;
 for(const [hair]of OWNER_CHOICES.hair)for(const [eyes]of OWNER_CHOICES.eyes)for(const [outfit]of OWNER_CHOICES.outfit){
  const before=s.getItem(OWNER_PROFILE_KEY);
  for(const [key,id]of Object.entries({hair,eyes,outfit})){a.root.querySelector(`[data-owner-category="${key}"]`).click();a.root.querySelector(`[data-owner-choice="${id}"]`).click();}
  assert.equal(s.getItem(OWNER_PROFILE_KEY),before,'preview never writes');
  const expected={...base,hair,eyes,outfit};assert.deepEqual(a.editor.getDraft(),expected);
  const art=a.root.querySelector('[data-owner-preview] .owner-peek-art');assert.equal(art.getAttribute('data-hair'),hair);assert.equal(art.getAttribute('data-outfit'),outfit);
  a.root.querySelector('[data-owner-save]').click();assert.deepEqual(loadOwnerProfile(s),expected);
  const reopened=mountOwnerProfile(reopenRoot,{storage:s});assert.deepEqual(reopened.getDraft(),expected);reopened.dispose();reopenRoot.replaceChildren();count++;
 }
 assert.equal(count,75);assert.equal(s.getItem(LEGACY_OWNER_NAME_KEY),'元の名前');assert.equal(s.getItem('world'),'untouched');assert.deepEqual([...s.values.keys()].sort(),[LEGACY_OWNER_NAME_KEY,OWNER_PROFILE_KEY,'world'].sort());a.close();
});

test('late cancel rejection cannot replace a subsequent successful save',async()=>{
 let reject;const pending=new Promise((resolve,rejected)=>{reject=rejected;});
 const a=setup(memory(),{onCancel:()=>pending});a.root.querySelector('[data-owner-cancel]').click();
 a.root.querySelector('[data-owner-choice="dress"]').click();a.root.querySelector('[data-owner-save]').click();
 const text=a.root.querySelector('[data-owner-status]').textContent;reject(Error('late cancel'));await Promise.resolve();await Promise.resolve();
 assert.equal(a.root.querySelector('[data-owner-status]').textContent,text);assert.equal(loadOwnerProfile(a.storage).outfit,'dress');a.close();
});

test('repeated saves normalize visible Unicode names and preserve the complete settings',()=>{
 let saves=0;const a=setup(memory(),{onSave:()=>saves++});const input=a.root.querySelector('[data-owner-name]');
 input.value='  '+ '🐤'.repeat(26)+'  ';input.dispatchEvent(new a.win.Event('input',{bubbles:true}));
 a.root.querySelector('[data-owner-save]').click();assert.equal(input.value,'🐤'.repeat(24));
 a.root.querySelector('[data-owner-save]').click();assert.equal(saves,2);assert.deepEqual(loadOwnerProfile(a.storage),a.editor.getDraft());assert(!a.root.querySelector('[data-owner-save]').disabled);a.close();
});

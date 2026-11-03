/** Original, layered wardrobe illustration. No reference screenshots or personal data. */
export const OWNER_PROFILE_KEY='buncho.owner-profile.v1';
export const LEGACY_OWNER_NAME_KEY='buncho.owner-name.v1';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OWNER_CHOICES=Object.freeze({
 hair:[['crop','こもれびショート'],['bob','まあるいボブ'],['wave','やわらかウェーブ'],['bun','おだんご'],['sweep','風の前髪']],
 skin:[['porcelain','さくら色','#f4d8c4'],['peach','もも色','#e8b89c'],['honey','はちみつ色','#c8946e'],['umber','こはく色','#9c674c'],['deep','くり色','#704a39']],
 hairColor:[['chestnut','くり','#624a3e'],['ink','すみ','#34383e'],['tea','ミルクティー','#ae8b64'],['silver','しろがね','#c8c9c2'],['rose','あずき','#8f6265'],['sage','セージ','#738c80']],
 outfit:[['apron','文鳥のエプロン'],['cardigan','羽根のカーディガン'],['smock','庭しごとのスモック'],['dress','こもれびワンピース'],['overalls','種まきオーバーオール']],
 palette:[['white','白文鳥','#e9e5d8','#a79c85'],['sakura','桜文鳥','#b8b9bf','#745e65'],['silver','シルバー','#c5d5d6','#698b96'],['cinnamon','シナモン','#cfaa83','#927253'],['leaf','若葉','#b7c7a8','#6b8564'],['petal','花びら','#e1b8bc','#a77780']],
 accessory:[['none','小物なし'],['birdpin','文鳥ブローチ'],['leafbag','葉っぱのポシェット'],['beret','どんぐりベレー'],['scarf','羽色のスカーフ']],
 eyes:[['gentle','やさしい目'],['bright','ぱっちり'],['smile','にっこり']]
});
export const DEFAULT_OWNER=Object.freeze({version:1,name:'飼い主さん',hair:'bob',skin:'peach',hairColor:'chestnut',outfit:'apron',palette:'leaf',accessory:'birdpin',eyes:'gentle'});
const valid=(key,value)=>OWNER_CHOICES[key].some(row=>row[0]===value);
export function normalizeOwnerProfile(value={}){
 const p={...DEFAULT_OWNER};
 if(!value||typeof value!=='object'||Array.isArray(value))return p;
 if(typeof value.name==='string')p.name=Array.from(value.name.replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,24).join('')||DEFAULT_OWNER.name;
 for(const key of Object.keys(OWNER_CHOICES))if(valid(key,value[key]))p[key]=value[key];
 return p;
}
const getStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function readOwnerProfile(storage=getStorage()){
 try{
  const raw=storage?.getItem(OWNER_PROFILE_KEY)??null;
  if(raw!==null){const parsed=JSON.parse(raw);if(parsed?.version!==1)throw Error('profile-version');return {profile:normalizeOwnerProfile(parsed),raw,error:null};}
  return {profile:normalizeOwnerProfile({name:storage?.getItem(LEGACY_OWNER_NAME_KEY)||DEFAULT_OWNER.name}),raw:null,error:storage?null:'unavailable'};
 }catch{return {profile:{...DEFAULT_OWNER},raw:null,error:'unreadable'};}
}
export function loadOwnerProfile(storage=getStorage()){return readOwnerProfile(storage).profile;}
export function saveOwnerProfile(profile,{storage=getStorage(),expectedRaw}={}){
 if(!storage)throw Error('owner-storage-unavailable');
 const current=storage.getItem(OWNER_PROFILE_KEY);
 if(expectedRaw!==undefined&&current!==expectedRaw)throw Error('owner-profile-changed');
 if(current!==null){let record;try{record=JSON.parse(current);}catch{throw Error('owner-profile-unreadable');}if(record?.version!==1)throw Error('owner-profile-version');}
 const normalized=normalizeOwnerProfile(profile),raw=JSON.stringify(normalized);
 storage.setItem(OWNER_PROFILE_KEY,raw); // A single key; no world data or legacy key is deleted.
 return {profile:normalized,raw};
}
const choice=(key,id)=>OWNER_CHOICES[key].find(row=>row[0]===id)||OWNER_CHOICES[key][0];
const birdMark=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-13 0q0-14 13-14T13 0q0 12-13 12T-13 0" fill="#fbf7ed"/><path d="M-5 1q8 8 13-2" fill="none" stroke="#d4cec0" stroke-width="2"/><path d="M10-5l10 4-10 4" fill="#d7877c"/><circle cx="5" cy="-7" r="1.7" fill="#45433d"/></g>`;
let avatarId=0;
export function renderOwnerAvatar(value,{pose='idle',label='飼い主の試着プレビュー',decorative=false,idPrefix}={}){
 const p=normalizeOwnerProfile(value),skin=choice('skin',p.skin)[2],hair=choice('hairColor',p.hairColor)[2],pal=choice('palette',p.palette),cloth=pal[2],trim=pal[3];
 const id=String(idPrefix||`owner-${++avatarId}`).replace(/[^a-zA-Z0-9_-]/g,'')||`owner-${++avatarId}`;
 const active=['idle','feed','call','pet'].includes(pose)?pose:'idle';
 const back={crop:'M75 92Q67 40 117 34Q169 27 175 84L167 117H81Z',bob:'M70 101Q64 37 119 32Q182 31 182 105L173 146Q154 159 137 143H94Q72 151 68 132Z',wave:'M70 91Q60 41 103 34Q166 14 183 79Q198 100 181 115Q198 141 174 150Q165 166 147 149H96Q70 163 61 143Q48 120 68 110Z',bun:'M69 93Q64 39 118 31Q175 26 180 87L170 122H77Z',sweep:'M67 92Q62 53 85 39Q121 13 161 43Q182 58 176 103L164 120H80Z'}[p.hair];
 const fronts={crop:'M78 88Q77 55 105 50Q147 38 167 72L161 87Q145 85 130 63Q126 83 116 85L114 67Q103 87 78 88Z',bob:'M76 88Q78 49 116 45Q154 42 171 86Q155 90 141 76L134 61L128 88L119 68L111 87Z',wave:'M74 86Q76 46 116 44Q154 39 171 81Q151 102 137 72Q128 96 112 78Q96 99 74 86Z',bun:'M76 85Q78 49 118 44Q159 45 171 88Q142 91 123 62Q110 85 76 85Z',sweep:'M72 86Q74 43 120 41Q164 42 173 83Q161 92 147 79L139 60Q117 86 85 91L93 73Z'}[p.hair];
 const legs=p.outfit==='dress'?`<path d="M96 252l3 44h17l5-43m10 0l1 43h17l4-45" fill="#eee6d3"/>`:`<path d="M87 233l9 64h23l5-48 6 48h24l9-64Z" fill="${trim}"/><path d="M95 276h25m11 0h24" stroke="#f1ead9" stroke-width="12"/>`;
 const shoes=`<path d="M96 289q-5 10-5 15q11 9 30 0v-15Z M131 289v15q21 9 29-1q-1-9-7-14Z" fill="#866a50"/><path d="M97 297h17m23 0h16" stroke="#eadac2" stroke-width="2" stroke-linecap="round"/>`;
 const bodies={apron:`<path d="M94 155q29-12 59 0l15 86q-39 15-82 0Z" fill="#f1eadc"/><path d="M103 161l-4 75q26 9 52 0l-5-75" fill="${cloth}" stroke="${trim}" stroke-width="3"/><path d="M99 203q26 10 52 0v24q-27 11-52 0Z" fill="${trim}" opacity=".32"/>${birdMark(126,193,.7)}`,cardigan:`<path d="M94 155q31-12 60 0l14 87q-39 16-83 0Z" fill="${cloth}"/><path d="M117 152l8 25 9-25v94h-17Z" fill="#f9f2e4"/><path d="M124 178v63" stroke="${trim}" stroke-width="2"/><g fill="${trim}"><circle cx="128" cy="187" r="2"/><circle cx="128" cy="203" r="2"/><circle cx="128" cy="219" r="2"/></g><path d="M91 219l19-2m31 0l20 2" stroke="${trim}" stroke-width="3"/>`,smock:`<path d="M94 155q29-12 60 0l20 92q-45 16-94 0Z" fill="${cloth}"/><path d="M102 153q21 22 44 0" stroke="#f7f0e1" stroke-width="8" fill="none"/><path d="M119 165v33" stroke="${trim}" stroke-width="2"/><path d="M90 209l22-2v25q-13 7-22-1Z" fill="${trim}" opacity=".5"/><path d="M139 207l22 2v22q-13 8-22 1Z" fill="${trim}" opacity=".5"/>`,dress:`<path d="M96 155q28-11 56 0l30 108q-55 23-114 0Z" fill="${cloth}"/><path d="M90 187q34 10 68 0" stroke="${trim}" stroke-width="5"/><path d="M93 209l-8 49m28-51-2 57m22-56 5 55m12-53 17 45" fill="none" stroke="${trim}" opacity=".24" stroke-width="3"/>${birdMark(145,224,.55)}`,overalls:`<path d="M93 153q31-10 62 0l15 86q-43 15-85 0Z" fill="#f4ede0"/><path d="M101 154l3 39h42l4-39" stroke="${trim}" stroke-width="9" fill="none"/><path d="M100 178h50l10 66H89Z" fill="${cloth}"/><path d="M112 190h28v26q-14 9-28 0Z" fill="${trim}" opacity=".46"/><g fill="#e2be73"><circle cx="105" cy="183" r="3"/><circle cx="146" cy="183" r="3"/></g>`}[p.outfit];
 const left=`<path d="M94 158Q76 161 71 194l-2 26q5 10 13 1l11-28" fill="${cloth}"/><path d="M69 216q-3 17 5 20q8-2 9-15" fill="${skin}"/>`;
 const right=active==='feed'||active==='pet'?`<path d="M151 158q15 1 19 24l24-4 4 14q-38 15-42-4Z" fill="${cloth}"/><path d="M193 178q11-4 17-1l9 5q-8 8-22 8" fill="${skin}"/>${active==='feed'?'<path d="M202 176l2-5m4 5 3-4" stroke="#b49659" stroke-width="2"/>':''}`:active==='call'?`<path d="M153 158q16 9 23-9l-9-21-12 4 5 16-10 10Z" fill="${cloth}"/><path d="M157 133q-10-8-6-17q5-5 8 2l8 10" fill="${skin}"/>`:`<path d="M152 158q17 3 22 35l5 28q-5 11-13 1l-13-28" fill="${cloth}"/><path d="M166 217q-1 17 7 19q9-4 6-17" fill="${skin}"/>`;
 const eyes=p.eyes==='smile'?'<path d="M98 104q5-7 10 0m28 0q5-7 10 0" fill="none" stroke="#493d36" stroke-width="3" stroke-linecap="round"/>':`<g fill="#493d36"><ellipse cx="104" cy="104" rx="${p.eyes==='bright'?5:4}" ry="${p.eyes==='bright'?7:5}"/><ellipse cx="140" cy="104" rx="${p.eyes==='bright'?5:4}" ry="${p.eyes==='bright'?7:5}"/></g><g fill="#fff9ef"><circle cx="105" cy="102" r="1.5"/><circle cx="141" cy="102" r="1.5"/></g>`;
 const accessory={none:'',birdpin:birdMark(148,174,.48),leafbag:`<path d="M96 152l53 78" stroke="#927958" stroke-width="5" fill="none"/><path d="M143 217q25-5 25 13q0 24-24 24q-16-18-1-37" fill="#7d9672"/><path d="M149 224l8 22m-6-14 10-2" stroke="#c3d1ac" stroke-width="2" fill="none"/>`,beret:`<path d="M75 53q-1-28 52-28q46 0 49 26q-52 24-101 2" fill="${trim}"/><path d="M120 26q-4-12 6-14" stroke="${trim}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M77 54q46 15 96-3" stroke="${cloth}" stroke-width="6"/>`,scarf:`<path d="M105 141q19 9 39 0l6 15q-24 15-48-1Z" fill="${trim}"/><path d="M136 151l20 39-16 7-14-40" fill="${trim}"/><path d="M143 184l9-4" stroke="${cloth}" stroke-width="4"/>`}[p.accessory];
 return `<svg class="buncho-owner-avatar" viewBox="0 0 248 330" xmlns="http://www.w3.org/2000/svg" ${decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`} focusable="false" data-owner-pose="${active}"><defs><linearGradient id="${id}-light" x2=".7" y2="1"><stop stop-color="#fff9ed" stop-opacity=".34"/><stop offset=".6" stop-color="#fff9ed" stop-opacity="0"/><stop offset="1" stop-color="#6c5340" stop-opacity=".12"/></linearGradient></defs><ellipse cx="126" cy="308" rx="55" ry="10" fill="#8c8d71" opacity=".14"/><g stroke-linejoin="round"><path d="${back}" fill="${hair}"/>${p.hair==='bun'?`<circle cx="159" cy="34" r="23" fill="${hair}"/><path d="M142 29q18-15 31 2" fill="none" stroke="#fff5dc" opacity=".17" stroke-width="3"/>`:''}${legs}${shoes}${left}${right}${bodies}<path d="M110 132v20q14 13 28 0v-21" fill="${skin}"/><ellipse cx="76" cy="106" rx="8" ry="11" fill="${skin}"/><ellipse cx="171" cy="106" rx="8" ry="11" fill="${skin}"/><path d="M77 84q0-34 47-35q47 0 47 37l-3 30q-9 28-44 30q-35-3-44-30Z" fill="${skin}"/><ellipse cx="93" cy="118" rx="10" ry="6" fill="#d7857b" opacity=".25"/><ellipse cx="152" cy="118" rx="10" ry="6" fill="#d7857b" opacity=".25"/>${eyes}<path d="M119 124q6 5 12 0" fill="none" stroke="#a56559" stroke-width="2.4" stroke-linecap="round"/><path d="${fronts}" fill="${hair}"/><path d="M88 62q23-18 45-12" fill="none" stroke="#fff4d9" opacity=".14" stroke-width="4" stroke-linecap="round"/>${accessory}<path d="M77 84q0-34 47-35q47 0 47 37l-3 30q-9 28-44 30q-35-3-44-30Z" fill="url(#${id}-light)" pointer-events="none"/></g></svg>`;
}
const categories=[['outfit','洋服'],['palette','羽色コーデ'],['hair','髪型'],['hairColor','髪の色'],['skin','肌の色'],['eyes','表情'],['accessory','小物']];
export function renderOwnerProfileEditor(profile,{category='outfit'}={}){
 const p=normalizeOwnerProfile(profile),active=categories.some(([id])=>id===category)?category:'outfit';
 return `<section class="buncho-owner-editor" aria-label="飼い主のプロフィール"><div class="owner-fitting"><div class="owner-fitting-label">あなたと、文鳥の暮らし</div><div class="owner-preview" data-owner-preview>${renderOwnerAvatar(p)}</div><label class="owner-name-label">呼ばれたい名前<input data-owner-name maxlength="48" value="${esc(p.name)}" autocomplete="nickname" aria-describedby="owner-name-hint"></label><small id="owner-name-hint">24文字まで。あとから変えられます。</small></div><div class="owner-wardrobe"><div class="owner-tabs" role="tablist" aria-label="着替えるところ">${categories.map(([id,label])=>`<button type="button" role="tab" aria-selected="${id===active}" tabindex="${id===active?0:-1}" data-owner-category="${id}">${label}</button>`).join('')}</div><div class="owner-shelf" role="tabpanel" aria-label="${categories.find(([id])=>id===active)[1]}" data-owner-shelf>${renderShelf(p,active)}</div></div><p class="owner-save-status" role="status" aria-live="polite" data-owner-status>選んで、試着してみよう。</p><div class="owner-actions"><button type="button" data-owner-cancel>やめる</button><button type="button" class="owner-confirm" data-owner-save>これにする</button></div></section>`;
}
function renderShelf(p,category){return OWNER_CHOICES[category].map(([id,label,color])=>{
 const visual=['skin','hairColor','palette'].includes(category)?`<span class="owner-swatch" style="--swatch:${color}" aria-hidden="true"></span>`:renderOwnerAvatar({...p,[category]:id},{decorative:true});
 return `<button type="button" class="owner-choice" data-owner-choice="${id}" aria-pressed="${p[category]===id}" aria-label="${esc(label)}">${visual}<span>${esc(label)}</span></button>`;
}).join('');}
export function mountOwnerProfile(root,{storage=getStorage(),onSave=()=>{},onCancel=()=>{}}={}){
 const initial=readOwnerProfile(storage);let draft={...initial.profile},expectedRaw=initial.raw,category='outfit',disposed=false,conflict=!!initial.error;
 root.innerHTML=renderOwnerProfileEditor(draft);const status=root.querySelector('[data-owner-status]'),save=root.querySelector('[data-owner-save]');
 const message=text=>{status.textContent=text;};
 if(conflict){save.disabled=true;message('保存を読み取れませんでした。閉じてから、もう一度開いてください。');}
 const update=()=>{root.querySelector('[data-owner-preview]').innerHTML=renderOwnerAvatar(draft);root.querySelector('[data-owner-shelf]').innerHTML=renderShelf(draft,category);};
 const selectCategory=(value,focus=false)=>{category=value;for(const b of root.querySelectorAll('[data-owner-category]')){const yes=b.dataset.ownerCategory===category;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;if(yes&&focus)b.focus({preventScroll:true});}const shelf=root.querySelector('[data-owner-shelf]');shelf.setAttribute('aria-label',categories.find(([id])=>id===category)[1]);shelf.innerHTML=renderShelf(draft,category);};
 const input=e=>{if(e.target.matches('[data-owner-name]'))draft.name=e.target.value;};
 const click=e=>{
  const button=e.target.closest('button');if(!button||!root.contains(button)||button.disabled)return;
  if(button.hasAttribute('data-owner-category')){selectCategory(button.dataset.ownerCategory);return;}
  if(button.hasAttribute('data-owner-choice')){const id=button.dataset.ownerChoice;if(valid(category,id)){draft[category]=id;update();root.querySelector(`[data-owner-choice="${id}"]`)?.focus({preventScroll:true});}return;}
  if(button.hasAttribute('data-owner-cancel')){onCancel();return;}
  if(button.hasAttribute('data-owner-save')&&!conflict){save.disabled=true;let committed=false;try{const result=saveOwnerProfile(draft,{storage,expectedRaw});expectedRaw=result.raw;draft=result.profile;root.querySelector('[data-owner-name]').value=draft.name;message('この姿で、会いにいこう。');committed=true;}catch(error){if(error.message==='owner-profile-changed'){conflict=true;message('ほかの画面で変更されました。閉じてから、もう一度開いてください。');}else message('保存できませんでした。今までのプロフィールは残っています。');}finally{save.disabled=conflict;}if(committed){try{onSave({...draft});}catch{message('プロフィールは保存しました。画面を閉じて、もう一度開いてください。');}}}
 };
 const key=e=>{if(!e.target.matches('[data-owner-category]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const at=categories.findIndex(([id])=>id===category);selectCategory(categories[e.key==='Home'?0:e.key==='End'?categories.length-1:(at+(e.key==='ArrowLeft'?-1:1)+categories.length)%categories.length][0],true);};
 const sync=e=>{if(e.key!==OWNER_PROFILE_KEY&&e.key!==null)return;try{if((storage?.getItem(OWNER_PROFILE_KEY)??null)===expectedRaw)return;}catch{}conflict=true;save.disabled=true;message('ほかの画面で変更されました。閉じてから、もう一度開いてください。');};
 root.addEventListener('input',input);root.addEventListener('click',click);root.addEventListener('keydown',key);const win=root.ownerDocument.defaultView;win?.addEventListener('storage',sync);
 return {getDraft:()=>normalizeOwnerProfile(draft),dispose(){if(disposed)return;disposed=true;root.removeEventListener('input',input);root.removeEventListener('click',click);root.removeEventListener('keydown',key);win?.removeEventListener('storage',sync);}};
}

// View-only: records, names and directed relationship labels remain engine-owned.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = {white:'白文鳥',sakura:'桜文鳥',silver:'シルバー',cinnamon:'シナモン'};
const stages = {egg:'卵',chick:'ひな',juvenile:'幼鳥',adult:'成鳥'};
const homes = {resident:'この庭の仲間',visitor:'遊びに来た仲間',departed:'別の庭に巣立った仲間'};
export const RELATION_PAGE_SIZE = 2;
export function relationshipContext(bird) {
  return [colors[bird.color] || bird.color, stages[bird.stage] || bird.stage, homes[bird.home] || bird.home].filter(Boolean).join('・');
}
export function relationshipMapModel(world, selectedId, page = 0) {
  const birds = world?.birds || [], focus = birds.find(b => b.id === selectedId) || birds[0] || null;
  const contacts = focus ? birds.filter(b => b.id !== focus.id && (focus.relations?.[b.id] || b.relations?.[focus.id])) : [];
  const pageCount = Math.max(1, Math.ceil(contacts.length / RELATION_PAGE_SIZE));
  const currentPage = Math.max(0, Math.min(pageCount - 1, Number.isFinite(page) ? Math.trunc(page) : 0));
  const peers = contacts.slice(currentPage * RELATION_PAGE_SIZE, (currentPage + 1) * RELATION_PAGE_SIZE);
  // Connector band sits between auto-height focal and contact rows: long names
  // never move a node into a line. x values match the CSS grid column centers.
  const edges = peers.map((b, i) => ({from:focus.id,to:b.id,x1:50,y1:0,x2:peers.length===1?50:25+i*50,y2:100,
    path:`M 50 0 C 50 48 ${peers.length===1?50:25+i*50} 52 ${peers.length===1?50:25+i*50} 100`}));
  return {focus,peers,edges,currentPage,pageCount,total:contacts.length,focusIndex:focus?birds.indexOf(focus):-1,birdCount:birds.length};
}
export function navigateRelationships(world, state, action) {
  const m = relationshipMapModel(world,state.selectedId,state.page), birds = world?.birds || [];
  if (!m.focus) return {selectedId:null,page:0};
  if (action.type === 'focus-id' && birds.some(b=>b.id===action.id)) return {selectedId:action.id,page:0};
  if (action.type === 'focus-step') return {selectedId:birds[(m.focusIndex+(action.step<0?-1:1)+birds.length)%birds.length].id,page:0};
  if (action.type === 'page-step') return {selectedId:m.focus.id,page:Math.max(0,Math.min(m.pageCount-1,m.currentPage+(action.step<0?-1:1)))};
  return {selectedId:m.focus.id,page:m.currentPage};
}
const metric = (record,key) => Number.isFinite(record?.[key]) ? Math.round(record[key]) : '記録なし';
export function renderRelationshipMap(world, selectedId, {page=0,portrait=()=>'',label=()=>'',context=relationshipContext}={}) {
  const m=relationshipMapModel(world,selectedId,page), b=m.focus;
  if(!b)return '<section class="buncho-rel-map buncho-rel-cards-a" data-rel-map><h3>つながりの木</h3><p>これから、仲間と出会おう。</p></section>';
  const fullName=o=>`${o.name}（${context(o)}）`;
  const identity=o=>`<span class="buncho-rel-portrait" aria-hidden="true">${portrait(o)}</span><strong>${esc(o.name)}</strong><small>${esc(context(o))}</small>`;
  const directionName=(a,z)=>a.name===z.name?`${a.id===b.id?'上':'下'}の${a.name}`:a.name;
  const direction=(a,z)=>`<p class="buncho-rel-feeling"><span>${esc(directionName(a,z))} <span aria-hidden="true">→</span><span class="buncho-rel-sr">から</span> ${esc(directionName(z,a))}<span class="buncho-rel-sr">へ</span></span><strong>${esc(label(world,a,z))}</strong></p>`;
  const metrics=(a,z)=>`<div><dt>${esc(fullName(a))} → ${esc(fullName(z))}</dt><dd>親しさ ${metric(a.relations?.[z.id],'affection')} ／ 信頼 ${metric(a.relations?.[z.id],'trust')} ／ 相性 ${metric(a.relations?.[z.id],'compatibility')}</dd></div>`;
  return `<section class="buncho-rel-map buncho-rel-cards-a" data-rel-map data-rel-selected="${esc(b.id)}" data-rel-page="${m.currentPage}" data-rel-total="${m.total}" tabindex="0" aria-label="文鳥の関係図。左右キーで相手をめくる">
    <h3>つながりの木</h3><div class="buncho-rel-picker" data-rel-swipe="focus"><button type="button" id="game-rel-focus-prev" data-rel-focus-step="-1" aria-label="前の文鳥の関係を見る" ${m.birdCount<2?'disabled':''}>‹</button><span>だれの気持ち？</span><button type="button" id="game-rel-focus-next" data-rel-focus-step="1" aria-label="次の文鳥の関係を見る" ${m.birdCount<2?'disabled':''}>›</button></div>
    <div class="buncho-rel-diagram" data-rel-swipe="page"><div class="buncho-rel-focus" data-rel-swipe="focus">${identity(b)}<span class="buncho-rel-current">いま見ている子</span></div>
    ${m.peers.length?`<svg class="buncho-rel-branches" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${m.edges.map(e=>`<path d="${e.path}"/>`).join('')}</svg><div class="buncho-rel-peers" data-count="${m.peers.length}">${m.peers.map(o=>`<article class="buncho-rel-peer" data-rel-peer-id="${esc(o.id)}"><button type="button" class="buncho-rel-bird" data-rel-focus-id="${esc(o.id)}" aria-label="${esc(fullName(o))}の気持ちを中心に見る">${identity(o)}</button>${direction(b,o)}${direction(o,b)}<details data-game-details="relation-${esc(b.id)}-${esc(o.id)}"><summary>もっと知る</summary><dl>${metrics(b,o)}${metrics(o,b)}</dl></details></article>`).join('')}</div>`:'<p class="buncho-rel-empty">これから少しずつ、出会いが増えるよ。</p>'}</div>
    ${m.total?`<nav class="buncho-rel-pager" aria-label="つながる相手をめくる"><button type="button" id="game-rel-page-prev" data-rel-page-step="-1" aria-label="前の相手を見る" ${m.currentPage===0?'disabled':''}>‹</button><span role="status" aria-live="polite">${m.currentPage*2+1}–${m.currentPage*2+m.peers.length} / ${m.total}羽</span><button type="button" id="game-rel-page-next" data-rel-page-step="1" aria-label="次の相手を見る" ${m.currentPage===m.pageCount-1?'disabled':''}>›</button></nav>`:''}
    <p class="buncho-rel-caption">気持ちは、一羽ずつちがう。相手を押すと、その子の目線に。</p></section>`;
}
// Bind once to the game root, not per render. Caller owns only ephemeral selectedId
// and page state; onNavigate must NOT save, advance time, or mutate the world.
export function bindRelationshipNavigation(root,onNavigate) {
  let start=null,suppressClick=false;
  const click=e=>{
    const el=e.target.closest?.('[data-rel-focus-step],[data-rel-page-step],[data-rel-focus-id]');
    if(!el||!root.contains(el)||el.disabled)return;
    if(suppressClick && e.detail !== 0){e.preventDefault();suppressClick=false;return;}
    if(el.hasAttribute('data-rel-focus-id'))onNavigate({type:'focus-id',id:el.dataset.relFocusId});
    else onNavigate({type:el.hasAttribute('data-rel-focus-step')?'focus-step':'page-step',step:Number(el.dataset.relFocusStep||el.dataset.relPageStep)});
  };
  const key=e=>{if(!e.target.matches?.('[data-rel-map]')||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();onNavigate({type:'page-step',step:e.key==='ArrowLeft'?-1:1});};
  const down=e=>{suppressClick=false;const area=e.target.closest?.('[data-rel-swipe]');if(!area||!root.contains(area)||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;start={x:e.clientX,y:e.clientY,id:e.pointerId,area};};
  const up=e=>{if(!start||start.id!==e.pointerId)return;const s=start;start=null;if(e.type==='pointercancel'||!root.contains(s.area))return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.4)return;suppressClick=true;onNavigate({type:s.area.dataset.relSwipe==='focus'?'focus-step':'page-step',step:dx<0?1:-1});};
  root.addEventListener('click',click);root.addEventListener('keydown',key);root.addEventListener('pointerdown',down);const doc=root.ownerDocument;doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',up);
  return ()=>{root.removeEventListener('click',click);root.removeEventListener('keydown',key);root.removeEventListener('pointerdown',down);doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',up);start=null;};
}

/** Read-only suggestions derived from existing records. No targets or rewards are saved. */
import {DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,decorLevel,growthDuration,STAGES} from './engine.js';
import {encounterSystem,FRIENDSHIP_RULES} from './encounters.js';
import {encounterSearchHint} from './encounter-ui.js';
import {allBirds} from './world-birds.js';
import {isAlive} from './life-care.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function nextEnjoyments(w,{system=encounterSystem}={}){
 const rows=system.catalog.map(entry=>({entry,state:system.status(w,entry.id)})),known=rows.filter(r=>r.state.discovered),unmet=rows.filter(r=>!r.state.discovered);
 const next=unmet.find(r=>r.state.ready||r.state.active)||unmet.find(r=>r.entry.gardenEvent?.gardenIds?.includes(w.encounters.garden.id))||unmet[0];
 const friendly=known.filter(r=>r.state.points>=FRIENDSHIP_RULES.cagePoints),bond=known.filter(r=>r.state.points<FRIENDSHIP_RULES.cagePoints).sort((a,b)=>b.state.points-a.state.points)[0];
 const level=decorLevel(w),tiers=DECOR_TIERS.filter(t=>t.level<=level),owned=new Set(w.decor.inventory.map(i=>i.id)),total=DECOR_SLOTS.length*DECOR_COLORS.length*DECOR_TIERS.length;
 const slot=DECOR_SLOTS.find(s=>tiers.some(t=>DECOR_COLORS.some(c=>!owned.has(`${s.id}-${c.id}-${t.id}`))));
 const future=DECOR_TIERS.find(t=>t.level>level);
 const birds=allBirds(w),lead=birds.find(b=>b.id===w.protagonist.birdId);
 const growing=birds.filter(b=>b.home==='resident'&&b.stage!=='adult'&&isAlive(w,b)&&growthDuration(b)!==null).sort((a,b)=>(a.stageTick+growthDuration(a))-(b.stageTick+growthDuration(b)))[0];
 const nextStage=growing&&({egg:'chick',chick:'juvenile',juvenile:'adult'})[growing.stage];
 return [
  {id:'meeting',title:'次の出会い',progress:`出会い ${known.length} / ${rows.length}`,text:next?encounterSearchHint(next.entry,{compact:true}):rows.length?'出会った鳥の記録を読み返してみよう。':'庭をのぞいて、鳥たちを観察してみよう。',panel:'notebook',encounterId:next?.entry.id,label:next?'手がかりを見る':'庭の鳥図鑑へ'},
  {id:'friendship',title:'もっとなかよく',progress:known.length?`大のなかよし ${friendly.length} / ${known.length}`:'まずは出会いから',text:bond?`${bond.entry.name}と、あと${FRIENDSHIP_RULES.cagePoints-bond.state.points}ポイントで大のなかよし。絵をなでたり、また会ったりしてみよう。`:known.length?'会った鳥はみんな大のなかよし。好きな友達の記録を開いてみよう。':'まずは庭で出会ってみよう。会った鳥とは少しずつ親しくなれます。',panel:'notebook',encounterId:bond?.entry.id,label:bond?'この友達を見る':'友達の記録へ'},
  {id:'collection',title:'おうちを彩る',progress:`お飾り ${owned.size} / ${total}`,text:slot?`${slot.label}に、まだ持っていないお飾りがあるよ。持っているものも試してみよう。`:owned.size>=total?'お飾りが全部そろったよ！ お気に入りの組み合わせを楽しもう。':future?`今の仕上げはそろったよ。次はLv.${future.level}で${future.label}が開きます。`:'集めたお飾りで、おうちを飾ってみよう。',panel:'decorate',slotId:slot?.id,label:'お飾りを見に行く'},
  {id:'family',title:'家族のつづき',progress:lead?`いまは第${lead.generation+1}世代`:'家族の記録',text:growing?`${growing.name}は今「${STAGES[growing.stage]}」。次は「${STAGES[nextStage]}」になるのを見守ろう。`: '家族のつながりや、これまでの思い出を見返してみよう。',panel:'family',label:'家族を見に行く'}
 ];
}
export function renderNextEnjoyments(w,options){
 return `<details class="game-next-goals" data-game-details="next-goals"><summary>次のお楽しみ</summary><p class="game-small">気になるものから、のんびりどうぞ。</p><div class="game-next-goal-list">${nextEnjoyments(w,options).map(g=>`<article data-next-goal="${g.id}"><h4>${esc(g.title)}</h4><p class="game-next-goal-progress">${esc(g.progress)}</p><p>${esc(g.text)}</p><button type="button" data-goal-panel="${g.panel}"${g.encounterId?` data-goal-encounter="${esc(g.encounterId)}"`:''}${g.slotId?` data-goal-slot="${esc(g.slotId)}"`:''}>${esc(g.label)}</button></article>`).join('')}</div></details>`;
}

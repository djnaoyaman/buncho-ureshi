/** Read-only suggestions derived from existing records. No targets or rewards are saved. */
import {DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,decorLevel,growthDuration,STAGES} from './engine.js';
import {encounterSystem,FRIENDSHIP_RULES} from './encounters.js';
import {encounterSearchHint} from './encounter-ui.js';
import {allBirds} from './world-birds.js';
import {isAlive} from './life-care.js';
import {leafEventStatus} from './garden-leaf-event.js';
import {expeditionStatus,EXPEDITION_PATHS} from './garden-expedition.js';
import {showcaseStatus,SHOWCASE_THEMES,SHOWCASE_ITEMS} from './garden-showcase.js';
import {collectionEndingStatus} from './collection-endings.js';
import {crowScene} from './garden-crows.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** One contextual invitation, not a daily checklist. In-progress stories take priority. */
export function nextGardenStory(w){
 const leaf=leafEventStatus(w),trip=expeditionStatus(w),show=showcaseStatus(w);
 const trips=(w.expedition?.entries||[]).filter(e=>e.completedTick!==null).length;
 const themes=new Set(show.completed).size,items=new Set(show.owned).size;
 const base={id:'story',title:'いまのおすすめ · 庭のおはなし',progress:`探検 ${trips} / ${EXPEDITION_PATHS.length} · 発表 ${themes} / ${SHOWCASE_THEMES.length}`,panel:'outdoors'};
 const goal=(text,story,label='おはなしをひらく',gardenId)=>({...base,text,story,label,...(gardenId?{gardenId}:{})});
 if(w.paused)return {...base,text:'いまは時間を止めています。再開してから、庭の物語を楽しめるよ。思い出はそのまま。',panel:'settings',label:'暮らしの設定へ'};
 if(w.encounters.raptor?.active||w.encounters.active||crowScene(w)?.retreat)return goal('いまは鳥とのやりとり中。先に庭のようすを確かめよう。おはなしの続きはあとでも大丈夫。',null,'庭のようすを見る');
 if(show.phase==='active')return goal('発表会の途中だよ。ふたりの舞台の続きを楽しもう。','showcase','発表会の続きをひらく',show.entry.gardenId);
 if(trip.phase==='active')return goal('探検の途中だよ。ふたりと見つけたものを、おうちへ持ち帰ろう。','expedition','探検の続きをひらく',trip.entry.gardenId);
 if(['choice','ready','waiting'].includes(leaf.phase))return goal(leaf.phase==='waiting'?'はっぱを届けたり、飾ったりしたあとのお話。いったん庭を離れ、また訪ねると続きが進むよ。':'はっぱのおくりものに続きがあるよ。ふたりのようすを見てみよう。','leaf-gift','はっぱの続きをひらく',leaf.entry.gardenId);
 if(leaf.available)return goal('友達がはっぱを見つけたよ。届けるか、飾るか。どちらもすてきな始まり。','leaf-gift');
 if(show.unlocked&&themes<SHOWCASE_THEMES.length)return goal('探検の思い出を、今度は舞台で分け合おう。参加は無料。まだ遊んでいないテーマもあるよ。','showcase','発表会をひらく');
 if(trip.known.length>=2&&trip.remaining.length)return goal(trips?'ひとつの探検を思い出にできたね。別の道でも、ふたりだけの発見を楽しもう。':'交流した友達をふたり誘って、探検へ。待ち時間も参加費もなく、好きな道を選べるよ。','expedition','探検をひらく');
 if(leaf.phase!=='complete')return goal('庭では、はっぱを見つける友達に出会えるよ。別の庭ものぞいてみよう。はっぱの物語を終えると発表会への一歩になるよ。','leaf-gift','はっぱのおはなしへ');
 if(trip.known.length<2)return goal(`庭の友達と、あと${Math.max(0,2-trip.known.length)}羽交流してみよう。ふたりそろうと探検に誘えるよ。親しさの点数は条件ではないよ。`,null,'庭の友達に会う');
 if(show.unlocked&&items<SHOWCASE_ITEMS.length)return goal('探検のおもいでをお手本に、舞台のかざりを作れるよ。思い出は消えず、Goldを使わない方法もあるよ。','shop','小さなお店をひらく');
 return goal('探検と発表の思い出がそろったね。友達や飾りを変えた発表会も、何度でも無料で楽しめるよ。','showcase','もう一度楽しむ');
}
export function endingEnjoyment(w){
 const endings=collectionEndingStatus(w),unlocked=endings.filter(e=>e.unlocked).length;
 return {id:'endings',title:'思い出から、映画へ',progress:`映画 ${unlocked} / ${endings.length}`,text:endings.map(e=>`${e.title} ${e.completed}/${e.total}`).join(' · ')+'。見られる映画は日記から。急いで集めたり、危険に残ったりしなくて大丈夫。',panel:'diary',label:'映画と物語の記録へ'};
}
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
  {id:'family',title:'家族のつづき',progress:lead?`いまは第${lead.generation+1}世代`:'家族の記録',text:growing?`${growing.name}は今「${STAGES[growing.stage]}」。次は「${STAGES[nextStage]}」になるのを見守ろう。`: '家族のつながりや、これまでの思い出を見返してみよう。',panel:'family',label:'家族を見に行く'},
  nextGardenStory(w),endingEnjoyment(w)
 ];
}
export function renderNextEnjoyments(w,options){
 const goals=nextEnjoyments(w,options),story=goals.find(g=>g.id==='story'),other=goals.filter(g=>g!==story);
 const card=g=>`<article data-next-goal="${g.id}"><h4>${esc(g.title)}</h4><p class="game-next-goal-progress">${esc(g.progress)}</p><p>${esc(g.text)}</p><button type="button" data-goal-panel="${g.panel}"${g.story?` data-goal-story="${esc(g.story)}"`:''}${g.gardenId?` data-goal-garden="${esc(g.gardenId)}"`:''}${g.encounterId?` data-goal-encounter="${esc(g.encounterId)}"`:''}${g.slotId?` data-goal-slot="${esc(g.slotId)}"`:''}>${esc(g.label)}</button></article>`;
 return `<details class="game-next-goals" data-game-details="next-goals"><summary>次のお楽しみ</summary><p class="game-small">おすすめはひとつ。気になるものから、のんびりどうぞ。</p><div class="game-next-goal-list">${card(story)}</div><details data-game-details="next-goals-other"><summary>ほかの楽しみ・映画の進みぐあい</summary><div class="game-next-goal-list">${other.map(card).join('')}</div></details></details>`;
}

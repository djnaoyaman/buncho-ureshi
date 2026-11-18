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
 const base={id:'story',title:'いまのおすすめ · にわのおはなし',progress:`たんけん ${trips} / ${EXPEDITION_PATHS.length} · はっぴょう ${themes} / ${SHOWCASE_THEMES.length}`,panel:'outdoors'};
 const goal=(text,story,label='おはなしをひらく',gardenId)=>({...base,text,story,label,...(gardenId?{gardenId}:{})});
 if(w.paused)return {...base,text:'いまはゲームの時間を止めているよ。「つづける」を押すと、にわでまたあそべるよ。おもいでは消えないよ。',panel:'settings',label:'くらしのボタンへ'};
 if(w.encounters.raptor?.active||w.encounters.active||crowScene(w)?.retreat)return goal('いまは鳥とやりとりしているよ。まず、にわを見よう。おはなしのつづきは、あとでもだいじょうぶ。',null,'にわのようすを見る');
 if(show.phase==='active')return goal('はっぴょう会のとちゅうだよ。ふたりのつづきを見よう。','showcase','はっぴょう会のつづきへ',show.entry.gardenId);
 if(trip.phase==='active')return goal('たんけんのとちゅうだよ。ふたりと見つけたものを、おうちへ持ち帰ろう。','expedition','たんけんのつづきへ',trip.entry.gardenId);
 if(['choice','ready','waiting'].includes(leaf.phase))return goal(leaf.phase==='waiting'?'はっぱをとどけたり、かざったりしたあとのお話だよ。いちどおうちに帰って、またこのにわに来よう。つづきが見られるよ。':'はっぱのおくりものにつづきがあるよ。ふたりのようすを見よう。','leaf-gift','はっぱの続きをひらく',leaf.entry.gardenId);
 if(leaf.available)return goal('友だちがはっぱを見つけたよ。とどける？ かざる？ どちらをえらんでもだいじょうぶ。','leaf-gift');
 if(show.unlocked&&themes<SHOWCASE_THEMES.length)return goal('たんけんのおもいでを、みんなに見せよう。お金はかからないよ。まだあそんでいない出しものもあるよ。','showcase','はっぴょう会をひらく');
 if(trip.known.length>=2&&trip.remaining.length)return goal(trips?'ひとつのたんけんがおもいでになったね。ほかの道でも、ふたりと何かを見つけよう。':'お話やあそびをした友だちを、ふたりえらぼう。好きな道をえらぶと、すぐにたんけんできるよ。お金はかからないよ。','expedition','たんけんをひらく');
 if(leaf.phase!=='complete')return goal('にわには、はっぱを見つける友だちがいるよ。ほかのにわも見てみよう。はっぱのお話は、はっぴょう会にもつながるよ。','leaf-gift','はっぱのおはなしへ');
 if(trip.known.length<2)return goal(`にわの友だちと、あと${Math.max(0,2-trip.known.length)}羽、お話やあそびをしよう。ふたりそろうと、たんけんにさそえるよ。なかよしの点数は、いくつでもだいじょうぶ。`,null,'にわの友だちに会う');
 if(show.unlocked&&items<SHOWCASE_ITEMS.length)return goal('たんけんで見つけたものをお手本に、かざりを作れるよ。Goldを使わずに作ることもできるよ。おもいでは消えないよ。','shop','小さなお店をひらく');
 return goal('たんけんとはっぴょう会のおもいでがそろったね。友だちやかざりを変えて、またあそぼう。何度あそんでも、お金はかからないよ。','showcase','もういちどあそぶ');
}
export function endingEnjoyment(w){
 const endings=collectionEndingStatus(w),unlocked=endings.filter(e=>e.unlocked).length;
 return {id:'endings',title:'おもいでの映画',progress:`映画 ${unlocked} / ${endings.length}`,text:endings.map(e=>`${({'garden':'にわの鳥','crows':'カラス','raptors':'大空の鳥','garden-tour':'にわめぐり'})[e.id]||e.title} ${e.completed}/${e.total}`).join(' · ')+'。見られるようになった映画は、日記からひらけるよ。あわてて集めなくてだいじょうぶ。あぶないときは、おうちへ帰ろう。',panel:'diary',label:'映画とおもいでを見る'};
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
  {id:'meeting',title:'次の出会い',progress:`出会い ${known.length} / ${rows.length}`,text:next?encounterSearchHint(next.entry,{compact:true}):rows.length?'会った鳥のページを、もういちど読んでみよう。':'にわで、鳥たちを見てみよう。',panel:'notebook',encounterId:next?.entry.id,label:next?'手がかりを見る':'にわの鳥ずかんへ'},
  {id:'friendship',title:'もっとなかよく',progress:known.length?`大のなかよし ${friendly.length} / ${known.length}`:'まずは出会いから',text:bond?`${bond.entry.name}と、あと${FRIENDSHIP_RULES.cagePoints-bond.state.points}ポイントで大のなかよし。絵をなでたり、また会ったりしてみよう。`:known.length?'会った鳥はみんな大のなかよし。好きな友だちのページをひらこう。':'まずはにわで会ってみよう。会った鳥とは、少しずつなかよくなれるよ。',panel:'notebook',encounterId:bond?.entry.id,label:bond?'この友だちを見る':'友だちのページへ'},
  {id:'collection',title:'おうちをかざる',progress:`おかざり ${owned.size} / ${total}`,text:slot?`${slot.label}に、まだ持っていないおかざりがあるよ。持っているものも、つけてみよう。`:owned.size>=total?'おかざりが全部そろったよ！ 好きなものを組み合わせよう。':future?`今えらべるおかざりは、そろったよ。レベル${future.level}になると「${future.label}」もえらべるよ。`:'集めたおかざりを、おうちにつけてみよう。',panel:'decorate',slotId:slot?.id,label:'おかざりを見に行く'},
  {id:'family',title:'かぞくのつづき',progress:lead?`いまは${lead.generation+1}代目のかぞく`:'かぞくのページ',text:growing?`${growing.name}は今「${({egg:'たまご',chick:'ひな',juvenile:'子どもの鳥',adult:'大人の鳥'})[growing.stage]||STAGES[growing.stage]}」。次は「${({egg:'たまご',chick:'ひな',juvenile:'子どもの鳥',adult:'大人の鳥'})[nextStage]||STAGES[nextStage]}」になるのを、見まもろう。`: 'かぞくのつながりや、これまでのおもいでを見よう。',panel:'family',label:'かぞくを見に行く'},
  nextGardenStory(w),endingEnjoyment(w)
 ];
}
export function renderNextEnjoyments(w,options){
 const goals=nextEnjoyments(w,options),story=goals.find(g=>g.id==='story'),other=goals.filter(g=>g!==story);
 const card=g=>`<article data-next-goal="${g.id}"><h4>${esc(g.title)}</h4><p class="game-next-goal-progress">${esc(g.progress)}</p><p>${esc(g.text)}</p><button type="button" data-goal-panel="${g.panel}"${g.story?` data-goal-story="${esc(g.story)}"`:''}${g.gardenId?` data-goal-garden="${esc(g.gardenId)}"`:''}${g.encounterId?` data-goal-encounter="${esc(g.encounterId)}"`:''}${g.slotId?` data-goal-slot="${esc(g.slotId)}"`:''}>${esc(g.label)}</button></article>`;
 return `<details class="game-next-goals" data-game-details="next-goals"><summary>次のお楽しみ</summary><p class="game-small">おすすめはひとつ。気になるものから、のんびりどうぞ。</p><div class="game-next-goal-list">${card(story)}</div><details data-game-details="next-goals-other"><summary>ほかのあそび・映画まであとどのくらい？</summary><div class="game-next-goal-list">${other.map(card).join('')}</div></details></details>`;
}

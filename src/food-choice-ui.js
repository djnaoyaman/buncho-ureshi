import {FOOD_CATALOG,foodGrowthStatus,FOOD_GROWTH_RULES} from './food-growth.js';
import {GROWTH_RULES} from './engine.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** This selector never feeds a bird or changes saved growth by itself. */
export function renderFoodChoice(bird,now,{selectedFood='seed',alive=true}={}){
 if(!alive||bird.home==='departed'||!['juvenile','adult'].includes(bird.stage))return '';
 const food=FOOD_CATALOG.find(f=>f.id===selectedFood)||FOOD_CATALOG[0],base=GROWTH_RULES[bird.growthPace]?.juvenile||GROWTH_RULES.relaxed.juvenile;
 const benefit=f=>{const ticks=Math.floor(base*f.growthPercent/100);return ticks?`幼鳥の期間 約−${Math.round(ticks/base*1000)/10}%`:'今までのペース';};
 const state=foodGrowthStatus(bird,base,now),total=Math.round(state.bonusTicks/base*1000)/10;
 const status=!state.eligible?(bird.stage==='adult'?'成鳥は成長時間が変わりません。好きなごはんで交流しよう。':'遊びに来た友達は、成長の後押しの対象外です。ごはんで交流しよう。'):state.bonusTicks>=state.capTicks?'成長の後押しは上限まで届いたよ。これからも好きなごはんをどうぞ。':!state.ready?`次の成長の後押しまで、あと約${Math.max(1,Math.ceil((state.nextBonusAt-now)/3600000))}実時間。ごはんのお世話は、今までどおりできます。`:'次に成功する対象のごはんで、成長を少し後押しできます。';
 return `<details class="game-food-choice" data-game-details="food-choice"><summary>ごはんを選ぶ · ${esc(food.label)}</summary><label for="game-food-choice">今日のごはん（すべて無料）</label><select id="game-food-choice" data-game-food-choice data-food-bird="${esc(bird.id)}">${FOOD_CATALOG.map(f=>`<option value="${f.id}"${f.id===food.id?' selected':''}>${esc(f.label)} · ${benefit(f)}</option>`).join('')}</select><p data-food-status>${esc(status)}</p>${state.eligible?`<p>これまでの短縮：${total}%（最大${FOOD_GROWTH_RULES.maxPercent}%）</p>`:''}<p class="game-small">選んだあと「ごはん」を押すと食べます。以前の短い成長期間の子は、刻み幅により後押しが小さくなることがあります。どれもおなかの回復とお礼は同じ。成長の後押しは実時間24時間に1回、幼鳥の期間だけです。寿命や健康は変わりません。家族まとめてのお世話と飼育員さんは、いつものごはんで育ちます。</p><p class="game-small">ゲームだけの成長表現です。現実の鳥の食事や栄養効果とは異なります。</p></details>`;
}

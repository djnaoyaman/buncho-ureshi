import {writeFileSync} from 'node:fs';
import {simulateCare} from './lib/care-rule-model.mjs';
const cases=[];
for(const days of [7,28])for(const rate of [20,30,40])for(const policy of ['R','H'])for(const birds of [1,6])for(const visits of [1,3])for(const caretaker of [false,true]){
 const r=simulateCare({days,rate,policy,birds,visits,caretaker});const {rows,...summary}=r;cases.push(summary);
}
const exceptions=[];
for(const [label,config] of [['週末のみ',{weekendOnly:true}],['3日間不在',{absentDays:[1,2,3]}],['低残高で契約希望',{caretaker:true,initialGold:0}],['初日',{days:1}],['朝だけ',{hours:[7]}],['夜だけ',{hours:[23]}]])for(const policy of ['R','H']){const {rows,...r}=simulateCare({days:28,birds:1,visits:1,...config,policy});exceptions.push({label,...r});}
const n=v=>v===null?'未到達':Number(v.toFixed(2));
let md=`# お世話ルールの比較試算\n\n作成日 2026年11月12日。再現コマンド \`node scripts/compare-care-rules.mjs\`。実測や児童による評価ではなく、採用前の経済モデル。ゲーム本体はこのモデルを読み込まない。\n\n## 前提\n\n初期ゲージ100、獲得Gems 0、月曜開始。同じ家族が継続し、1日1回は21時、3回は8・18・21時。各訪問で不足を20ずつ満タンまで回復。初期20 Gems、初心者祝い、成長、贈り物、庭、落とし物は含めず、その他Gemsは0。物語停止を想定するが、現行健康期限は別に進む。落とし物を回収する遊びはこの表の到達時点を早め得る。ガチャの価格だけを20/50/100として、確率・重複返却・所持品は変更しない。\n\nRは実回復20につき食事6・交流5 Gemsを累積計算。Hは比較用に家庭30 Gems/訪問日と、回復分を家庭10 Gems/日までの追加分として仮置き。持ち越しはしない。Hの基礎受取とGold受取を各1操作と数える。飼育員は最初に全期間分を払える残高を確保して契約。Gold収支は既存30/訪問日から24/契約日を引く。低残高例では無料契約にしない。\n\n到達は開始からの日数。購入間隔は、各価格だけを繰り返し購入したときの獲得累計から算出した平均日数で、同じ訪問内の複数購入も含む。Goldでの飾り購入は混ぜない。最終日の集計は21時まで。\n\n**週末のみ・3日不在は、現行健康ルールのまま実現できる収入予測ではない。** 家族が生存し続けると仮定した経済の潜在値であり、現行72時間期限と衝突する。休暇保護を採用する場合も、既に亡くなった鳥を戻す方式にはしない。\n\n## 全96条件\n\n|日数|減少/日|案|羽|訪問/日|飼育員|操作|直接Gems（基礎/追加）|その他Gems|Gold収支|20/50/100到達(日)|購入間隔(日)|\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for(const r of cases)md+=`|${r.days}|${r.rate}|${r.policy}|${r.birds}|${r.visits}|${r.caretaker?'あり':'なし'}|${r.actions}|${r.directGems}（${r.baseGems}/${r.extraGems}）|0|${r.netGold}|${[20,50,100].map(c=>n(r.firstReachDays[c])).join(' / ')}|${[20,50,100].map(c=>n(r.averagePurchaseIntervalDays[c])).join(' / ')}|\n`;
md+='\n## 例外条件\n\n|例|案|基礎Gems|追加/直接Gems|操作|Gold収支|給餌間隔の最大(時間)|現行72時間との衝突|\n|---|---|---|---|---|---|---|---|\n';
for(const r of exceptions)md+=`|${r.label}|${r.policy}|${r.baseGems}|${r.extraGems}/${r.directGems}|${r.actions}|${r.netGold}|${n(r.maxUnfedHours)}|${r.healthWarning?'あり':'この条件ではなし'}|\n`;
md+=`\n## 判断に使う要点\n\n- Rは同じ総回復量なら端数を持ち越して同じ報酬になる。一方、下限に到達する不在や飼育員による自動回復では、手動回復の量が減り、直接Gemsも減る。\n- Hの基礎は訪問日あたり30で、1羽/6羽、1回/3回、契約の有無で変わらない。追加分は最大10までで、契約中は0。この総額差を許すか、追加を0にするかが判断点。\n- 通常条件で30/日のRは約16.5 Gems/羽/日。従来の全3枠を埋める66 Gems/羽/日とは大きく違う。既存の30 GoldはGemsとは別通貨なので、補填として合算しない。\n- 朝/夜でHの基礎は同じ。回復量の差は開始から最初の訪問までの経過時間による。時間帯の特別報酬はない。\n- 満タン維持はこの比較のGold受取条件に残る。生活への誘因を完全に解消したモデルとは言えない。基礎Gemsを受け取るためだけの満タン条件はHにはない。\n- 落とし物8 Gemsは現行では給餌後のしぐさと物語時間で発生する。本モデルでは回収0とし、通常操作の満腹再給餌で新たな発生待ちを作らないことを実エンジンのテストで別に確認する。連続減少を採用する前には、微小回復から落とし物を繰り返す経路も、追加上限に含める設計を確定する必要がある。\n- これは学校・睡眠への無影響や楽しさを証明しない。家庭での任意の感想、短時間で終えられるかは未計測。\n`;
writeFileSync('docs/CARE-MODEL-COMPARISON.md',md);
console.log(`Wrote ${cases.length} normal and ${exceptions.length} exception scenarios.`);

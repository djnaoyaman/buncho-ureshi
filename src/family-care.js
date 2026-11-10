import {feedBird,petBird,economyToken} from './engine.js';
import {isAlive} from './life-care.js';

const eligible=(w,b)=>b.home==='resident'&&['juvenile','adult'].includes(b.stage)&&isAlive(w,b);
const targets=w=>w.birds.filter(b=>eligible(w,b));
function operation(kind){if(!['feed','pet'].includes(kind))throw new Error('お世話の種類を選んでね。');return kind==='feed'?feedBird:petBird;}
/** Presentation only; the action rechecks the saved world and its real care clock. */
export function familyCareStatus(w,kind){
 operation(kind);const family=targets(w),count=family.filter(b=>b.needs[kind==='feed'?'food':'energy']<100).length;
 return {ready:w.field.place==='home'&&count>0,count,total:family.length};
}
/** One ordinary action per family member, in the same order and one transaction.
 * No extra rewards, story ticks, randomness, save fields or summary diary events. */
export function careFamily(w,kind,token,now=Date.now()){
 const apply=operation(kind);
 if(token?.worldId!==w.worldId||token?.revision!==w.revision)return {changed:false,gemAward:0,goldAward:0,results:[],message:'おうちが変わったよ。もう一度選んでね。'};
 if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw new Error('端末の日時を確認してください。');
 if(w.field.place!=='home')return {changed:false,gemAward:0,goldAward:0,results:[],message:'おうちに戻って、家族のお世話をしよう。'};
 const results=[];
 // The first ordinary action can process an expired illness for another bird.
 for(const bird of targets(w))if(eligible(w,bird))results.push(apply(w,bird.id,now,economyToken(w)));
 const count=results.filter(r=>r.changed).length;
 return {changed:count>0,gemAward:results.reduce((n,r)=>n+(r.gemAward||0),0),goldAward:results.reduce((n,r)=>n+(r.goldAward||0),0),results,message:count?`家族${count}羽${kind==='feed'?'にごはんをあげたよ。':'とふれ合ったよ。'}`:'家族のお世話は済んでいるよ。卵やひなは、そっと見守ろう。'};
}

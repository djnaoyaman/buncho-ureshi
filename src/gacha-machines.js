/** One authoritative definition for pre-draw prices, probabilities and refunds.
 * Balancing values chosen for this implementation, not prior user-confirmed odds. */
export const GACHA_MACHINES=Object.freeze([
 Object.freeze({id:'house',name:'小さな文鳥のおうち',cost:20,refund:8,level:1,weights:Object.freeze([.65,.25,.10]),image:'house-v1.webp'}),
 Object.freeze({id:'cloud',name:'雲の上',cost:50,refund:20,level:6,weights:Object.freeze([.35,.35,.30]),image:'cloud-v1.webp'}),
 Object.freeze({id:'round',name:'まんまる文鳥',cost:100,refund:40,level:6,weights:Object.freeze([.15,.35,.50]),image:'round-v1.webp'})
]);
export function gachaMachine(id='house'){const m=GACHA_MACHINES.find(m=>m.id===id);if(!m)throw new Error('ガチャを選んでね。');return m;}

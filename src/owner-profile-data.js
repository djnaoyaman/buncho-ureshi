/** Shared, normalized wardrobe data for the scene and editor. */
export const OWNER_CHOICES=Object.freeze({
 hair:[['crop','こもれびショート'],['bob','まあるいボブ'],['wave','やわらかウェーブ'],['bun','おだんご'],['sweep','風の前髪']],
 skin:[['porcelain','さくら色','#f4d8c4'],['peach','もも色','#e8b89c'],['honey','はちみつ色','#c8946e'],['umber','こはく色','#9c674c'],['deep','くり色','#704a39']],
 hairColor:[['chestnut','くり','#624a3e'],['ink','すみ','#34383e'],['tea','ミルクティー','#ae8b64'],['silver','しろがね','#c8c9c2'],['rose','あずき','#8f6265'],['sage','セージ','#738c80']],
 outfit:[['apron','文鳥のエプロン'],['cardigan','羽根のカーディガン'],['smock','庭しごとのスモック'],['dress','こもれびワンピース'],['overalls','種まきオーバーオール']],
 palette:[['white','白文鳥','#e9e5d8','#a79c85'],['sakura','桜文鳥','#b8b9bf','#745e65'],['silver','シルバー','#c5d5d6','#698b96'],['cinnamon','シナモン','#cfaa83','#927253'],['leaf','若葉','#b7c7a8','#6b8564'],['petal','花びら','#e1b8bc','#a77780']],
 accessory:[['none','小物なし'],['birdpin','文鳥ブローチ'],['leafbag','葉っぱのポシェット'],['beret','どんぐりベレー'],['scarf','羽色のスカーフ']],
 face:[['round','まる顔'],['oval','たまご顔'],['soft','ふっくら顔']],
 eyes:[['gentle','やさしい目'],['bright','ぱっちり'],['smile','にっこり']]
});
export const DEFAULT_OWNER=Object.freeze({version:1,name:'飼い主さん',hair:'bob',skin:'peach',hairColor:'chestnut',outfit:'apron',palette:'leaf',accessory:'birdpin',eyes:'gentle',face:'round'});
const valid=(key,value)=>OWNER_CHOICES[key].some(row=>row[0]===value);
export function normalizeOwnerProfile(value={}){
 const p={...DEFAULT_OWNER};
 if(!value||typeof value!=='object'||Array.isArray(value))return p;
 if(typeof value.name==='string')p.name=Array.from(value.name.replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,24).join('')||DEFAULT_OWNER.name;
 for(const key of Object.keys(OWNER_CHOICES))if(valid(key,value[key]))p[key]=value[key];
 return p;
}

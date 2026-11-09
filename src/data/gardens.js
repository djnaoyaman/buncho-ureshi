import {allBirds} from '../world-birds.js';
import {isAlive} from '../life-care.js';
import {GARDEN_ASSETS} from './garden-assets.js';
/** Twelve fictional, always-open social gardens. No real-world arrival/season promises. */
export const GARDENS=Object.freeze([
 {id:'komorebi',ambience:'葉擦れ・木の椅子の小さな音',name:'こもれびの庭',scene:'quiet',landform:'森のくぼみ',description:'大きな木、苔の石、木の椅子。枝と地面に友達が集まる。',objects:['大きな木','苔の石','木の椅子'],spots:[{x:24,y:38,label:'低い枝'},{x:63,y:64,label:'木の椅子'},{x:38,y:79,label:'苔の石'}],actions:[['chat','木陰でおしゃべり'],['watch','木漏れ日を眺める'],['play','葉っぱを追う']],event:'葉っぱのおたより',music:{themeId:'garden-komorebi',concept:'木管と柔らかい撥弦、ゆっくり揺れる拍子',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'mizukagami',ambience:'控えめな水滴・波紋',name:'みずかがみの庭',scene:'water',landform:'浅い池と飛び石',description:'浅い水面、飛び石、水草。左右の岸から友達の顔が見える。',objects:['浅い水面','飛び石','水草'],spots:[{x:18,y:68,label:'西の岸'},{x:52,y:55,label:'飛び石'},{x:83,y:73,label:'東の岸'}],actions:[['watch','水面を一緒に眺める'],['chat','飛び石でごあいさつ'],['play','波紋の絵あそび']],event:'水鏡のまねっこ',music:{themeId:'garden-mizukagami',concept:'ガラス音と静かなピアノ、ゆったりした波',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'komugi',ambience:'穂の擦れる音・木柵',name:'こむぎの庭',scene:'grass',landform:'穂の間の一本道',description:'穂、低い木柵、曲がった小道。柵や草の間で小さな会話。',objects:['穂の群れ','低い木柵','曲がった小道'],spots:[{x:20,y:53,label:'木柵'},{x:56,y:76,label:'小道'},{x:79,y:48,label:'穂のそば'}],actions:[['play','穂の揺れをまねる'],['chat','柵でおしゃべり'],['watch','小道でひと休み']],event:'ゆれる穂のかくれんぼ',music:{themeId:'garden-komugi',concept:'素朴な弦と軽い手打ち、歩くテンポ',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'hanadokei',ambience:'小さな時計の鈴・花びら',name:'はなとけいの庭',scene:'song',landform:'円い花壇の広場',description:'円い花壇、日時計、放射状の小径。中央を囲んで友達が向き合う。',objects:['円い花壇','日時計','放射状の小径'],spots:[{x:27,y:65,label:'花壇の西'},{x:50,y:38,label:'日時計のそば'},{x:74,y:65,label:'花壇の東'}],actions:[['play','花の輪をたどる'],['chat','花壇でおしゃべり'],['watch','日時計を眺める']],event:'花の輪のごあいさつ',music:{themeId:'garden-hanadokei',concept:'チェレスタと丸いワルツ、花びらの応答',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'kazaguruma',ambience:'風車の木音・柔らかな風',name:'かざぐるまの丘',scene:'grass',landform:'空にひらけた丘',description:'なだらかな丘、風車、広い空。高低差のある止まり場で遊ぶ。',objects:['丘の稜線','風車','広い空'],spots:[{x:18,y:76,label:'丘のふもと'},{x:56,y:47,label:'丘の上'},{x:82,y:64,label:'風車のそば'}],actions:[['watch','風車を眺める'],['play','風のポーズ'],['chat','丘でおしゃべり']],event:'くるくる風の合図',music:{themeId:'garden-kazaguruma',concept:'笛と軽快な木琴、広がる旋律',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'yuyake',ambience:'木箱の軽い音・夕方を思わせる余韻',name:'ゆうやけ果樹園',scene:'branch',landform:'低い果樹の並木',description:'低い果樹、木箱、小さな卓。枝とテーブルを囲む温かな庭。',objects:['低い果樹','木箱','小さな卓'],spots:[{x:21,y:40,label:'低い枝'},{x:54,y:73,label:'小さな卓'},{x:82,y:67,label:'木箱'}],actions:[['chat','卓でおしゃべり'],['watch','木の実の絵を見る'],['play','木箱のリズム']],event:'木の実の絵のお茶会',music:{themeId:'garden-yuyake',concept:'ナイロン弦と温かい鍵盤、穏やかな二拍子',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'tsukiakari',ambience:'静かなベル・長い休符',name:'つきあかりの庭',scene:'quiet',landform:'月と白花の小広場',description:'月、白い花、小さな灯。離れた灯のそばで静かに過ごす。',objects:['大きな月','白い花','小さな灯'],spots:[{x:20,y:72,label:'白花のそば'},{x:49,y:58,label:'小さな灯'},{x:81,y:77,label:'庭の端'}],actions:[['watch','月を一緒に眺める'],['chat','小声でおしゃべり'],['play','星のかたちあそび']],event:'白花のしずかな便り',music:{themeId:'garden-tsukiakari',concept:'ハープと柔らかいベル、間を生かす子守歌',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'shrine-grove',ambience:'葉擦れ・遠い鈴（架空の社）',name:'こもりの杜',scene:'quiet',landform:'架空の社へ続く苔の石段',description:'架空の社を囲む、朱い鳥居、苔の石段、御神木、小さな社。落葉と石灯籠のそばで友達と待ち合わせ。',objects:['朱い鳥居','苔の石段','御神木','小さな社','石灯籠'],spots:[{x:24,y:76,label:'石段の下'},{x:62,y:51,label:'御神木の枝'},{x:79,y:76,label:'石灯籠のそば'}],actions:[['chat','境内でごあいさつ'],['watch','落ち葉を見つける'],['play','祭りの待ち合わせ']],event:'落ち葉の待ち合わせ',music:{themeId:'garden-shrine-grove',concept:'笛と箏、葉擦れと遠い鈴。実在神社の祭礼曲は再現しない',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
 {id:'onsen',ambience:'遠い湯音・木の休憩処',name:'湯気文吾温泉',scene:'water',landform:'湯屋と石畳の待合',description:'湯屋、湯けむり、石畳、休憩処。飼い主は浴衣、鳥は温泉に入らず離れた止まり木や鳥用の水浴び場へ。',objects:['湯屋','湯けむり','石畳','休憩処','鳥用の水浴び場'],spots:[{x:21,y:70,label:'待合の止まり木'},{x:57,y:76,label:'休憩処'},{x:84,y:64,label:'温泉から離れた鳥用水浴び場'}],actions:[['chat','湯上がりの待ち合わせ'],['watch','離れて湯けむりを眺める'],['play','休憩処でひと休み']],event:'湯けむりの向こうのごあいさつ',music:{themeId:'garden-onsen',concept:'柔らかい木琴と弦、湯上がりの穏やかな間',asset:null,releaseReady:false},background:{src:null,releaseReady:false}},
{"id": "java-rice", "name": "ジャワ・こずえの庭", "scene": "grass", "landform": "ジャワの森を見下ろす大木の枝", "description": "大きな木の上から、水田と遠い火山を眺める創作の庭。広い枝の上で友達とゆっくり過ごす。", "objects": ["大きな木の枝", "緑の水田", "遠い火山"], "ambience": "葉擦れと樹上を通る風", "event": "稲穂のおたより", "music": {"concept": "柔らかな金属打楽器と竹笛、周期的なゴング。伝統曲ではなく独自のゲーム音楽", "themeId": "garden-java-rice", "asset": null, "releaseReady": false}, "spots": [{"x": 25, "y": 65, "label": "広い枝"}, {"x": 50, "y": 68, "label": "木漏れ日の止まり場"}, {"x": 75, "y": 70, "label": "枝の先"}], "actions": [["chat", "木の上でおしゃべり"], ["watch", "水田を見下ろす"], ["play", "木漏れ日を探す"]], "background": {}},
{"id": "bali-terrace", "name": "バリ・みどりの棚田", "scene": "water", "landform": "海を望むバリの棚田の展望広場", "description": "青い海と棚田を見渡す、バリ島を思わせる創作の庭。花とヤシに囲まれた石の広場で友達と休む。", "objects": ["青い海", "緑の棚田", "石の広場", "ヤシの木"], "ambience": "細い水路とヤシの葉擦れ", "event": "水の段々のあいさつ", "music": {"concept": "金属打楽器の掛け合いと軽い木音。伝統曲ではなく独自のゲーム音楽", "themeId": "garden-bali-terrace", "asset": null, "releaseReady": false}, "spots": [{"x": 36, "y": 68, "label": "広場の左"}, {"x": 54, "y": 70, "label": "広場の中央"}, {"x": 72, "y": 69, "label": "広場の右"}], "actions": [["chat", "友達とおしゃべり"], ["watch", "風景を観察する"], ["play", "小道をチョンチョン"]], "background": {}},
{"id": "paris-unrest", "name": "パリ・ざわめく街の庭", "scene": "quiet", "landform": "ノートルダムを望む石のテラス", "description": "ノートルダム大聖堂と、遠くの街路に暴動による炎や煙が見える架空のパリ。友達は火から離れた石のテラスで過ごす。実際の事件を再現するものではありません。", "objects": ["ノートルダム大聖堂", "遠い炎と煙", "セーヌ川", "石のテラス"], "ambience": "遠い街のざわめきと静かな中庭", "event": "中庭の待ち合わせ", "music": {"concept": "短調のピアノ、低い弦、控えめな打音のオリジナル曲", "themeId": "garden-paris-unrest", "asset": null, "releaseReady": false}, "spots": [{"x": 36, "y": 68, "label": "広場の左"}, {"x": 54, "y": 70, "label": "広場の中央"}, {"x": 72, "y": 69, "label": "広場の右"}], "actions": [["chat", "友達とおしゃべり"], ["watch", "風景を観察する"], ["play", "小道をチョンチョン"]], "background": {}},
].map(g=>Object.freeze({...g,background:{...g.background,...GARDEN_ASSETS[g.id].background},music:{...g.music,...GARDEN_ASSETS[g.id].music}})));
export const GARDEN_IDS=Object.freeze(GARDENS.map(g=>g.id));
export const LEGACY_GARDEN_IDS=Object.freeze(GARDEN_IDS.slice(0,9));
export const gardenById=id=>GARDENS.find(g=>g.id===id)||null;
/** Actual attendees are frozen at departure. A saved warning keeps its exact living
 * target present until the event ends, even after migration or preference changes. */
export function gardenCompanionRoster(world){
 const state=world.encounters?.gardenFriends,active=world.encounters?.raptor?.active;
 const ids=[...(state?.attendees||[]),...(active&&active.targetBirdId===(world.protagonist?.birdId||'b1')?[active.targetBirdId]:[])];
 return [...new Set(ids)].flatMap(id=>{const b=allBirds(world).find(x=>x.id===id);return b&&b.home==='resident'&&isAlive(world,b)&&['juvenile','adult'].includes(b.stage)?[{birdId:b.id,name:b.name,color:b.color,kind:'companion'}]:[];});
}
/** References existing close friends; never moves household membership or spawns. */
export function gardenFriendRoster(world,id){
 const garden=gardenById(id),state=world.encounters?.gardenFriends;if(!garden||!state)return [];
 const snapshot=state.visits?.find(v=>v.gardenId===id),attendees=new Set(gardenCompanionRoster(world).map(b=>b.birdId));
 // Old saves have no snapshot yet. A static regular-only fallback cannot reroll as
 // relationships change; the next real visit records a new complete selection.
 const ids=snapshot?.friendIds||drawGardenFriendIds(world,id,{regularsOnly:true});
 return ids.flatMap(friendId=>{
  const r=state.regulars.find(r=>r.id===friendId);
  if(r)return [{friendId:r.id,birdId:null,name:r.name,color:r.appearance.color,kind:r.primaryGardenId===id?'regular':'visiting',affinity:r.affinity,memories:r.memories.map(m=>({...m})),personality:r.personality}];
  const ref=state.references.find(r=>r.id===friendId),b=ref&&allBirds(world).find(b=>b.id===ref.birdId);
  if(!b||!isAlive(world,b)||!['juvenile','adult'].includes(b.stage)||b.home!=='departed'||attendees.has(b.id))return [];
  return [{friendId:ref.id,birdId:b.id,name:b.name,color:b.color,kind:'known',affinity:ref.affinity,memories:ref.memories.map(m=>({...m})),personality:'親しい文鳥の友達'}];
 }).map((r,i)=>({...r,spot:garden.spots[i%garden.spots.length]}));
}
export function closeGardenAcquaintance(world,bird,reference=null){
 const protagonistId=world.protagonist?.birdId||'b1',lead=allBirds(world).find(b=>b.id===protagonistId),bond=lead?.relations?.[bird.id];
 return bird.id!==protagonistId&&bird.home==='departed'&&isAlive(world,bird)&&['juvenile','adult'].includes(bird.stage)&&((bond?.affection>65&&bond?.trust>50)||(reference?.affinity||0)>=60);
}
/** Select actual IDs once per visit. Later deaths, home moves or new relationships
 * may remove an unavailable guest, but never replace or reshuffle the others. */
export function drawGardenFriendIds(world,id,{regularsOnly=false}={}){
 const state=world.encounters.gardenFriends,visit=world.encounters.garden.visits[id]||0;
 const regulars=state.regulars.map(r=>r.id),close=regularsOnly?[]:state.references.filter(r=>{const b=allBirds(world).find(b=>b.id===r.birdId);return b&&closeGardenAcquaintance(world,b,r);}).map(r=>r.id);
 const bag=shuffleGardenPool([...regulars,...close],`${world.worldId}:${id}`),count=Math.min(4,bag.length),offset=(visit*count)%Math.max(1,bag.length);
 return shuffleGardenPool(Array.from({length:count},(_,i)=>bag[(offset+i)%bag.length]),`${world.worldId}:${id}:${visit}`);
}
/** Pure request for the existing audio owner. Never enables audio, loads URLs, or changes the four original tracks. */
export function gardenAudioIntent({gardenId,mode='off',selectedTrackId=null,enabled=false,reducedMotion=false}={}){
 if(!enabled||mode==='off')return {kind:'silence',fadeMs:reducedMotion?0:900};
 if(mode==='fixed')return {kind:'selected-track',trackId:selectedTrackId,fadeMs:0};
 const g=gardenById(gardenId);if(mode!=='auto'||!g)return {kind:'silence',fadeMs:0};
 return (g.music.releaseReady||g.music.trialAvailable)&&g.music.asset?{kind:'garden-theme',themeId:g.music.themeId,asset:g.music.asset,loopStartSeconds:g.music.loopStartSeconds,loopEndSeconds:g.music.loopEndSeconds,fadeMs:reducedMotion?0:1400}:{kind:'retain-current',reason:'theme-not-ready',fadeMs:0};
}

/** Art direction follows the actual stage, not the browser window. IDs and saves do not change. */
export function gardenBackgroundForStage(gardenId,width,height){
 const bg=gardenById(gardenId)?.background;
 return bg?.landscape&&width>0&&height>0&&width/height>=bg.landscapeMinAspect?{...bg,...bg.landscape}:bg;
}

/** Cover crop preserves the selected source terrain contact point, never stretches art. */
export function gardenStageGeometry(gardenId,width,height){
 const bg=gardenBackgroundForStage(gardenId,width,height);if(!bg||!Number.isFinite(width)||!Number.isFinite(height)||!(width>0&&height>0))return null;
 const selectedIndex=Math.min(1,bg.friendFeet.length-1),anchor=bg.friendFeet[selectedIndex],scale=Math.max(width/bg.width,height/bg.height),drawWidth=bg.width*scale,drawHeight=bg.height*scale;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const offsetX=clamp(width*.5-anchor.x*drawWidth,width-drawWidth,0),offsetY=clamp(height*.65-anchor.y*drawHeight,height-drawHeight,0);
 const map=p=>{const x=offsetX+p.x*drawWidth,y=offsetY+p.y*drawHeight;return {x,y,visible:x>=0&&x<=width&&y>=0&&y<=height};};
 return {fit:'cover',mode:'carousel',selectedIndex,drawWidth,drawHeight,offsetX,offsetY,friends:bg.friendFeet.map(map),owner:map(bg.ownerFoot),integratedUiReviewed:false};
}

/** A visit-keyed shuffle: stable across redraw, reload and notebook, independent of family PRNG. */
export function shuffleGardenPool(items,key){let seed=2166136261;for(const ch of key){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619);}const out=[...items];for(let i=out.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
/** Both arrows wrap without changing the selected garden or its guest session. */
export function gardenSelectorOffset(current,width,total,direction){const max=Math.max(0,total-width);return direction==='next'?(current>=max-2?0:Math.min(max,current+width)):(current<=2?max:Math.max(0,current-width));}

import {GARDEN_ASSETS} from './data/garden-assets.js';
/** Original user-selected pastoral WAV loops. Never starts on construction. */
export const MUSIC_TRACKS = Object.freeze([
  {id:'meadow', title:'草原の朝', file:'01_meadow_morning.wav'},
  {id:'orchard', title:'小さな果樹園', file:'02_little_orchard.wav'},
  {id:'lakeside', title:'湖畔のそよ風', file:'03_lakeside_breeze.wav'},
  {id:'village', title:'村のワルツ', file:'04_village_waltz.wav'},
]);
const GARDEN_TITLES=Object.freeze({komorebi:'こもれびの庭',mizukagami:'みずかがみの庭',komugi:'こむぎの庭',hanadokei:'はなとけいの庭',kazaguruma:'かざぐるまの丘',yuyake:'ゆうやけ果樹園',tsukiakari:'つきあかりの庭','shrine-grove':'こもりの杜',onsen:'湯気文吾温泉'});
export function gardenMusicTracks(assets=GARDEN_ASSETS){return Object.entries(assets).filter(([,a])=>(a.music?.releaseReady===true||a.music?.trialAvailable===true)).map(([gardenId,{music:m}])=>({id:m.themeId,gardenId,title:GARDEN_TITLES[gardenId]||gardenId,asset:m.asset,loopStartSeconds:m.loopStartSeconds,loopEndSeconds:m.loopEndSeconds}));}
export function createGameMusic({base='', gardenAssets=GARDEN_ASSETS, Context=globalThis.AudioContext||globalThis.webkitAudioContext,
  fetcher=globalThis.fetch?.bind(globalThis), storage, onChange=()=>{}, activationTimeout=1200, loadTimeout=20000}={}) {
  const key='buncho.music.v1';
  let saved={}; try {saved=JSON.parse(storage?.getItem(key)||'{}')||{};} catch {}
  const tracks=[...MUSIC_TRACKS,...gardenMusicTracks(gardenAssets)];
  let fixedSelected=tracks.some(t=>t.id===saved.selected)?saved.selected:'meadow';
  let selected=fixedSelected, mode=saved.mode==='fixed'||(!saved.mode&&saved.selected)?'fixed':'auto', gardenId=null, worldId=null, unlocked=false;
  let volume=Number.isFinite(saved.volume)?Math.min(.6,Math.max(0,saved.volume)):.18;
  let enabled=saved.enabled!==false, status='paused', error='', context=null, disposed=false, generation=0, pending=null;
  const active=new Set(); const buffers=new Map();
  // The lane stays occupied until the native decode settles, even after a UI timeout.
  // AbortController cannot cancel decodeAudioData; never release it on a race timeout.
  let decodeLane=Promise.resolve();
  const state=()=>({selected,fixedSelected,mode,gardenId,volume,enabled,status,error});
  const emit=()=>onChange(state());
  const save=()=>{try {storage?.setItem(key,JSON.stringify({selected:fixedSelected,mode,volume,enabled}));} catch {}};
  function stop() {
    for(const n of active){try {n.gain.gain.cancelScheduledValues(0);n.gain.gain.setValueAtTime(0,context.currentTime);n.source.stop();n.source.disconnect();n.gain.disconnect();} catch {}}
    active.clear();
  }
  function invalidate(){generation++;pending?.abort();pending=null;stop();}
  function off(){invalidate();enabled=false;status='off';error='';save();emit();}
  function pause(){if(disposed)return;invalidate();status=enabled?'paused':'off';emit();try{context?.suspend()?.catch(()=>{});}catch{}}
  function setVolume(value){if(!Number.isFinite(value)||disposed)return;volume=Math.min(.6,Math.max(0,value));for(const n of active){if(n.retiring)continue;const t=context.currentTime;n.gain.gain.cancelScheduledValues(t);n.gain.gain.setTargetAtTime(volume,t,.025);}save();emit();}
  async function playTrack(id,gesture) {
    if(disposed||!tracks.some(t=>t.id===id))return false;
    if(!gesture&&(!unlocked||context?.state!=='running'||!enabled))return false;
    if(gesture)unlocked=true;
    // The caller MUST invoke this directly inside a trusted click handler.
    // resume() is invoked before any await/network request for iOS activation.
    const token=++generation;pending?.abort();pending=new AbortController();const controller=pending;
    selected=id;enabled=true;error='';status='loading';save();emit();
    let activationTimer, downloadTimer;
    try {
      if(typeof Context!=='function')throw Error('この端末では音楽を再生できません');
      context ||= new Context();
      const resumed=context.state==='running'?Promise.resolve():context.resume();
      const activation=Promise.race([Promise.resolve(resumed),new Promise((_,reject)=>{activationTimer=setTimeout(()=>reject(Error('もう一度、曲をタップしてください')),activationTimeout);})]);
      // Fade old track to silence; stop before starting its replacement.
      const now=context.currentTime;
      let fadeUntil=now;
      for(const n of active){
        if(!n.retiring){n.retiring=true;n.stopAt=now+.1;n.gain.gain.cancelScheduledValues(now);n.gain.gain.setValueAtTime(n.gain.gain.value,now);n.gain.gain.linearRampToValueAtTime(0,n.stopAt);n.source.stop(n.stopAt);}
        fadeUntil=Math.max(fadeUntil,n.stopAt);
      }
      await activation;clearTimeout(activationTimer);
      if(token!==generation||disposed)return false;
      if(context.state!=='running')throw Error('もう一度、曲をタップしてください');
      let buffer=buffers.get(id);
      if(!buffer){
        const current=()=>token===generation&&!disposed&&!controller.signal.aborted;
        // Serialize fetch/body/decode, coalescing stale queued requests before allocation.
        const work=decodeLane.then(async()=>{
          if(!current())return null;
          const track=tracks.find(t=>t.id===id);
          const response=await fetcher(`${base}${track.asset||'audio/'+track.file}`,{signal:controller.signal});
          if(!current())return null;
          if(!response.ok)throw Error('音楽を読み込めませんでした');
          const bytes=await response.arrayBuffer();
          if(!current())return null;
          return context.decodeAudioData(bytes);
        });
        decodeLane=work.then(()=>undefined,()=>undefined);
        buffer=await Promise.race([work,new Promise((_,reject)=>{
          downloadTimer=setTimeout(()=>{controller.abort();reject(Error('読み込みが止まりました。もう一度タップしてください'));},loadTimeout);
        })]);
        clearTimeout(downloadTimer);
        if(!current()||!buffer)return false;
        // Cache only the chosen decoded WAV: keep mobile memory bounded.
        buffers.clear();buffers.set(id,buffer);
      }
      if(token!==generation||disposed||!enabled)return false;
      const source=context.createBufferSource(),gain=context.createGain();
      const track=tracks.find(t=>t.id===id),loopStart=track.loopStartSeconds??0,loopEnd=track.loopEndSeconds??buffer.duration;
      if(!Number.isFinite(loopStart)||!Number.isFinite(loopEnd)||loopStart<0||loopEnd<=loopStart||loopEnd>buffer.duration)throw Error('曲のループ範囲を確認できませんでした');
      source.buffer=buffer;source.loop=true;source.loopStart=loopStart;source.loopEnd=loopEnd;
      const entry={source,gain};active.add(entry);source.onended=()=>{active.delete(entry);try{source.disconnect();gain.disconnect();}catch{}};
      const startAt=Math.max(context.currentTime,fadeUntil);
      source.connect(gain);gain.connect(context.destination);gain.gain.setValueAtTime(0,context.currentTime);gain.gain.setValueAtTime(0,startAt);gain.gain.linearRampToValueAtTime(volume,startAt+.12);source.start(startAt);
      status='playing';emit();return true;
    } catch(e){if(token===generation&&!disposed){stop();status='error';error=e.name==='AbortError'?'読み込みが止まりました。もう一度タップしてください':e.message||'音楽を再生できませんでした';emit();}return false;
    } finally {clearTimeout(activationTimer);clearTimeout(downloadTimer);if(pending===controller)pending=null;}
  }
  function autoTarget(){return tracks.find(t=>t.gardenId===gardenId)?.id||(gardenId?selected:fixedSelected);}
  function playFromGesture(id=fixedSelected){if(!tracks.some(t=>t.id===id)||disposed)return Promise.resolve(false);mode='fixed';fixedSelected=id;return playTrack(id,true);}
  function playCurrentFromGesture(){return playTrack(mode==='auto'?autoTarget():fixedSelected,true);}
  function playAutoFromGesture(){if(disposed)return Promise.resolve(false);mode='auto';save();return playTrack(autoTarget(),true);}
  function setGarden(id,nextWorldId=null){
    if(disposed)return Promise.resolve(false);
    const replaced=worldId!==null&&nextWorldId!==null&&worldId!==nextWorldId;
    if(nextWorldId!==null)worldId=nextWorldId;gardenId=typeof id==='string'?id:null;
    if(replaced){invalidate();status=enabled?'paused':'off';}
    const target=mode==='auto'?autoTarget():fixedSelected;emit();
    if(!enabled||!unlocked||context?.state!=='running')return Promise.resolve(false);
    if(replaced||target!==selected)return playTrack(target,false);
    return Promise.resolve(false);
  }
  function dispose(){if(disposed)return;invalidate();disposed=true;buffers.clear();try{context?.close()?.catch(()=>{});}catch{};context=null;}
  return {state,tracks:()=>tracks.map(t=>({...t})),playFromGesture,playCurrentFromGesture,playAutoFromGesture,setGarden,off,pause,setVolume,dispose};
}

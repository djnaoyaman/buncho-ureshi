/** Short original wood-like detents. No audio or vibration until a user gesture. */
export function createGardenJogFeedback({Context=globalThis.AudioContext||globalThis.webkitAudioContext,
 navigator=globalThis.navigator,getSound=()=>true,isActive=()=>true,now=()=>performance.now(),
 setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let context=null,disposed=false,armed=false,epoch=0,lastStep=-Infinity,settleTimer=null,pendingTone=null;
 const nodes=new Set();
 const active=()=>!disposed&&isActive();
 function clearSettle(){clearTimer(settleTimer);settleTimer=null;}
 function stop(){for(const {osc,gain} of nodes){try{osc.stop();osc.disconnect();gain.disconnect();}catch{}}nodes.clear();}
 function cancel(){epoch++;armed=false;pendingTone=null;clearSettle();stop();}
 function gesture({release=false}={}){
  if(!active())return;armed=true;if(!release)clearSettle();
  if(!getSound()||typeof Context!=='function')return;
  try{
   context??=new Context();const token=epoch;
   const resumed=context.state==='running'?undefined:context.resume();
   Promise.resolve(resumed).then(()=>{
    const note=pendingTone;
    if(token!==epoch||!note)return;
    pendingTone=null;
    // A touch-release can unlock Safari. Play only the most recent fresh
    // detent, never a queue or a note from a previous/hidden panel.
    if(now()-note.at<=250)tone(note.kind);
   },()=>{});
  }catch{}
 }
 function tone(kind){
  if(!active()||!armed||!getSound()||!context)return false;
  if(context.state!=='running'){pendingTone={kind,at:now()};return false;}
  pendingTone=null;
  try{
   stop();const start=context.currentTime+.003,duration=kind==='step'?.065:.13;
   const partials=kind==='step'?[[640,.022],[1390,.009]]:[[560,.024],[840,.008]];
   for(const [frequency,volume] of partials){
    const osc=context.createOscillator(),gain=context.createGain(),node={osc,gain};nodes.add(node);
    osc.type='sine';osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(frequency*.78,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.003);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(context.destination);osc.onended=()=>{nodes.delete(node);try{osc.disconnect();gain.disconnect();}catch{}};
    osc.start(start);osc.stop(start+duration+.005);
   }return true;
  }catch{stop();return false;}
 }
 function step(){
  clearSettle();if(!active()||!armed)return;
  const time=now();if(time-lastStep<85)return;lastStep=time;tone('step');
  try{navigator?.vibrate?.(8);}catch{} // Unsupported/denied vibration is optional.
 }
 function settled(){
  clearSettle();if(!active()||!armed)return;const token=epoch;
  settleTimer=setTimer(()=>{settleTimer=null;if(token===epoch)tone('settled');},170);
 }
 function close(){if(disposed)return;cancel();disposed=true;try{context?.close()?.catch?.(()=>{});}catch{}context=null;}
 return {gesture,step,settled,cancel,close};
}

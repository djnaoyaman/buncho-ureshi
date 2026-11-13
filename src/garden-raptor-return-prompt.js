import {raptorReturnChoicePending,raptorToken} from './garden-raptors.js';

/** Native modal: no implicit "remain", no timed dismissal, and one submitted
 * choice at a time. The saved pending flag—not this DOM—holds the danger clock. */
export function mountRaptorReturnPrompt(root,{getWorld,onHome,onStay}){
 const doc=root.ownerDocument;
 let dialog=null,eventKey=null,busy=false,alive=true;
 function remove(){const old=dialog;dialog=null;eventKey=null;if(old?.open)old.close();old?.remove();}
 function sync(){
  if(!alive)return;
  const w=getWorld();
  if(!raptorReturnChoicePending(w)){remove();return;}
  const key=`${w.worldId}:${w.encounters.raptor.active.eventId}`;
  if(dialog&&eventKey!==key)remove();
  if(!dialog){
   dialog=doc.createElement('dialog');eventKey=key;
   dialog.className='game-raptor-return-dialog';
   dialog.setAttribute('aria-labelledby','game-raptor-return-title');
   dialog.setAttribute('aria-describedby','game-raptor-return-description');
   dialog.innerHTML=`<p class="game-raptor-return-eyebrow">ぶんちょうを まもろう</p><h2 id="game-raptor-return-title">おおきな鳥が<br>ちかづいてきたよ！</h2><p id="game-raptor-return-description">おうちに かえりますか？<br><small>えらんでいる あいだは、のこり<ruby>時間<rt>じかん</rt></ruby>は へらないよ。</small><small>にわに のこると、じかんが また うごくよ。あぶなくなる まえに かえってね。</small></p><div class="game-raptor-return-actions"><button type="button" data-raptor-choice="home" autofocus>おうちに かえる</button><button type="button" data-raptor-choice="stay">にわに のこる</button></div><p class="game-raptor-return-error" role="alert" hidden></p>`;
   dialog.addEventListener('click',ev=>{const button=ev.target.closest('button[data-raptor-choice]');if(!button)return;ev.stopPropagation();void choose(button.dataset.raptorChoice);});
   // Escape is the safe action, never silent agreement to remain in danger.
   dialog.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();void choose('home');}
    if(ev.key==='Tab'){
     ev.preventDefault();ev.stopPropagation();
     const buttons=[...dialog.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(doc.activeElement);
     if(buttons.length)buttons[(index+(ev.shiftKey?-1:1)+buttons.length)%buttons.length].focus({preventScroll:true});
    }
   });
   dialog.addEventListener('cancel',ev=>{ev.preventDefault();ev.stopPropagation();void choose('home');});
   dialog.addEventListener('close',()=>{if(dialog&&alive&&raptorReturnChoicePending(getWorld()))sync();});
   (root.querySelector('.game-app')||root).append(dialog);
  }
  if(!dialog.open){dialog.showModal();dialog.querySelector('[autofocus]')?.focus({preventScroll:true});}
 }
 async function choose(kind){
  if(busy||!dialog||!raptorReturnChoicePending(getWorld()))return;
  const expected=raptorToken(getWorld()),currentDialog=dialog;
  const current=()=>alive&&getWorld().worldId===expected.worldId&&(!getWorld().encounters.raptor?.active||getWorld().encounters.raptor.active.eventId===expected.eventId);
  busy=true;currentDialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const ok=await (kind==='home'?onHome(current):onStay(expected,current));
   if(ok===false&&current())throw new Error('保存できませんでした。時間は止まっています。もう一度えらんでね。');
   sync();
   if(!dialog&&alive)root.querySelector('[data-game-raptor-home]')?.focus({preventScroll:true});
  }catch{
   if(dialog===currentDialog){const error=dialog.querySelector('[role=alert]');error.hidden=false;error.textContent='保存できませんでした。時間は止まっています。もう一度えらんでね。';}
  }finally{busy=false;if(dialog===currentDialog)dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 return {sync,destroy(){alive=false;remove();}};
}

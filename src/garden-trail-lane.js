// Presentation-only single-lane admission. Call on an atomic, validated
// visual roster snapshot. Never changes a bird position or game state.
export function createLane({hasBay=false, fits=()=>true}={}){
  const queue=new Map();
  let epoch=null,ticket=0,lock=null,paused=false,roster=new Map();
  const terminal=s=>s==='A'||s==='B', other=s=>s==='A'?'B':'A';
  const at=slot=>[...roster.values()].filter(a=>a.slot===slot);
  const owner=(id,slot)=>roster.get(id)?.slot===slot;
  const sorted=()=>[...queue.values()].sort((a,b)=>a.ticket-b.ticket);
  const drop=()=>{lock=null;};
  function sync({key,actors,blocked=false}){
    if(new Set(actors.map(a=>a.id)).size!==actors.length)throw new Error('duplicate roster ID');
    if(key!==epoch){epoch=key;queue.clear();ticket=0;drop();}
    roster=new Map(actors.map(a=>[a.id,{...a}]));paused=blocked;
    for(const [id,r] of queue)
      if(!roster.has(id)||roster.get(id).movable===false||!owner(id,r.from))queue.delete(id);
    if(!lock)return;
    if(!roster.has(lock.id)){drop();return;}
    if(lock.phase==='yield'){
      const blocker=roster.get(lock.partner);
      if(blocked||!owner(lock.id,lock.from)||(!blocker&&!at(lock.to).length)){drop();return;}
      if(blocker?.slot==='bay'&&!at(lock.to).length&&at('bay').length===1){
        // Exit is acquired only on the post-hop authoritative frame.
        if(at('lane').length||!fits(lock.id,lock.from,lock.to,'cross',roster)){drop();return;}
        lock={...lock,phase:'ready',exit:lock.to};
      }else if(!blocker||![lock.to,'yielding'].includes(blocker.slot)||at('bay').length||at(lock.to).some(a=>a.id!==lock.partner)){drop();}
      return;
    }
    if(owner(lock.id,lock.to)&&!at('lane').length){drop();return;}
    if(blocked||at(lock.to).some(a=>a.id!==lock.id)||!fits(lock.id,lock.from,lock.to,'cross',roster)){
      // No new route across the invalidated slot. The caller decides the
      // safe snap/recovery using actual body geometry, never this planner.
      if(lock.phase==='ready'&&!owner(lock.id,'lane')){drop();return;}
      lock={...lock,phase:'recover',exit:null};
    }
    if(lock?.phase==='recover'&&!owner(lock.id,'lane')&&!at('lane').length)drop();
  }
  function request(id){
    const a=roster.get(id);
    if(!a||a.movable===false||!terminal(a.slot)||paused||lock?.id===id)return false;
    if(!queue.has(id))queue.set(id,{id,from:a.slot,to:other(a.slot),ticket:++ticket});
    return true;
  }
  function admit(){
    if(paused)return null;
    if(lock){
      if(lock.phase==='ready'){
        lock={...lock,phase:'cross'};queue.delete(lock.id);
        return {kind:'cross',...lock};
      }
      return null;
    }
    if(at('lane').length)return null;
    for(const r of sorted()){
      if(!owner(r.id,r.from)||at(r.from).length!==1||!fits(r.id,r.from,r.to,'cross',roster))continue;
      const exits=at(r.to);
      if(exits.length===0){
        lock={...r,phase:'cross',exit:r.to};queue.delete(r.id);
        return {kind:'cross',...lock};
      }
      if(!hasBay||exits.length!==1||at('bay').length)continue;
      const [partner]=exits;
      if(partner.movable===false||!fits(partner.id,r.to,'bay','yield',roster))continue;
      lock={...r,phase:'yield',partner:partner.id,exit:null};
      return {kind:'yield',actor:partner.id,laneOwner:r.id,bay:'bay'};
    }
    return null;
  }
  function snapshot(){return {epoch,paused,lock:lock&&{...lock},queue:sorted().map(a=>({...a}))};}
  // Adapter may roll back a proposal only if no corresponding native mover
  // started. Scope refusal to the exact epoch/ticket/phase; never reset peers.
  function refuse({key,ticket:expected,phase}){
    if(key!==epoch||lock?.ticket!==expected||lock.phase!==phase)return false;
    queue.delete(lock.id);
    drop();
    return true;
  }
  function recover({key,ticket:expected,phase}){
    if(key!==epoch||lock?.ticket!==expected||lock.phase!==phase)return false;
    queue.delete(lock.id);
    lock={...lock,phase:'recover',exit:null};
    return true;
  }
  return {sync,request,admit,refuse,recover,snapshot};
}

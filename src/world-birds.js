/** Active simulation and durable identities have independent lifetimes. */
export const allBirds=w=>[...new Map([...w.birds,...(w.archive||[])].map(b=>[b.id,b])).values()];
export function activateBird(w,bird){
 const index=w.archive?.findIndex(b=>b.id===bird.id)??-1;
 if(index>=0){w.archive.splice(index,1);w.birds.push(bird);}return bird;
}
export function archiveDetachedBirds(w){
 if(!w.archive||w.birds.length<96)return;
 const away=w.birds.filter(b=>b.home==='departed'&&b.id!==w.protagonist.birdId&&b.id!==w.field.hostId);
 const ids=new Set(away.map(b=>b.id));w.archive.push(...away);w.birds=w.birds.filter(b=>!ids.has(b.id));
}

/** Focused, top-down blood-family layout. Pair bonds are a separate edge type. */
export function familyLayout(world,selectedId){
 const byId=new Map(world.birds.map(b=>[b.id,b])),focus=byId.get(selectedId)||world.birds[0],mate=byId.get(focus.partner);
 const children=world.birds.filter(b=>b.parents.includes(focus.id)),parents=[...new Set([...focus.parents,...(mate?.parents||[])])].map(id=>byId.get(id)).filter(Boolean);
 const width=Math.max(600,children.length*140+40,parents.length*140+40),nodes=[],edges=[],cx=width/2,cardW=112,cardH=132;
 const place=(bird,x,y,role)=>{if(!nodes.some(n=>n.id===bird.id))nodes.push({id:bird.id,x,y,role});};
 place(focus,mate?cx-70:cx,204,'focus');if(mate)place(mate,cx+70,204,'mate');
 if(mate)edges.push({kind:'pair',path:`M ${cx-14} 270 H ${cx+14}`});
 parents.forEach((b,i)=>place(b,cx+(i-(parents.length-1)/2)*140,24,'parent'));
 for(const child of [focus,mate].filter(Boolean)){
  const own=parents.filter(b=>child.parents.includes(b.id)),childNode=nodes.find(n=>n.id===child.id);if(!own.length)continue;
  const pn=own.map(b=>nodes.find(n=>n.id===b.id));const center=pn.reduce((sum,n)=>sum+n.x,0)/pn.length;
  if(pn.length===2)edges.push({kind:'pair',path:`M ${pn[0].x+cardW/2} 90 H ${pn[1].x-cardW/2}`});
  const start=pn.length===2?90:24+cardH;
  edges.push({kind:'blood',path:`M ${center} ${start} V 180 H ${childNode.x} V 204`});
 }
 const childY=384;
 children.forEach((b,i)=>place(b,cx+(i-(children.length-1)/2)*140,childY,'child'));
 if(children.length){
  const focusNode=nodes.find(n=>n.id===focus.id);
  for(const both of [true,false]){
   const group=children.filter(b=>Boolean(mate&&b.parents.includes(mate.id))===both);if(!group.length)continue;
   const ns=group.map(b=>nodes.find(n=>n.id===b.id)),fromX=both?cx:focusNode.x,fromY=both?270:204+cardH,bus=both?354:370;
   edges.push({kind:'blood',path:`M ${fromX} ${fromY} V ${bus} M ${Math.min(fromX,...ns.map(n=>n.x))} ${bus} H ${Math.max(fromX,...ns.map(n=>n.x))}`});
   for(const n of ns)edges.push({kind:'blood',path:`M ${n.x} ${bus} V ${childY}`});
  }
 }
 return {width,height:children.length?540:370,cardW,cardH,nodes,edges,focusId:focus.id,mateId:mate?.id||null,children:children.map(b=>b.id)};
}

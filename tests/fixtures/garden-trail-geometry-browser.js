// Serialized directly into the Playwright page; no prod hook or persisted UI.
export function readTrailGeometry({id,survey}){
 const stage=document.querySelector('.finch-garden-stage');
 const plane=stage?.querySelector('.finch-garden-image-plane'),slide=stage?.querySelector('.finch-garden-slide');
 if(!plane||!slide||stage.dataset.gardenId!==id||stage.dataset.sceneState!=='ready')return null;
 const box=n=>{const {left,right,top,bottom,width,height}=n.getBoundingClientRect();return {left,right,top,bottom,width,height};};
 const p=box(plane),c=box(slide),s=box(stage),overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 const clip={left:Math.max(c.left,s.left,0),right:Math.min(c.right,s.right,innerWidth),top:Math.max(c.top,s.top,0),bottom:Math.min(c.bottom,s.bottom,innerHeight)};
 const controls=[...document.querySelectorAll('.finch-garden > header,.finch-garden-selector-wrap,.garden-jog-cylinder > button[data-jog-center],.finch-garden-dock,.finch-garden-family,.finch-garden > details > summary,.leaf-gift > summary')].map((n,index)=>({name:n.className||n.tagName,index,...box(n)})).filter(b=>b.width>0&&b.height>0&&overlap(b,clip));
 const birdSelector=':scope > .finch-garden-friend,:scope > .finch-garden-household,:scope > .finch-garden-visitor';
 const native=[...plane.querySelectorAll(birdSelector)].map(n=>{
  const r=box(n),label=n.querySelector('.finch-friend-name'),visibleLabel=label&&box(label),u=r.left+r.width/2,v=r.top+r.height/2;
  const hit=document.elementFromPoint(u,v);
  return {id:n.dataset.gardenActorId||n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend,
   rect:r,label:visibleLabel,hit:!!hit&&n.contains(hit),actorState:n.dataset.actorState||null,front:hit?.className||null};
 });
 const project=([x,y])=>[p.left+x*p.width,p.top+y*p.height];
 const [start,exit]=survey.entryCandidates,[bay]=survey.pullouts,spine=[start,...survey.lane,exit];
 const spanStats=(points,user)=>{
  const out=[];
  for(let i=1;i<points.length;i++){
   const [ax,ay]=project(points[i-1]),[bx,by]=project(points[i]);
   const width=user.rect.width,height=user.rect.height;
   const labelOverhang=user.label?Math.max(0,user.label.bottom-user.rect.bottom):0;
   const body={left:Math.min(ax,bx)-.54*width,right:Math.max(ax,bx)+.46*width,
      top:Math.min(ay,by)-.975*height-.012*p.height,
      bottom:Math.max(ay,by)+.025*height+Math.max(20,labelOverhang)};
   out.push({i,body,clear:body.left>=clip.left+2&&body.right<=clip.right-2&&body.top>=clip.top+2&&body.bottom<=clip.bottom-2,
      controls:controls.filter(r=>overlap(body,r)).map(r=>r.index),
      actors:native.filter(b=>b.id!==user.id&&(overlap(body,b.rect)||(b.label&&overlap(body,b.label)))).map(b=>b.id)});
  }
  return out;
 };
 return {id,plane:p,clip,controls,native,readiness:stage.dataset.actorMotion||null,
  endpoints:{start:project(start),exit:project(exit),bay:project(bay)},
  sweeps:native.map(b=>({id:b.id,lane:spanStats(spine,b),bay:spanStats([exit,bay],b)}))};
}

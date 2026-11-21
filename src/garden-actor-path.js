// Opt-in piecewise trajectory data; feet are always in normalized image space.
// Curved flight rendering is not enabled here; this provides exact ground hops.
const valid = p => Array.isArray(p) && p.length === 2 &&
 p.every(v => Number.isFinite(v) && v >= 0 && v <= 1);
const same = (a,b) => a[0] === b[0] && a[1] === b[1];

export function createActorHopPath(from,to,path,width,height){
 if(!valid(from)||!valid(to)||!Array.isArray(path)||path.length<2||path.length>32||
  !path.every(valid)||!same(from,path[0])||!same(to,path.at(-1))||
  width<=0||height<=0||!Number.isFinite(width)||!Number.isFinite(height))return null;
 const hops=[];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];
  if(same(a,b))return null;
  const count=Math.max(1,Math.ceil(Math.hypot((a[0]-b[0])*width,(a[1]-b[1])*height)/24));
  if(hops.length+count+1>1024)return null;
  for(let n=0;n<count;n++)hops.push(a.map((v,k)=>v+(b[k]-v)*(n/count)));
 }
 hops.push([...to]);
 return hops;
}

// At ANY pair of segment times, not just on the same RAF. Conservative
// rectangle for a hop between two ground points, with altitude bound.
export function sweptHopSpans(hops,bodyAt,lift){
 return hops.slice(1).map((to,i)=>{
  const a=bodyAt(hops[i],0),b=bodyAt(to,0);
  return {left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),
   top:Math.min(a.top,b.top)-lift,bottom:Math.max(a.bottom,b.bottom)};
 });
}
export function conflictSweeps(candidateSpans,protectedSpans){
 return candidateSpans.some(a=>protectedSpans.some(b=>
  a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
}

// A deterministic rounded spine. Every smoothed corner stays within its
// local control triangle; the consumer must still validate the swept view.
export function createActorFlightPath(from,to,path,width,height){
 if(!createActorHopPath(from,to,path,width,height))return null;
 const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const points=[[...from]];
 for(let i=1;i<path.length-1;i++){
  const a=lerp(path[i],path[i-1],.22),b=lerp(path[i],path[i+1],.22);
  points.push(a);
  for(let j=1;j<=12;j++){const t=j/12;points.push(lerp(lerp(a,path[i],t),lerp(path[i],b,t),t));}
 }
 points.push([...to]);
 let distance=0;
 const indexed=points.map((p,i)=>{
  if(i)distance+=Math.hypot((p[0]-points[i-1][0])*width,(p[1]-points[i-1][1])*height);
  return {p,distance};
 });
 return {indexed,distance};
}
export function sampleActorFlightPath(path,t){
 const d=t*path.distance, {indexed}=path;
 if(t<=0)return {p:[...indexed[0].p],dx:indexed[1].p[0]-indexed[0].p[0]};
 const index=indexed.findIndex(v=>v.distance>=d),i=index<1?indexed.length-1:index;
 const a=indexed[i-1],b=indexed[i];
 const u=Math.min(1,Math.max(0,(d-a.distance)/(b.distance-a.distance)));
 return {p:a.p.map((v,k)=>v+(b.p[k]-v)*u),dx:b.p[0]-a.p[0]};
}

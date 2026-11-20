import { GARDEN_MOTION_TERRAIN } from './data/garden-motion-terrain.js';
import { GARDEN_TERRAIN_V2, EXTRA_GROUND } from './data/garden-terrain-v2.js';
import { presentationSeed } from './bird-poses.js';

export const TERRAIN_PERIOD = 26000;
export const terrainFor = id => GARDEN_TERRAIN_V2[id] ? {...GARDEN_MOTION_TERRAIN[id], surfaces:{...GARDEN_MOTION_TERRAIN[id].surfaces,...EXTRA_GROUND[id]}, graph:GARDEN_TERRAIN_V2[id]} : GARDEN_MOTION_TERRAIN[id] || null;
export function inside(point, polygon) {
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i], [a, b] = polygon[j];
    if ((y > point[1]) !== (b > point[1]) && point[0] < (a - x) * (point[1] - y) / (b - y) + x) found = !found;
  }
  return found;
}
const overlaps = (a, b, gap = 5) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
const fits = (r, c) => r.left >= c.left + 3 && r.right <= c.right - 3 && r.top >= c.top + 3 && r.bottom <= c.bottom - 3;
export function actorBox(actor, point, plane, lift = 0, flight = false) {
  const x = plane.left + point[0] * plane.width, y = plane.top + point[1] * plane.height - lift;
  const width = flight ? actor.width * 1.54 : Math.max(actor.width, actor.labelWidth);
  return { left: x - width * .54, right: x + width * .46, top: y - actor.height * (flight ? 1.08 : .975), bottom: y + actor.height * .025 + actor.labelHeight };
}
/** Ground the actual roster, never the reference cast. All-or-nothing: do not
 * push a neighbour off its surface to make an animation possible. */
export function terrainLayout(id, actors, plane, clip, obstacles = []) {
  const terrain = terrainFor(id);
  if (terrain?.graph) return terrainLayoutV2(id, actors, plane, clip, obstacles);
  if (!terrain || !actors.length || actors.length > 6 || !plane?.width || !plane?.height || !clip) return null;
  const polygon = terrain.surfaces[terrain.primary];
  const lo = Math.max(Math.min(...polygon.map(p => p[0])) * plane.width + plane.left, clip.left + 4);
  const hi = Math.min(Math.max(...polygon.map(p => p[0])) * plane.width + plane.left, clip.right - 4);
  const room = (hi - lo) / actors.length - 10;
  if (room < 44) return null;
  const sorted = [...actors].sort((a, b) => a.point[0] - b.point[0] || a.point[1] - b.point[1] || a.id.localeCompare(b.id));
  const result = sorted.map((a, i) => {
    const width = Math.min(a.width, room), height = a.height * width / a.width;
    const x = (lo + (hi - lo) * (i + .5) / sorted.length - plane.left) / plane.width;
    const ys = [];
    for (let y = Math.min(...polygon.map(p => p[1])) + .006; y <= Math.max(...polygon.map(p => p[1])) - .006; y += .002) {
      if (inside([x - .008, y], polygon) && inside([x + .008, y], polygon)) ys.push(y);
    }
    if (!ys.length) return null;
    // Stay away from the painted ledge. This is a terrain projection, not a
    // saved relocation; bird identity and source art remain unchanged.
    const y = ys[Math.floor(ys.length / 2)];
    return { ...a, width, height, point: [x, y] };
  });
  if (result.some(a => !a)) return null;
  const boxes = result.map(a => actorBox(a, a.point, plane));
  if (boxes.some((r, i) => !fits(r, clip) || obstacles.some(o => overlaps(r, o)) || boxes.some((b, j) => i !== j && overlaps(r, b)))) return null;
  return result;
}

/** Every sampled route includes the complete button/label and the wider wing
 * envelope. The planner never consumes game RNG or changes its input. */
export function terrainPlan(id, actors, plane, clip, obstacles = [], cycle = 0) {
  const terrain = terrainFor(id);
  if (terrain?.graph) return terrainPlanV2(id, actors, plane, clip, obstacles, cycle);
  if (!terrain || !actors?.length) return null;
  const order = [...actors].filter(a => a.movable).sort((a, b) => presentationSeed(a.id + ':' + cycle) - presentationSeed(b.id + ':' + cycle));
  for (const a of order) {
    const from = a.point, surface = Object.values(terrain.surfaces).find(p => inside(from, p));
    if (!surface) continue;
    const options = [];
    if (terrain.flight && a.flight) for (const dx of [-.12, .12, 0]) for (const dy of [0, -.16, .16]) {
      if (!dx && !dy) continue;
      options.push({ to: [from[0] + dx, from[1] + dy], flight: true, lift: Math.min(plane.width * .087, 65) });
    }
    for (const dx of [-18, 18, -8, 8]) options.push({ to: [from[0] + dx / plane.width, from[1] - 4 / plane.height], flight: false, lift: 3 });
    for (const option of options) {
      if (!Object.values(terrain.surfaces).some(p => inside(option.to, p))) continue;
      const others = actors.filter(b => b.id !== a.id).map(b => actorBox(b, b.point, plane));
      let safe = true;
      for (let n = 0; n <= 80 && safe; n++) {
        const t = n / 80, point = from.map((v, i) => v + (option.to[i] - v) * t);
        const lift = option.lift * Math.sin(Math.PI * t), r = actorBox(a, point, plane, lift, option.flight);
        safe = (option.flight || inside(point, surface)) && fits(r, clip) && ![...obstacles, ...others].some(o => overlaps(r, o, 6));
      }
      if (safe) return { id: a.id, from: [...from], ...option };
    }
  }
  return null;
}
export function terrainFrame(plan, elapsed) {
  if (!plan) return null;
  if (plan.v2) return terrainFrameV2(plan, elapsed);
  const t = Math.max(0, elapsed % TERRAIN_PERIOD), duration = plan.flight ? 900 : 1800;
  const leg = t >= 14000 ? -1 : 1, begin = leg === 1 ? 4000 : 14000;
  const u = Math.max(0, Math.min(1, (t - begin) / duration));
  const progress = leg === 1 ? u : 1 - u, air = u > 0 && u < 1;
  return { point: plan.from.map((v, i) => v + (plan.to[i] - v) * progress),
    lift: air ? plan.lift * Math.sin(Math.PI * u) : 0,
    wing: plan.flight && air, phase: u, moving: air,
    pose: (plan.to[0] - plan.from[0]) * leg < 0 ? 'left' : 'right' };
}


// A layout is chosen only before exposing a newly entered scene. It is never
// changed to make a later animation fit. The real roster owns every button.
function terrainLayoutV2(id, actors, plane, clip, obstacles, maxWidth=64, reserve=true) {
  const terrain=terrainFor(id);
  if (!actors?.length || actors.length>6 || !plane?.width || !plane?.height || !clip) return null;
  const points=[];
  for(const [name, polygon] of Object.entries(terrain.surfaces)) {
    for(const edge of terrain.graph.edges) if((edge.surface||edge.from)===name) points.push({point:edge.a,surface:name});
    for(let y=Math.min(...polygon.map(p=>p[1]))+.006;y<Math.max(...polygon.map(p=>p[1]))-.004;y+=.012)
      for(let x=.16;x<.86;x+=.04) if(inside([x-.012,y],polygon)&&inside([x+.012,y],polygon)) points.push({point:[x,y],surface:name});
  }
  const ordered=[...actors].sort((a,b)=>Number(b.flight)-Number(a.flight)||a.id.localeCompare(b.id));
  // Do not shrink native hit targets. A crowded scene falls back intact.
  const candidates=ordered.map((a,index)=>{
    const width=Math.max(44,Math.min(a.width,actors.length>3?maxWidth:80)), height=Math.max(44,a.height*width/a.width);
    const first=terrain.graph.edges.find(e=>e.motion===(actors.length===1&&a.flight&&terrain.flight?'flight':terrain.graph.order[0])&&(!e.from||a.flight));
    const preferred=index===0?(first?.a||terrain.graph.edges[0].a):a.point;
    return points.map(({point,surface})=>({...a,width,height,point:[...point],surface}))
      .filter(b=>{const box=actorBox(b,b.point,plane);return fits(box,clip)&&!obstacles.some(o=>overlaps(box,o,8));})
      .sort((a,b)=>Math.hypot(a.point[0]-preferred[0],a.point[1]-preferred[1])-Math.hypot(b.point[0]-preferred[0],b.point[1]-preferred[1]));
  });
  let budget=2500;
  function place(i,chosen,reserved=[]){
    if(i===ordered.length)return chosen;
    const spread=chosen.length?[...candidates[i]].sort((a,b)=>{
      const distance=c=>Math.min(...chosen.map(d=>Math.hypot((c.point[0]-d.point[0])*plane.width,(c.point[1]-d.point[1])*plane.height)));
      return distance(b)-distance(a);
    }):candidates[i];
    for(const a of spread) {
      if(--budget<0)return null;
      const box=actorBox(a,a.point,plane);
      if(chosen.some(b=>overlaps(box,actorBox(b,b.point,plane),8))||reserved.some(r=>overlaps(box,r,8)))continue;
      let nextReserved=reserved;
      if(i===0&&reserve) {
        const modes=terrain.graph.order.filter(m=>terrain.graph.edges.some(e=>e.motion===m));
        const edges=modes.flatMap(mode=>terrain.graph.edges.filter(e=>e.motion===mode));
        let route=null;
        for(const edge of edges){
          const flight=edge.motion==='flight';
          if((edge.surface||edge.from)!==a.surface||(flight&&!a.flight))continue;
          const to=flight?[...edge.b]:a.point.map((v,j)=>v+edge.b[j]-edge.a[j]);
          const p={v2:true,id:a.id,from:[...a.point],to,flight,lift:flight?Math.min(65,plane.width*.1):Math.min(8,a.height*.09),duration:flight?1100:1800,mode:edge.motion};
          if(safeV2Route(p,a,[a],terrain,plane,clip,obstacles)){route=p;break;}
        }
        if(!route)continue;
        nextReserved=Array.from({length:41},(_,j)=>{const f=terrainFrameV2(route,1000+j*route.duration/40);return actorBox(a,f.point,plane,f.lift,route.flight);});
      }
      const result=place(i+1,[...chosen,a],nextReserved);if(result)return result;
    }
    return null;
  }
  const result=place(0,[]);
  return result || (maxWidth>44?terrainLayoutV2(id,actors,plane,clip,obstacles,Math.max(44,maxWidth-8),reserve):reserve?terrainLayoutV2(id,actors,plane,clip,obstacles,64,false):null);
}
function safeV2Route(plan, actor, actors, terrain, plane, clip, obstacles) {
  if(!terrain.surfaces[actor.surface]||!inside(actor.point,terrain.surfaces[actor.surface]))return false;
  const others=actors.filter(a=>a.id!==actor.id).map(a=>actorBox(a,a.point,plane));
  for(let i=0;i<=100;i++) {
    const f=terrainFrameV2(plan,1000+i*plan.duration/100);
    if(!plan.flight&&!inside(f.point,terrain.surfaces[actor.surface]))return false;
    const box=actorBox(actor,f.point,plane,f.lift,plan.flight);
    if(!fits(box,clip)||[...obstacles,...others].some(o=>overlaps(box,o,8)))return false;
  }
  return Object.values(terrain.surfaces).some(p=>inside(plan.to,p));
}
function terrainPlanV2(id, actors, plane, clip, obstacles, cycle) {
  if(!actors?.length)return null;
  const terrain=terrainFor(id),order=terrain.graph.order;
  const modes=[...(actors.length===1&&actors[0].flight&&terrain.flight?['flight']:[]),...order.slice(cycle%order.length),...order.slice(0,cycle%order.length)];
  for(const mode of modes)for(const a of actors.filter(a=>a.movable)) {
    if(['preen','tap','dispute'].includes(mode)) {
      // No invented aggression / relationship event: only the existing atlas.
      const plan={v2:true,id:a.id,from:[...a.point],to:[...a.point],flight:false,lift:0,duration:2200,gesture:mode==='preen'?'preen':'peck',mode};
      if(safeV2Route(plan,a,actors,terrain,plane,clip,obstacles))return plan;
      continue;
    }
    for(const edge of terrain.graph.edges.filter(e=>e.motion===mode)) {
      const surface=edge.surface||edge.from;
      if(surface!==a.surface || (mode==='flight'&&!a.flight))continue;
      // Use the measured direction from the current foot position; never jump
      // an actor to a demo start or move a neighbour to clear the route.
      const to=mode==='flight'?[...edge.b]:a.point.map((v,i)=>v+edge.b[i]-edge.a[i]);
      const plan={v2:true,id:a.id,from:[...a.point],to,flight:mode==='flight',lift:mode==='flight'?Math.min(65,plane.width*.1):Math.min(8,a.height*.09),duration:mode==='flight'?1100:1800,mode};
      if(safeV2Route(plan,a,actors,terrain,plane,clip,obstacles))return plan;
    }
  }
  return null;
}
function terrainFrameV2(plan,elapsed) {
  const t=Math.max(0,elapsed%TERRAIN_PERIOD),back=t>=14000,begin=back?14000:1000;
  const u=Math.max(0,Math.min(1,(t-begin)/plan.duration)),moving=u>0&&u<1;
  if(plan.gesture)return {point:[...plan.from],lift:0,wing:false,phase:u,moving,pose:moving?plan.gesture:'right'};
  // Two visible hops with still feet at the middle landing; no rubber scaling.
  const hops=plan.flight?1:2,local=(u*hops)%1;
  const smooth=u===1?1:(Math.floor(u*hops)+(1-Math.cos(Math.PI*local))/2)/hops;
  const progress=back?1-smooth:smooth;
  return {point:plan.from.map((v,i)=>v+(plan.to[i]-v)*progress),lift:moving?plan.lift*Math.sin(Math.PI*local):0,wing:plan.flight&&moving,phase:u,moving,pose:(plan.to[0]-plan.from[0])*(back?-1:1)<0?'left':'right'};
}

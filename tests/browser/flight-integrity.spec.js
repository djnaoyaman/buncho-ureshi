import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
for(const width of [375,402])test(`flight anatomy all colours phases directions ${width}`,async({page},info)=>{
 if(process.env.FLIGHT_OLD)await page.route(/\/src\/garden-actor-flight.js$/,r=>r.fulfill({body:readFileSync(process.env.FLIGHT_OLD,'utf8'),contentType:'text/javascript'}));
 await page.setViewportSize({width,height:874});await page.goto('credits/');
 await page.evaluate(async()=>{
 const base=new URL('../',location.href).href;
 const [{renderGardenBirdSprite},{createActorFlight}]=await Promise.all([import(base+'src/garden-bird-motion.js'),import(base+'src/garden-actor-flight.js')]);
 document.body.innerHTML='';document.body.style.cssText='margin:0;background:#c7d8aa;';
 const style=document.createElement('style');style.textContent='.row{display:grid;grid-template-columns:repeat(4,1fr);height:130px}.cell{position:relative;padding-top:28px}.bird{position:relative;width:64px;height:75.294118px;margin:auto}.label{font:10px sans-serif;position:absolute;top:2px;left:0}';document.head.append(style);
 const pending=[];window.flightFixtures=[];
 for(const direction of ['right','left'])for(const [phase,t,h]of [['kick',0,0],['rise',150,.02],['flap',300,.04],['flap',375,.04],['brake',750,.02],['feet',850,.01],['contact',950,0],['fold',1000,0]]){
 const row=document.createElement('div');row.className='row';document.body.append(row);
 for(const color of ['white','sakura','cinnamon','silver']){const cell=document.createElement('div');cell.className='cell';cell.innerHTML=`<span class="label">${color} ${direction} ${phase} ${t}</span><div class="bird">${renderGardenBirdSprite(color,color,{base,pose:'stretch'})}</div>`;row.append(cell);
 const sprite=cell.querySelector('.garden-bird-sprite'),flight=createActorFlight(sprite,color);pending.push(...[...sprite.querySelectorAll('img')].map(i=>i.decode()));window.flightFixtures.push({flight,sprite,phase,t,h,direction,color});}
 }
 await Promise.all(pending);
 });
 await expect.poll(()=>page.evaluate(()=>window.flightFixtures.every(f=>f.flight.ready))).toBe(true);
 const result=await page.evaluate(()=>window.flightFixtures.map(f=>{
 f.flight.paint({state:'fly',height:f.h,phase:f.phase,since:0,route:{from:[.3,.7],to:[f.direction==='left'?.1:.6,.7]}},f.t);
 return {color:f.color,phase:f.phase,t:f.t,whole:f.flight.node.querySelectorAll('[data-whole-bird]').length,parts:f.flight.node.querySelectorAll('[data-part]').length,visible:getComputedStyle(f.flight.node).visibility,poseVisible:getComputedStyle(f.sprite.querySelector('.garden-bird-pose-window')).visibility};
 }));
 if(!process.env.FLIGHT_OLD)for(const r of result.filter(r=>r.color==='white')){expect(r.whole).toBe(1);expect(r.parts).toBe(0);expect(r.visible==='visible'||r.poseVisible==='visible').toBe(true);}
 await page.screenshot({path:info.outputPath('all-phases.png'),fullPage:true});
 await info.attach('phase-structure',{body:JSON.stringify(result),contentType:'application/json'});
});

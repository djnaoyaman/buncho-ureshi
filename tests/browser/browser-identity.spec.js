import {test,expect} from '@playwright/test';
test('record actual installed browser channel without calling emulation a physical device',async({browser,page},info)=>{
 const identity={project:info.project.name,channel:info.project.use.channel||'bundled-webkit',version:browser.version(),userAgent:await page.evaluate(()=>navigator.userAgent),physicalDevice:false};
 await info.attach('browser-identity',{body:Buffer.from(JSON.stringify(identity,null,2)),contentType:'application/json'});
 if(info.project.name==='edge'){expect(identity.channel).toBe('msedge');expect(identity.userAgent).toMatch(/Edg\//);}
 if(info.project.name==='chrome'){expect(identity.channel).toBe('chrome');expect(identity.userAgent).toMatch(/Chrome\//);expect(identity.userAgent).not.toMatch(/Edg\//);}
 if(info.project.name==='webkit')expect(identity.userAgent).toMatch(/AppleWebKit\//);
});

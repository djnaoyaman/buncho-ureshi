// Every production-origin document/asset is served from the local candidate.
// Install the deny-by-default route BEFORE enabling the production branch.
export async function isolatedProduction(page,baseURL,{realTag=false}={}) {
 const requests=[];
 await page.context().route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin==='https://djnaoyaman.github.io'){
   const local=new URL(url.pathname+url.search,baseURL);
   const response=await route.fetch({url:local.href});return route.fulfill({response});
  }
  if(url.origin===new URL(baseURL).origin)return route.continue();
  if(url.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js'].includes(url.pathname)){
   if(realTag)return route.continue();
   return route.fulfill({body:'',contentType:'application/javascript'});
  }
  requests.push({url:req.url(),body:req.postData()||''});
  return route.abort(); // Includes ALL collect/beacon/image/advertising requests.
 });
 await page.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 return requests;
}

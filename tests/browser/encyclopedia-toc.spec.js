import {test,expect} from '@playwright/test';

for(const javaScriptEnabled of [false,true]){
 test.describe(`article TOC (JavaScript ${javaScriptEnabled?'on':'off'})`,()=>{
  test.use({javaScriptEnabled,viewport:{width:390,height:844}});
  for(const [id,anchors] of [['bathing',['first','basic','deep','sources']],['omochi',['first','basic']]]){
   test(`links stay on the ${id} article at phone width`,async({page})=>{
    await page.goto(`encyclopedia/${id}/`);
    const story=page.locator(`[data-story="${id}"]`);
    await expect(story).toBeVisible();
    if(javaScriptEnabled){
     const favorite=story.locator('#favorite');
     const initial=await favorite.getAttribute('aria-pressed');
     await favorite.click();
     await expect(favorite).toHaveAttribute('aria-pressed',initial==='true'?'false':'true');
    }
    const articleURL=page.url();
    const toc=story.locator('.article-toc a');
    await expect(toc).toHaveCount(anchors.length);
    for(const [i,hash] of anchors.entries()){
     const a=toc.nth(i);
     await expect(a).toHaveAttribute('href',new URL(articleURL).pathname+'#'+hash);
     await a.click();
     await expect(page).toHaveURL(articleURL+'#'+hash);
     await expect(story.locator(`#${hash}:target`)).toBeInViewport();
    }
    if(javaScriptEnabled){
     const prior=anchors.at(-2);
     await page.goBack();
     await expect(page).toHaveURL(articleURL+'#'+prior);
     await expect(story.locator(`#${prior}:target`)).toBeInViewport();
     await page.goForward();
     await expect(page).toHaveURL(articleURL+'#'+anchors.at(-1));
     await story.locator('.breadcrumb a').click();
     await expect(page).toHaveURL(new URL('../',articleURL).href);
     await expect(page.locator('.encyclopedia-editorial')).toBeVisible();
    }
   });
  }
 });
}

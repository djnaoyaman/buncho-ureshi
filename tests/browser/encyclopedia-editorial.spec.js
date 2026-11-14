import {test,expect} from '@playwright/test';
import {articles} from '../../src/data/articles.js';

const articleURL=id=>`/encyclopedia/${id}/`;
const normalized=s=>s.replace(/\s+/g,' ').trim();
async function noOverflow(page){
 const size=await page.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
 expect(size.page,JSON.stringify(size)).toBeLessThanOrEqual(size.screen+1);
}
async function decodedImages(page,root){
 for(const img of await page.locator(`${root} img, ${root} svg image`).all()){
  await img.scrollIntoViewIfNeeded();
  expect(await img.evaluate(async i=>{const image=i.tagName.toLowerCase()==='image'?Object.assign(new Image(),{src:i.getAttribute('href')}):i;await image.decode();return image.naturalWidth>0&&image.naturalHeight>0;})).toBe(true);
 }
}
for(const width of [320,390,768,1440])test(`editorial encyclopedia photographs and six chapters at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('encyclopedia/');
 await expect(page.locator('.encyclopedia-editorial')).toBeVisible();
 await expect(page.locator('.encyclopedia-chapter')).toHaveCount(6);
 const firstImage=page.locator('.encyclopedia-editorial img').first();await firstImage.evaluate(i=>i.decode());
 const heroBox=await firstImage.boundingBox();
 if(width<=390){expect(heroBox.y).toBeLessThan(360);expect(heroBox.width).toBeGreaterThan(width*.8);}
 const hrefs=await page.locator('.encyclopedia-editorial a[href]').evaluateAll(links=>links.map(a=>a.pathname));
 for(const article of articles)expect(hrefs.some(h=>h.endsWith(articleURL(article.id))),article.id).toBe(true);
 await noOverflow(page);await decodedImages(page,'.encyclopedia-editorial');
 await page.evaluate(()=>scrollTo(0,0));
 await info.attach(`editorial-first-screen-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 for(let i=0;i<6;i++){
  const chapter=page.locator('.encyclopedia-chapter').nth(i);await chapter.scrollIntoViewIfNeeded();
  await info.attach(`editorial-chapter-${i+1}-${width}`,{body:await chapter.screenshot({animations:'disabled'}),contentType:'image/png'});
 }
 await noOverflow(page);expect(errors).toEqual([]);
});

test('editorial search can be cleared, filtered, bookmarked, revisited and navigated backwards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('encyclopedia/');
 const input=page.locator('#article-search'),results=page.locator('#article-grid .article-card');
 await input.fill('くちばし');await expect(results.first()).toBeVisible();
 const matched=await results.count();expect(matched).toBeGreaterThan(0);expect(matched).toBeLessThan(articles.length);
 await input.fill('zzzz-no-matching-bird');await expect(results).toHaveCount(0);await expect(page.locator('#result-count')).toContainText('0');
 await input.fill('');await expect(page.locator('.encyclopedia-chapter').first()).toBeVisible();
 await page.locator('[data-category="からだ探検"]').click();await expect(results).toHaveCount(articles.filter(a=>a.category==='からだ探検').length);
 await page.locator('#article-grid a[href$="/beak/"]').click();await expect(page.locator('.encyclopedia-story')).toBeVisible();
 const favorite=page.locator('#favorite');if(await favorite.getAttribute('aria-pressed')!=='true')await favorite.click();
 await expect(favorite).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('#favorite')).toHaveAttribute('aria-pressed','true');
 await page.goBack();await expect(page.locator('#article-search')).toBeVisible();
 await page.locator('[data-category="favorites"]').click();await expect(page.locator('#article-grid a[href$="/beak/"]')).toBeVisible();
 await page.locator('[data-category="all"]').click();await input.fill('');await expect(page.locator('.encyclopedia-chapter')).toHaveCount(6);
 await page.locator('.encyclopedia-editorial a[href$="/species/"]').first().click();await expect(page.locator('.encyclopedia-story')).toBeVisible();
 await page.goBack();await expect(page.locator('.encyclopedia-editorial')).toBeVisible();await page.goForward();await expect(page.locator('.encyclopedia-story')).toBeVisible();
 await noOverflow(page);
});

test('all 37 article destinations keep their educational text, sources and reading controls',async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const article of articles){
  await page.goto(`encyclopedia/${article.id}/`);await expect(page.locator('.encyclopedia-story')).toBeVisible();
  await expect(page.locator('h1')).toContainText(article.title);
  for(const id of ['favorite','speak','stop-speak','first','basic','deep','sources'])await expect(page.locator(`#${id}`)).toHaveCount(1);
  for(const [selector,source] of [['#basic',article.body],['#deep',article.deep]]){
   const expected=await page.evaluate(html=>{const div=document.createElement('div');div.innerHTML=html||'';return div.textContent.replace(/\s+/g,' ').trim();},source);
   expect(normalized(await page.locator(selector).textContent()),`${article.id} ${selector}`).toContain(expected);
  }
  await page.locator('#sources>summary').click();
  for(const source of article.sources.filter(s=>s.url))await expect(page.locator('#sources a').filter({hasText:source.title}).first()).toHaveAttribute('href',source.url);
  const sourceText=await page.locator('#sources').innerText();expect(sourceText).toContain(article.checkedAt||'2026-11-02');
  await decodedImages(page,'.encyclopedia-story');await noOverflow(page);
  if(['species','beak','colors-white','health','omochi'].includes(article.id)){
   await page.locator('#sources>summary').click();await page.evaluate(()=>scrollTo(0,0));
   await info.attach(`article-${article.id}`,{body:await page.screenshot({fullPage:true,scale:'css',animations:'disabled'}),contentType:'image/png'});
  }
 }
 expect(errors).toEqual([]);
});

test('encyclopedia design remains isolated from home and game',async({page})=>{
 await page.goto('');await expect(page.locator('.renewal-hero')).toBeVisible();await expect(page.locator('.encyclopedia-editorial,.encyclopedia-story')).toHaveCount(0);
 await page.goto('encyclopedia/');await expect(page.locator('.encyclopedia-editorial')).toBeVisible();
 await page.goto('game/');await expect(page.locator('html')).not.toHaveAttribute('data-site-renewal','1');
 await expect(page.locator('link[href*="site/encyclopedia"],script[src*="site/encyclopedia"]')).toHaveCount(0);
});

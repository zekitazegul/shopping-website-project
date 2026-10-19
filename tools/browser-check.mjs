import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:4173');
await page.waitForSelector('.card');if(await page.locator('.card').count()!==5)throw Error('Default NL filter');
await page.selectOption('#country','BE');if(await page.locator('.card').count()!==2)throw Error('BE filter');
await page.selectOption('#language','tr');if(await page.locator('.card').count()!==2)throw Error('Language changed country');if(await page.locator('html').getAttribute('lang')!=='tr')throw Error('Language');
await page.check('#nl-only');await page.locator('.favorite').first().click();await page.reload();await page.waitForSelector('.card');if(!(await page.locator('#favorites').textContent()).includes('(1)'))throw Error('Favorite persistence');
await page.locator('.detail-link').first().click();if(!await page.locator('dialog').isVisible())throw Error('Details');await page.keyboard.press('Escape');
await page.fill('#search','utrecht');if(await page.locator('.card').count()!==1)throw Error('Search');await page.fill('#search','no-results-123');if(!await page.locator('#empty').isVisible())throw Error('Empty');
await page.click('#empty-reset');if(await page.locator('.card').count()!==8)throw Error('Reset');
for(const lang of ['nl','en','tr']){await page.selectOption('#language',lang);for(const [width,height] of [[360,800],[800,360],[768,1024],[1024,768],[1440,900]]){await page.setViewportSize({width,height});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+lang+' '+width);}}
await page.setViewportSize({width:1440,height:1000});await page.selectOption('#language','nl');await page.screenshot({path:'preview-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'preview-mobile.png',fullPage:true});
if(errors.length)throw Error(errors.join('\n'));console.log('PASS: countries, languages, search, reset, details, favorite persistence, and 15 locale/viewport combinations.');
}finally{await browser.close();}

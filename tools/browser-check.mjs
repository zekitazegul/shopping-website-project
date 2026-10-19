import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const engine=process.env.BROWSER_ENGINE||'chromium';const browserType=require(process.env.PLAYWRIGHT_MODULE)[engine];
const browser=await browserType.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:4173');
await page.waitForSelector('.card');if(await page.locator('.card').count()!==5)throw Error('Default NL filter');
await page.selectOption('#country','BE');if(await page.locator('.card').count()!==2)throw Error('BE filter');
await page.selectOption('#language','tr');if(await page.locator('.card').count()!==2)throw Error('Language changed country');if(await page.locator('html').getAttribute('lang')!=='tr')throw Error('Language');
await page.check('#nl-only');await page.locator('.favorite').first().click();await page.reload();await page.waitForSelector('.card');if(!(await page.locator('#favorites').textContent()).includes('(1)'))throw Error('Favorite persistence');
await page.locator('.detail-link').first().click();if(!await page.locator('#detail').isVisible())throw Error('Details');await page.keyboard.press('Escape');
await page.fill('#search','utrecht');await page.waitForFunction(()=>document.querySelectorAll('.card').length===1);await page.fill('#search','no-results-123');await page.locator('#empty').waitFor({state:'visible'});
await page.click('#empty-reset');if(await page.locator('.card').count()!==8)throw Error('Reset');
if(await page.locator('#feedback-form').evaluate(form=>form.checkValidity()))throw Error('Empty feedback accepted');
await page.fill('#feedback-subject','Feature suggestion & question');await page.fill('#feedback-body','Please add a distance filter.');
await page.locator('#feedback-email').evaluate(link=>link.addEventListener('click',event=>{event.preventDefault();link.dataset.opened='true';}));
await page.locator('#feedback-form button').click();const feedbackUrl=new URL(await page.locator('#feedback-email').getAttribute('href'));if(feedbackUrl.protocol!=='mailto:'||feedbackUrl.pathname!=='ztazegul@yahoo.com'||feedbackUrl.searchParams.get('subject')!=='Feature suggestion & question'||feedbackUrl.searchParams.get('body')!=='Please add a distance filter.'||await page.locator('#feedback-email').getAttribute('data-opened')!=='true')throw Error('Email draft URL');
for(const lang of ['nl','en','tr','de','fr','it','es','pl','pt']){await page.selectOption('#language',lang);const notice=page.locator('.construction-notice');if(!await notice.isVisible()||!(await notice.textContent()).trim())throw Error('Construction notice '+lang);for(const [width,height] of [[320,568],[360,800],[800,360],[768,1024],[1024,768],[1440,900]]){await page.setViewportSize({width,height});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+lang+' '+width);}}
await page.setViewportSize({width:1440,height:1000});await page.selectOption('#language','nl');await page.screenshot({path:'preview-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'preview-mobile.png',fullPage:true});
if(errors.length)throw Error(errors.join('\n'));console.log('PASS '+engine+': countries, languages, search, reset, details, favorite persistence, construction notice, and 54 locale/viewport combinations.');
}finally{await browser.close();}

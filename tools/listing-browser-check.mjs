import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {Accounts} from '../server/accounts.mjs';
import {createApp} from '../server/http.mjs';
const require=createRequire(import.meta.url),engine=process.env.BROWSER_ENGINE||'chromium';
const browserType=require(process.env.PLAYWRIGHT_MODULE)[engine];
const mail=new Map(),errors=[];
const accounts=new Accounts({filename:':memory:',secret:'browser-listing-test-'.repeat(3),adminEmail:'owner@example.test',sendMail:async value=>mail.set(value.email,value.code)});
const base='http://127.0.0.1:4191';
const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:[base]});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4191,'127.0.0.1',resolve);});
const browser=await browserType.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
const ensure=(value,message)=>{if(!value)throw Error(message);};
async function login(email){
  const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(base);await page.selectOption('#language','en');await page.locator('#account-button').click();
  await page.fill('#auth-email',email);await page.locator('#auth-email-form button[type=submit]').click();await page.locator('#auth-code-form').waitFor({state:'visible'});
  await page.fill('#auth-code',mail.get(email));await page.locator('#auth-code-form button[type=submit]').click();await page.locator('#session-banner').waitFor({state:'visible'});return page;
}
try{
  const seller=await login('seller@example.test');ensure(await seller.locator('#listing-moderate').isHidden(),'Seller can moderate');
  await seller.locator('#listing-create').click();
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    // Change locale through the page's select handler while the modal is open.
    await seller.evaluate(lang=>{const select=document.getElementById('language');select.value=lang;select.dispatchEvent(new Event('change'));},lang);
    for(const [width,height] of [[320,568],[800,360],[768,1024],[1440,900]]){
      await seller.setViewportSize({width,height});ensure(await seller.locator('#listing-editor').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Listing form overflow '+lang);
    }
  }
  await seller.evaluate(()=>{const select=document.getElementById('language');select.value='en';select.dispatchEvent(new Event('change'));});
  await seller.fill('#listing-title','Handmade chair <script>');await seller.fill('#listing-description','A well-kept chair ready for a new home.');await seller.fill('#listing-price','42.50');await seller.fill('#listing-city','Antwerpen');await seller.selectOption('#listing-country','BE');
  ensure(await seller.locator('#listing-condition option').count()===5,'Missing condition options');await seller.selectOption('#listing-condition','openBox');
  const image=await sharp({create:{width:100,height:80,channels:3,background:'#335577'}}).png().toBuffer();
  await seller.locator('#listing-photos').setInputFiles(Array.from({length:4},(_,index)=>({name:'chair-'+index+'.png',mimeType:'image/png',buffer:image})));await seller.locator('#listing-submit').click();
  await seller.waitForFunction(()=>document.getElementById('listing-message').textContent.includes('submitted'));
  await seller.locator('#listing-editor-close').click();await seller.locator('#listing-mine').click();
  await seller.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Awaiting review'));
  await seller.waitForFunction(()=>document.querySelector('.managed-listing img')?.naturalWidth>0);
  const admin=await login('owner@example.test');await admin.locator('#listing-moderate').click();await admin.locator('.managed-listing .primary').click();
  await admin.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Published'));await admin.locator('#listing-manager-close').click();
  const visitor=await browser.newPage();await visitor.goto(base);await visitor.selectOption('#country','BE');await visitor.waitForSelector('.card');
  ensure(await visitor.locator('.card h3').textContent()==='Handmade chair <script>','Title was not rendered literally');await visitor.locator('.detail-link').click();await visitor.locator('#detail').waitFor({state:'visible'});
  await visitor.locator('.photo-enlarge').click();await visitor.locator('#photo-viewer').waitFor({state:'visible'});await visitor.waitForFunction(()=>document.getElementById('photo-full').naturalWidth>0);
  ensure(await visitor.locator('#photo-thumbnails button').count()===4,'Gallery missing photos');
  await visitor.locator('#photo-next').click();ensure(await visitor.locator('#photo-thumbnails button').nth(1).getAttribute('aria-pressed')==='true','Next photo failed');
  await visitor.keyboard.press('ArrowLeft');await visitor.keyboard.press('ArrowLeft');ensure(await visitor.locator('#photo-thumbnails button').nth(3).getAttribute('aria-pressed')==='true','Keyboard navigation failed');
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    await visitor.evaluate(lang=>{const el=document.getElementById('language');el.value=lang;el.dispatchEvent(new Event('change'));},lang);
    for(const [width,height]of [[320,568],[800,360],[768,1024],[1440,900]]){await visitor.setViewportSize({width,height});ensure(await visitor.locator('#photo-viewer').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().bottom<=innerHeight+1),'Gallery overflow '+lang);}
  }
  await visitor.locator('#photo-thumbnails button').nth(1).click();ensure(await visitor.locator('#photo-thumbnails button').nth(1).getAttribute('aria-pressed')==='true','Thumbnail navigation failed');
  await visitor.keyboard.press('Escape');ensure(await visitor.locator('#photo-viewer').isHidden(),'Gallery did not close');ensure(await visitor.locator('#detail').isVisible(),'Gallery closed listing details');await visitor.keyboard.press('Escape');
  await visitor.selectOption('#language','tr');ensure(await visitor.locator('#country').inputValue()==='BE','Language changed physical country');
  await seller.locator('#listing-manager-close').click();await seller.locator('#listing-mine').click();await seller.getByRole('button',{name:'Edit',exact:true}).click();
  ensure(await seller.locator('#listing-title').inputValue()==='Handmade chair <script>','Edit not prefilled');
  ensure(await seller.locator('#listing-condition').inputValue()==='openBox','Edit lost item condition');await seller.selectOption('#listing-condition','brandNew');
  await seller.fill('#listing-title','Updated chair');await seller.locator('#listing-submit').click();
  await seller.waitForFunction(()=>!document.getElementById('listing-editor').open);await seller.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Awaiting review'));
  await seller.waitForFunction(()=>document.querySelector('.managed-listing img')?.naturalWidth>0);
  await admin.locator('#listing-moderate').click();await admin.getByRole('button',{name:'Approve',exact:true}).click();await admin.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Published'));await admin.locator('#listing-manager-close').click();
  await seller.locator('#listing-manager-close').click();await seller.locator('#listing-mine').click();await seller.getByRole('button',{name:'Mark as sold',exact:true}).click();await seller.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Sold'));
  ensure(await seller.getByRole('button',{name:'Edit',exact:true}).count()===0,'Sold listing editable');
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    await seller.evaluate(lang=>{const select=document.getElementById('language');select.value=lang;select.dispatchEvent(new Event('change'));},lang);
    for(const [width,height] of [[320,568],[800,360],[768,1024],[1440,900]]){
      await seller.setViewportSize({width,height});ensure(await seller.locator('#listing-manager').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Relist manager overflow '+lang);
    }
  }
  await seller.evaluate(()=>{const select=document.getElementById('language');select.value='en';select.dispatchEvent(new Event('change'));});
  await seller.getByRole('button',{name:'Relist',exact:true}).click();await seller.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Awaiting review'));
  await seller.waitForFunction(()=>document.querySelector('.managed-listing img')?.naturalWidth>0);
  ensure((await seller.locator('#listing-manager-status').textContent()).includes('resubmitted'),'Relist confirmation missing');
  await visitor.reload();await visitor.waitForFunction(()=>document.querySelectorAll('.card').length===0);
  await admin.locator('#listing-moderate').click();await admin.getByRole('button',{name:'Approve',exact:true}).click();await admin.waitForFunction(()=>document.querySelector('.managed-listing')?.textContent.includes('Published'));await admin.locator('#listing-manager-close').click();
  await visitor.reload();await visitor.selectOption('#country','BE');await visitor.waitForSelector('.card');ensure(await visitor.locator('.card h3').textContent()==='Updated chair','Relisted item missing');
  await visitor.selectOption('#language','en');await visitor.selectOption('#condition','openBox');ensure(await visitor.locator('.card').count()===0,'Condition filter mixed open box and brand new');await visitor.selectOption('#condition','brandNew');ensure(await visitor.locator('.card').count()===1,'Brand new item not found');
  await admin.locator('#listing-moderate').click();await admin.locator('.managed-listing .text-button').click();await admin.waitForFunction(()=>document.querySelectorAll('.managed-listing button').length===0);
  await visitor.reload();await visitor.waitForFunction(()=>document.querySelectorAll('.card').length===0);ensure(!errors.length,errors.join('\n'));
  console.log('PASS '+engine+': create, photo, review, owner edit, sold, relist/review with retained photo, removal, public browsing, 72 localized form/manager viewports. No real email sent.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));accounts.close();}

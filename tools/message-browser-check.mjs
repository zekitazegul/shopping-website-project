import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {Accounts} from '../server/accounts.mjs';
import {Listings} from '../server/listings.mjs';
import {createApp} from '../server/http.mjs';
const require=createRequire(import.meta.url),engine=process.env.BROWSER_ENGINE||'chromium';
const browserType=require(process.env.PLAYWRIGHT_MODULE)[engine];
const mail=new Map(),errors=[],base='http://127.0.0.1:4192';
const accounts=new Accounts({filename:':memory:',secret:'chat-browser-test-'.repeat(3),adminEmail:'admin@example.test',sendMail:async value=>mail.set(value.email,value.code)});
new Listings(accounts);const sellerId=randomUUID(),listingId=randomUUID(),photoId=randomUUID();
accounts.db.prepare('INSERT INTO users(id,email,verified_at,is_admin) VALUES(?,?,?,0)').run(sellerId,'seller@example.test',Date.now());
accounts.db.prepare("INSERT INTO listings(id,owner_id,title,description,price_cents,kind,country,city,item_condition,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'approved',?)").run(listingId,sellerId,'A community chair','A nice chair with room for a new story.',3500,'home','NL','Utrecht','good',Date.now());
const photo=await sharp({create:{width:80,height:60,channels:3,background:'#557766'}}).jpeg().toBuffer();
accounts.db.prepare('INSERT INTO listing_photos(id,listing_id,position,data) VALUES(?,?,0,?)').run(photoId,listingId,photo);
const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:[base]});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4192,'127.0.0.1',resolve);});
const browser=await browserType.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
const ensure=(value,message)=>{if(!value)throw Error(message);};
async function login(email){
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.selectOption('#language','en');await page.locator('#account-button').click();await page.fill('#auth-email',email);await page.locator('#auth-email-form button[type=submit]').click();await page.locator('#auth-code-form').waitFor({state:'visible'});
  await page.fill('#auth-code',mail.get(email));await page.locator('#auth-code-form button[type=submit]').click();await page.locator('#session-banner').waitFor({state:'visible'});return page;
}
try{
  const buyer=await login('buyer@example.test');await buyer.locator('.detail-link').first().click();await buyer.locator('#contact-seller').click();await buyer.locator('#messages-dialog').waitFor({state:'visible'});
  await buyer.fill('#message-text','<b>Is this still available?</b>');await buyer.locator('#message-send').click();await buyer.waitForFunction(()=>document.querySelectorAll('.chat-message').length===1);
  ensure(await buyer.locator('.chat-message p').textContent()==='<b>Is this still available?</b>','Message HTML was not literal text');
  const seller=await login('seller@example.test');await seller.waitForFunction(()=>document.getElementById('message-inbox').textContent.includes('(1)'));await seller.locator('#message-inbox').click();await seller.locator('.conversation-link').click();await seller.waitForFunction(()=>document.querySelectorAll('.chat-message').length===1);
  await seller.fill('#message-text','Yes, it is available.');await seller.locator('#message-send').click();await seller.waitForFunction(()=>document.querySelectorAll('.chat-message').length===2);
  await buyer.locator('#message-refresh').click();await buyer.waitForFunction(()=>document.querySelectorAll('.chat-message').length===2);
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    await buyer.evaluate(lang=>{const select=document.getElementById('language');select.value=lang;select.dispatchEvent(new Event('change'));},lang);
    for(const [width,height] of [[320,568],[800,360],[768,1024],[1024,768],[1440,900]]){
      await buyer.setViewportSize({width,height});ensure(await buyer.locator('#messages-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Chat modal overflow '+lang);
    }
  }
  const admin=await login('admin@example.test');await admin.locator('#message-inbox').click();ensure(await admin.locator('.conversation-link').count()===0,'Admin saw another participant conversation');
  await seller.locator('#messages-close').click();await seller.locator('.detail-link').first().click();await seller.locator('#contact-seller').click();await seller.fill('#message-text','A self-message should not be sent.');await seller.locator('#message-send').click();await seller.waitForFunction(()=>document.getElementById('message-status').textContent.includes('your listing'));
  ensure(accounts.db.prepare('SELECT count(*) n FROM messages').get().n===2,'Self-message was stored');
  accounts.db.prepare("UPDATE listings SET status='removed' WHERE id=?").run(listingId);await buyer.locator('#message-refresh').click();await buyer.waitForFunction(()=>document.getElementById('message-text').disabled);
  await buyer.locator('#messages-close').click();await buyer.locator('#session-logout').click();await buyer.locator('#session-banner').waitFor({state:'hidden'});
  ensure(await buyer.locator('#message-history').textContent()==='','Logout retained message history in the DOM');
  ensure(!errors.length,errors.join('\n'));
  console.log('PASS '+engine+': real private buyer/seller chat, reply, unread badge, HTML escaping, admin isolation, self-message rejection, removed listing, logout cleanup and 45 localized viewports. No real email or messages sent.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));accounts.close();}

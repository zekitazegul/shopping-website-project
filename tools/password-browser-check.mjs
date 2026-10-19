import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {Accounts} from '../server/accounts.mjs';
import {createApp} from '../server/http.mjs';
const require=createRequire(import.meta.url),engine=process.env.BROWSER_ENGINE||'chromium';
const type=require(process.env.PLAYWRIGHT_MODULE)[engine];
const mail=[],accounts=new Accounts({filename:':memory:',secret:'password-browser-test-'.repeat(3),adminEmail:'admin@example.test',sendMail:async value=>mail.push(value)});
const base='http://127.0.0.1:4193',server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:[base]});
await new Promise(resolve=>server.listen(4193,'127.0.0.1',resolve));
const browser=await type.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
const ensure=(value,message)=>{if(!value)throw Error(message);};
async function checkVisibility(page,id){
  const input=page.locator('#'+id),button=page.locator(`.password-toggle[aria-controls="${id}"]`);
  await input.fill('visibility test 123');await button.click();ensure(await input.getAttribute('type')==='text','Password not shown: '+id);ensure(await button.getAttribute('aria-pressed')==='true','Missing visible state');ensure((await button.getAttribute('aria-label')).startsWith('Hide password'),'Missing accessible hide label');
  await button.click();ensure(await input.getAttribute('type')==='password','Password not hidden: '+id);ensure(await input.inputValue()==='visibility test 123','Toggle changed password');await input.fill('');
}
try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.selectOption('#language','en');await page.locator('#account-button').click();
  ensure(!await page.locator('#auth-remember').isChecked(),'Remember must be opt-in');
  await page.fill('#auth-email','invalid');await page.locator('#auth-password-login').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('valid email'));ensure(mail.length===0,'Invalid email sent request');
  await page.fill('#auth-email','member@example.test');await page.locator('#auth-password-login').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('enter your site password'));
  await checkVisibility(page,'auth-login-password');ensure(mail.length===0,'Eye button submitted login form');
  await page.fill('#auth-email','member@example.test');await page.locator('#auth-email-form button[type=submit]').click();await page.locator('#auth-code-form').waitFor({state:'visible'});
  await page.fill('#auth-code',mail[0].code);await page.locator('#auth-code-form button[type=submit]').click();await page.locator('#session-banner').waitFor({state:'visible'});
  ensure(await page.locator('#auth-dialog').evaluate(el=>el.open),'Success message was not shown in login dialog');ensure((await page.locator('#auth-status').textContent()).includes('Welcome!'),'Missing inline code-login welcome');await page.locator('#auth-dialog').waitFor({state:'hidden'});
  ensure(!await page.locator('#auth-dialog').evaluate(el=>el.open),'Code login kept dialog open');
  await page.locator('#account-button').click();await page.locator('#auth-password-form').waitFor({state:'visible'});
  for(const id of ['auth-current-password','auth-new-password','auth-confirm-password'])await checkVisibility(page,id);
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    await page.evaluate(lang=>{const el=document.getElementById('language');el.value=lang;el.dispatchEvent(new Event('change'));},lang);
    for(const [width,height]of [[320,568],[800,360],[768,1024],[1440,900]]){await page.setViewportSize({width,height});ensure(await page.locator('#auth-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Password form overflow '+lang);}
  }
  await page.evaluate(()=>{const el=document.getElementById('language');el.value='en';el.dispatchEvent(new Event('change'));});
  await page.fill('#auth-new-password','example test password 123');await page.fill('#auth-confirm-password','example test password 999');await page.locator('#auth-password-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('must match'));
  await page.fill('#auth-confirm-password','example test password 123');await page.locator('#auth-password-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('saved'));
  await page.locator('#auth-logout').click();await page.locator('#auth-email-form').waitFor({state:'visible'});
  await page.fill('#auth-email','member@example.test');await page.fill('#auth-login-password','wrong password');await page.locator('#auth-password-login').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('Incorrect'));
  ensure(await page.locator('#auth-dialog').evaluate(el=>el.open),'Failed login closed dialog');ensure(await page.locator('#login-notification').isHidden(),'Failed login showed success');
  ensure(await page.locator('#auth-status').getAttribute('role')==='alert','Login error not announced');
  await page.fill('#auth-email','unknown@example.test');await page.locator('#auth-password-login').click();await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('Incorrect'));ensure(await page.locator('#auth-dialog').evaluate(el=>el.open),'Unknown email redirected');await page.fill('#auth-email','member@example.test');
  await page.evaluate(()=>{history.replaceState(null,'','#browse');window.scrollTo(0,document.body.scrollHeight);});
  await page.locator('#auth-remember').check();await page.fill('#auth-login-password','example test password 123');await page.locator('#auth-login-password').press('Enter');await page.locator('#session-banner').waitFor({state:'visible'});
  ensure(await page.locator('#auth-dialog').evaluate(el=>el.open),'Password success skipped inline confirmation');ensure((await page.locator('#auth-status').textContent()).includes('Welcome!'),'Missing inline password welcome');ensure(await page.locator('#auth-status').getAttribute('data-state')==='success','Success state not styled');ensure(await page.locator('#auth-password-form').isHidden(),'Password settings appeared during login success');await page.locator('#auth-dialog').waitFor({state:'hidden'});
  ensure(!await page.locator('#auth-dialog').evaluate(el=>el.open),'Password login kept dialog open');await page.locator('#login-notification').waitFor({state:'visible'});ensure((await page.locator('#login-notification-text').textContent()).includes('Signed in'),'Missing success text');ensure(await page.evaluate(()=>scrollY===0&&!location.hash),'Login did not return home');
  await page.locator('#login-notification-close').click();ensure(await page.locator('#login-notification').isHidden(),'Notification did not close');
  ensure(mail.length===1,'Password login sent an email');await page.close();
  const restored=await context.newPage();await restored.goto(base);await restored.locator('#session-banner').waitFor({state:'visible'});ensure(await restored.locator('#session-email').textContent()==='member@example.test','New tab lost remembered user');
  const another=await context.newPage();await another.goto(base);await another.locator('#session-banner').waitFor({state:'visible'});
  await restored.locator('#session-logout').click();await restored.locator('#session-banner').waitFor({state:'hidden'});await another.bringToFront();await another.evaluate(()=>window.dispatchEvent(new Event('focus')));await another.locator('#session-banner').waitFor({state:'hidden'});
  ensure(await restored.evaluate(()=>localStorage.getItem('shopping.home.auth.remembered'))===null,'Logout kept remembered session');
  ensure(!errors.length,errors.join(';'));console.log('PASS '+engine+': real OTP, password creation/mismatch, wrong/correct password without new email, remembered new tab after closing old tab, logout across tabs, 36 localized password viewports.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));accounts.close();}

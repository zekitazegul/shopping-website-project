import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
try {
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#account-button').click();
  ensure(await page.locator('#auth-email-form').isHidden(),'Unconfigured form must not accept registrations');
  ensure((await page.locator('#auth-status').textContent()).length>10,'Missing setup notice');
  for(const lang of ['tr','en','nl','de','fr','it','es','pl','pt']){
    await page.locator('#auth-close').click();await page.selectOption('#language',lang);await page.locator('#account-button').click();
    for(const [width,height] of [[320,568],[800,360],[768,1024],[1440,900]]){
      await page.setViewportSize({width,height});
      ensure(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Page overflow '+lang);
      ensure(await page.locator('#auth-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Dialog overflow '+lang);
    }
  }
  await page.locator('#auth-close').click();
  await page.route('**/src/auth-config.js',route=>route.fulfill({contentType:'text/javascript',body:"export const authConfig={url:'https://home.example.test/api'};"}));
  let admin=false;
  await page.route('https://home.example.test/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    const body=request.postDataJSON();let data={},status=200;
    if(path.endsWith('/verify-code')){
      if(body.code==='000000')status=400;
      else data={token:'test-only-token',expiresAt:Date.now()+3600000};
    }else if(path.endsWith('/session'))data={user:{id:'test-user',email:'person@example.test',admin}};
    else if(path.endsWith('/admin/stats'))data={accounts:5,verified:4};
    await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(data)});
  });
  await page.reload();await page.selectOption('#language','en');
  await page.locator('#account-button').click();await page.fill('#auth-email','person@example.test');await page.locator('#auth-email-form button').click();
  await page.locator('#auth-code-form').waitFor({state:'visible'});
  await page.fill('#auth-code','000000');await page.locator('#auth-code-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('Unable'));
  ensure(await page.locator('#auth-session').isHidden(),'Invalid code granted access');
  await page.fill('#auth-code','123456');await page.locator('#auth-code-form button[type=submit]').click();await page.locator('#auth-session').waitFor({state:'visible'});
  ensure(await page.locator('#auth-admin-panel').isHidden(),'User metadata granted admin');
  await page.locator('#auth-close').click();await page.locator('#admin-login').click();
  await page.waitForFunction(()=>document.getElementById('auth-status').textContent.includes('does not have admin'));
  await page.locator('#auth-logout').click();await page.locator('#auth-email-form').waitFor({state:'visible'});
  admin=true;await page.fill('#auth-email','person@example.test');await page.locator('#auth-email-form button').click();await page.locator('#auth-code-form').waitFor({state:'visible'});
  await page.fill('#auth-code','123456');await page.locator('#auth-code-form button[type=submit]').click();await page.locator('#auth-admin-panel').waitFor({state:'visible'});
  ensure(await page.locator('#auth-total').textContent()==='5','Admin stats missing');
  await page.locator('#auth-logout').click();await page.locator('#auth-email-form').waitFor({state:'visible'});
  ensure(await page.locator('#auth-admin-panel').isHidden(),'Logout retained admin access');
  ensure(!errors.length,errors.join('\n'));
  console.log('PASS: 36 auth locale/viewports, setup state, mocked OTP, invalid code, member/admin authorization and logout. No email sent.');
}finally{await browser.close();}

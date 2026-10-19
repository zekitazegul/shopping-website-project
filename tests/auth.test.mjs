import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {backup} from 'node:sqlite';
import {Accounts} from '../server/accounts.mjs';
import {createApp} from '../server/http.mjs';
import {createAuth,validAuthConfig} from '../src/auth.js';
const root=resolve(import.meta.dirname,'..');
const memoryStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function setup(t,{sendFailure=false}={}){
  let time=Date.UTC(2026,9,19,12,10,0);const mail=[];
  const accounts=new Accounts({filename:':memory:',secret:'test-secret-'.repeat(4),adminEmail:'owner@example.test',now:()=>time,sendMail:async value=>{if(sendFailure)throw Error('private SMTP error');mail.push(value);}});
  t.after(()=>accounts.close());
  return {accounts,mail,advance:ms=>{time+=ms;},now:()=>time};
}
async function api(t,options={}){
  const state=setup(t,options);
  const server=createApp({accounts:state.accounts,mailReady:!options.unready,root,origins:['https://market.example.test']});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=(path,{body,token,headers={}}={})=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...headers},...(body?{body:JSON.stringify(body)}:{})});
  return {...state,base,call};
}
test('remember today persists across tabs, expires at local midnight on server and clears on logout',async t=>{
  const {base,mail,now,advance,accounts}=await api(t);const persistentStorage=memoryStorage();
  const options={persistentStorage,now,fetcher:(path,options)=>fetch(base+path,options)};
  const first=createAuth({url:'/api'},{...options,storage:memoryStorage()});
  await first.sendCode('remember@example.test');await first.verifyCode('remember@example.test',mail[0].code,true);
  const saved=JSON.parse(persistentStorage.getItem('shopping.home.auth.remembered'));const midnight=new Date(now());midnight.setHours(24,0,0,0);
  assert.equal(saved.expiresAt,Math.min(midnight.getTime(),now()+86400000));
  const second=createAuth({url:'/api'},{...options,storage:memoryStorage()});assert.equal((await second.access()).email,'remember@example.test');
  advance(saved.expiresAt-now());assert.equal(await second.access(),null);assert.throws(()=>accounts.requireVerified(saved.token),/authInvalid/);assert.equal(persistentStorage.getItem('shopping.home.auth.remembered'),null);
  await first.sendCode('remember@example.test');await first.verifyCode('remember@example.test',mail.at(-1).code,true);
  const third=createAuth({url:'/api'},{...options,storage:memoryStorage()});const token=JSON.parse(persistentStorage.getItem('shopping.home.auth.remembered')).token;
  await third.signOut();assert.equal(await first.access(),null);assert.throws(()=>accounts.requireVerified(token),/authInvalid/);
});
test('unchecked login stays in current tab and temporary network failures retain remembered login',async t=>{
  const {base,mail,now}=await api(t);const persistentStorage=memoryStorage(),storage=memoryStorage();let offline=false;
  const options={persistentStorage,now,fetcher:(path,options)=>{if(offline)throw Error('offline');return fetch(base+path,options);}};
  const auth=createAuth({url:'/api'},{...options,storage});await auth.sendCode('tab@example.test');await auth.verifyCode('tab@example.test',mail[0].code);
  assert.equal(persistentStorage.getItem('shopping.home.auth.remembered'),null);assert.equal(await createAuth({url:'/api'},{...options,storage:memoryStorage()}).access(),null);
  assert.ok(await createAuth({url:'/api'},{...options,storage}).access());
  await auth.sendCode('other@example.test');await auth.verifyCode('other@example.test',mail.at(-1).code,true);offline=true;await assert.rejects(auth.access(),/authNetwork/);offline=false;assert.equal((await auth.access()).email,'other@example.test');
});
test('verified accounts create hashed passwords and sign in without email codes',async t=>{
  const {accounts,mail}=setup(t);const password='example test password 123';
  await assert.rejects(accounts.setPassword(null,password),/authInvalid/);await assert.rejects(accounts.signInPassword('new@example.test',password,'ip'),/authPasswordInvalid/);
  await accounts.sendCode('person@example.test','ip');const original=accounts.verifyCode('person@example.test',mail[0].code,'ip');
  await assert.rejects(accounts.setPassword(original.token,'short'),/authPasswordLength/);await accounts.setPassword(original.token,password);
  const stored=accounts.db.prepare('SELECT * FROM account_passwords').get();assert.notEqual(stored.digest,password);assert.equal(stored.digest.length,128);assert.equal(stored.salt.length,32);
  const login=await accounts.signInPassword('person@example.test',password,'ip');assert.equal(login.user.admin,false);assert.equal(login.user.hasPassword,true);assert.equal(mail.length,1);
  await assert.rejects(accounts.signInPassword('person@example.test','wrong password','ip'),/authPasswordInvalid/);
  for(let i=0;i<10;i++){try{await accounts.signInPassword('nonexistent@example.test','wrong','another-ip');}catch{}}
  await assert.rejects(accounts.signInPassword('nonexistent@example.test','wrong','another-ip'),/authRateLimit/);
});
test('password changes require current password or fresh code and revoke other sessions',async t=>{
  const {accounts,mail,advance}=setup(t);await accounts.sendCode('person@example.test','ip');const codeSession=accounts.verifyCode('person@example.test',mail[0].code,'ip');
  await accounts.setPassword(codeSession.token,'initial password 123');const login=await accounts.signInPassword('person@example.test','initial password 123','ip');
  await assert.rejects(accounts.setPassword(login.token,'replacement password 456','wrong'),/authPasswordReauth/);
  await accounts.setPassword(login.token,'replacement password 456','initial password 123');assert.throws(()=>accounts.requireVerified(codeSession.token),/authInvalid/);
  await assert.rejects(accounts.signInPassword('person@example.test','initial password 123','ip'),/authPasswordInvalid/);
  advance(60001);await accounts.sendCode('person@example.test','ip');const reset=accounts.verifyCode('person@example.test',mail.at(-1).code,'ip');
  await accounts.setPassword(reset.token,'recovered password 789');assert.throws(()=>accounts.requireVerified(login.token),/authInvalid/);
  advance(600000);await assert.rejects(accounts.setPassword(reset.token,'another password 123'),/authPasswordReauth/);
});
test('real HTTP password login and remembered client session need no new code',async t=>{
  const {base,mail,now,call}=await api(t);const persistentStorage=memoryStorage();const options={now,persistentStorage,fetcher:(path,options)=>fetch(base+path,options)};
  const auth=createAuth({url:'/api'},{...options,storage:memoryStorage()});await auth.sendCode('person@example.test');await auth.verifyCode('person@example.test',mail[0].code);await auth.setPassword('a site password 123');await auth.signOut();
  const user=await auth.signInPassword('person@example.test','a site password 123',true);assert.equal(user.hasPassword,true);assert.equal(mail.length,1);
  assert.ok(await createAuth({url:'/api'},{...options,storage:memoryStorage()}).access());
  assert.equal((await call('/api/password',{body:{password:'a forged password'}})).status,401);
  assert.equal((await call('/api/password-login',{body:{email:'person@example.test',password:'a site password 123',rememberUntil:now()+86400001}})).status,400);
});
test('only a correct unexpired code creates an account; replay and forged tokens fail',async t=>{
  const {accounts,mail}=setup(t);await accounts.sendCode(' PERSON@example.test ','ip','tr');
  assert.equal(mail[0].locale,'tr');assert.equal(accounts.db.prepare('SELECT count(*) n FROM users').get().n,0);
  const challenge=accounts.db.prepare('SELECT * FROM challenges').get();assert.notEqual(challenge.digest,mail[0].code);
  const code=mail[0].code,wrong=code==='000000'?'000001':'000000';
  assert.throws(()=>accounts.verifyCode('person@example.test',wrong,'ip'),/authInvalid/);
  const session=accounts.verifyCode('person@example.test',code,'ip');assert.equal(session.user.admin,false);
  assert.throws(()=>accounts.verifyCode('person@example.test',code,'ip'),/authInvalid/);
  assert.throws(()=>accounts.requireVerified('forged'),/authInvalid/);
  assert.notEqual(accounts.db.prepare('SELECT digest FROM sessions').get().digest,session.token);
  accounts.logout(session.token);assert.throws(()=>accounts.requireVerified(session.token),/authInvalid/);
});
test('resend cooldown, replacement codes, attempt cap and expiry are enforced on server',async t=>{
  const {accounts,mail,advance}=setup(t);await accounts.sendCode('person@example.test','ip');
  await assert.rejects(accounts.sendCode('person@example.test','ip'),/authRateLimit/);
  advance(61000);await accounts.sendCode('person@example.test','ip');
  const code=mail[1].code,wrong=code==='000000'?'000001':'000000';
  for(let i=0;i<5;i++)assert.throws(()=>accounts.verifyCode('person@example.test',wrong,'ip'),/authInvalid/);
  assert.throws(()=>accounts.verifyCode('person@example.test',code,'ip'),/authInvalid/);
  advance(61000);await accounts.sendCode('person@example.test','ip');advance(600001);
  assert.throws(()=>accounts.verifyCode('person@example.test',mail[2].code,'ip'),/authInvalid/);
});
test('failed email delivery never yields a usable challenge',async t=>{
  const {accounts}=setup(t,{sendFailure:true});await assert.rejects(accounts.sendCode('person@example.test','ip'),/authUnavailable/);
  assert.equal(accounts.db.prepare('SELECT count(*) n FROM challenges').get().n,0);
  assert.equal(accounts.db.prepare('SELECT count FROM limits WHERE bucket=?').get(accounts.hash(`send-email:person@example.test:${Math.floor(accounts.now()/3600000)}`)).count,0);
});
test('cooldown retries do not consume email quota and return an accurate wait time',async t=>{
  const {accounts,advance}=setup(t);await accounts.sendCode('person@example.test','ip');
  advance(10000);
  for(let i=0;i<8;i++)await assert.rejects(accounts.sendCode('person@example.test','ip'),error=>error.status===429 && error.retryAfter===50);
  const bucket=accounts.hash(`send-email:person@example.test:${Math.floor(accounts.now()/3600000)}`);
  assert.equal(accounts.db.prepare('SELECT count FROM limits WHERE bucket=?').get(bucket).count,1);
  advance(51000);await accounts.sendCode('person@example.test','ip');
});
test('HTTP rate limit carries Retry-After for the browser countdown',async t=>{
  const {call}=await api(t);await call('/api/send-code',{body:{email:'person@example.test'}});
  const response=await call('/api/send-code',{body:{email:'person@example.test'}});
  assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');
});
test('only the configured verified administrator can access stats; sessions expire',async t=>{
  const {accounts,mail,advance}=setup(t);await accounts.sendCode('person@example.test','ip');
  const member=accounts.verifyCode('person@example.test',mail.at(-1).code,'ip');assert.throws(()=>accounts.adminStats(member.token),/authAdminDenied/);
  await accounts.sendCode('owner@example.test','ip');const admin=accounts.verifyCode('owner@example.test',mail.at(-1).code,'ip');
  assert.equal(admin.user.admin,true);assert.equal(accounts.adminStats(admin.token).accounts,2);
  advance(86400001);assert.throws(()=>accounts.requireVerified(admin.token),/authInvalid/);
});
test('HTTP denies foreign origins, private files, unverified admin access and email injection',async t=>{
  const {call}=await api(t);
  assert.equal((await call('/api/send-code',{body:{email:'person@example.test'},headers:{Origin:'https://evil.example'}})).status,403);
  for(const path of ['/.server-config.json','/.server-data/accounts.sqlite','/.git/config','/server/main.mjs'])assert.equal((await call(path)).status,404);
  assert.equal((await call('/api/admin/stats')).status,401);
  assert.equal((await call('/api/send-code',{body:{email:'bad@example.test\r\nBcc:x@example.test'}})).status,400);
  const allowed=await call('/api/send-code',{body:{email:'person@example.test'},headers:{Origin:'https://market.example.test'}});
  assert.equal(allowed.status,200);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://market.example.test');
});
test('frontend authenticates against real local API and cannot grant itself admin',async t=>{
  const {base,mail,now}=await api(t);const values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const auth=createAuth({url:'/api'},{storage,now,fetcher:(path,options)=>fetch(base+path,options)});
  await auth.sendCode('person@example.test','nl');const user=await auth.verifyCode('person@example.test',mail[0].code);
  assert.equal(user.admin,false);assert.equal(values.get('shopping.home.auth').includes(mail[0].code),false);
  await assert.rejects(auth.adminStats(),/authAdminDenied/);await auth.signOut();assert.equal(await auth.access(),null);
});
test('missing SMTP disables signup instead of simulating delivery',async t=>{
  const {call}=await api(t,{unready:true});assert.deepEqual(await (await call('/api/status')).json(),{ready:false});
  assert.equal((await call('/api/send-code',{body:{email:'person@example.test'}})).status,503);
  assert.match(await(await call('/src/auth-config.js')).text(),/"url":""/);
});
test('frontend permits same-origin or HTTPS APIs and rejects insecure credentials URLs',async()=>{
  assert.equal(validAuthConfig({url:'/api'}),true);assert.equal(validAuthConfig({url:'https://home.example.test/api'}),true);
  for(const url of ['http://home.example.test/api','https://user:secret@home.example.test/api','https://home.example.test/api?secret=x','file:///api'])assert.equal(validAuthConfig({url}),false);
  const auth=createAuth({url:''},{storage:null,fetcher:()=>{throw Error('No network expected');}});
  await assert.rejects(auth.sendCode('person@example.test'),/authUnavailable/);
});
test('SQLite online backup restores verified accounts and sessions on a new database',async()=>{
  const prefix=resolve(tmpdir(),'marketplace-auth-'),directory=mkdtempSync(prefix),secret='backup-test-secret-'.repeat(3);let first,restored;let mail;
  try{
    first=new Accounts({filename:resolve(directory,'source.sqlite'),secret,adminEmail:'owner@example.test',sendMail:async value=>{mail=value;}});
    await first.sendCode('owner@example.test','ip');const session=first.verifyCode('owner@example.test',mail.code,'ip');
    await first.setPassword(session.token,'backup example password 123');
    await backup(first.db,resolve(directory,'restored.sqlite'));first.close();first=null;
    restored=new Accounts({filename:resolve(directory,'restored.sqlite'),secret,adminEmail:'owner@example.test',sendMail:async()=>{}});
    assert.equal(restored.requireVerified(session.token).admin,true);assert.equal(restored.adminStats(session.token).accounts,1);
    assert.equal((await restored.signInPassword('owner@example.test','backup example password 123','ip')).user.admin,true);
    restored.logout(session.token);assert.throws(()=>restored.requireVerified(session.token),/authInvalid/);
  }finally{
    first?.close();restored?.close();
    if(!resolve(directory).startsWith(prefix))throw Error('Unexpected test directory');
    rmSync(directory,{recursive:true,force:true});
  }
});

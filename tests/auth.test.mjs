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
function setup(t,{sendFailure=false}={}){
  let time=Date.now();const mail=[];
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
    await backup(first.db,resolve(directory,'restored.sqlite'));first.close();first=null;
    restored=new Accounts({filename:resolve(directory,'restored.sqlite'),secret,adminEmail:'owner@example.test',sendMail:async()=>{}});
    assert.equal(restored.requireVerified(session.token).admin,true);assert.equal(restored.adminStats(session.token).accounts,1);
    restored.logout(session.token);assert.throws(()=>restored.requireVerified(session.token),/authInvalid/);
  }finally{
    first?.close();restored?.close();
    if(!resolve(directory).startsWith(prefix))throw Error('Unexpected test directory');
    rmSync(directory,{recursive:true,force:true});
  }
});

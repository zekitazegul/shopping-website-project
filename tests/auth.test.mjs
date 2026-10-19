import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuth,validAuthConfig} from '../src/auth.js';
const config={url:'https://example-project.supabase.co',publishableKey:'sb_publishable_test'};
function harness({admin=false,verified=true}={}) {
  const values=new Map();const calls=[];let time=100000;
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const fetcher=async(url,options)=>{
    calls.push({url,...options});let data={};
    if(url.endsWith('/verify'))data={access_token:'test-token',expires_in:60};
    else if(url.endsWith('/user'))data={id:'test-user',email:'person@example.test',email_confirmed_at:verified?'2026-10-19':null,user_metadata:{admin:true}};
    else if(url.endsWith('/account_access'))data={verified,admin};
    else if(url.endsWith('/admin_account_stats'))data={accounts:4,verified:3};
    return {ok:true,status:200,json:async()=>data};
  };
  const auth=createAuth(config,{fetcher,storage,now:()=>time});
  return {auth,calls,values,expire:()=>{time+=61000;}};
}
test('unconfigured auth cannot send email or create a local fake account',async()=>{
  const auth=createAuth({},{fetcher:()=>{throw Error('must not call network');},storage:null});
  assert.equal(auth.configured,false);await assert.rejects(auth.sendCode('person@example.test'),/authUnavailable/);assert.equal(await auth.access(),null);
});
test('only public Supabase keys and expected HTTPS hosts are accepted',()=>{
  assert.equal(validAuthConfig(config),true);
  for(const key of ['sb_secret_test','service_role','eyJhbGciOiJIUzI1NiJ9'])assert.equal(validAuthConfig({...config,publishableKey:key}),false);
  assert.equal(validAuthConfig({...config,url:'https://example-project.supabase.co.evil.test'}),false);
});
test('code send and verify use server endpoints; code and refresh token are not persisted',async()=>{
  const {auth,calls,values}=harness();await auth.sendCode('person@example.test');
  assert.equal(JSON.parse(calls[0].body).create_user,true);
  const user=await auth.verifyCode('person@example.test','123456');assert.equal(user.admin,false);
  assert.deepEqual(JSON.parse(calls[1].body),{email:'person@example.test',token:'123456',type:'email'});
  assert.equal(values.get('shopping.auth').includes('123456'),false);
});
test('client user metadata cannot grant admin access',async()=>{
  const {auth,calls}=harness();await auth.verifyCode('person@example.test','123456');
  await assert.rejects(auth.adminStats(),/authAdminDenied/);
  assert.equal(calls.some(call=>call.url.endsWith('/admin_account_stats')),false);
});
test('only verified server-approved admins can fetch admin stats',async()=>{
  const {auth}=harness({admin:true});await auth.verifyCode('person@example.test','123456');
  assert.deepEqual(await auth.adminStats(),{accounts:4,verified:3});
});
test('unverified, expired and signed-out sessions fail closed',async()=>{
  const unverified=harness({verified:false,admin:true});assert.equal(await unverified.auth.verifyCode('person@example.test','123456'),null);
  assert.equal(unverified.values.size,0);
  const normal=harness();await normal.auth.verifyCode('person@example.test','123456');normal.expire();assert.equal(await normal.auth.access(),null);
  await normal.auth.verifyCode('person@example.test','123456');await normal.auth.signOut();assert.equal(await normal.auth.access(),null);
});
test('malformed codes do not reach verification server',async()=>{
  const {auth,calls}=harness();await assert.rejects(auth.verifyCode('person@example.test','123abc'),/authInvalid/);assert.equal(calls.length,0);
});

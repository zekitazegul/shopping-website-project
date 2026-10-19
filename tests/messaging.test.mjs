import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {backup} from 'node:sqlite';
import {Accounts} from '../server/accounts.mjs';
import {Listings} from '../server/listings.mjs';
import {Messaging} from '../server/messaging.mjs';
import {createApp} from '../server/http.mjs';

async function setup(t){
  let mail,time=Date.now();const accounts=new Accounts({filename:':memory:',secret:'message-test-secret-'.repeat(3),adminEmail:'admin@example.test',now:()=>time,sendMail:async value=>{mail=value;}});
  const tokens={};for(const name of ['admin','seller','buyer','other']){const email=name+'@example.test';await accounts.sendCode(email,name);tokens[name]=accounts.verifyCode(email,mail.code,name).token;}
  new Listings(accounts);const listingId=randomUUID(),seller=accounts.requireVerified(tokens.seller);
  accounts.db.prepare("INSERT INTO listings(id,owner_id,title,description,price_cents,kind,country,city,item_condition,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'approved',?)").run(listingId,seller.id,'A useful chair','A lovely chair for another home.',1000,'home','NL','Utrecht','good',time);
  const messaging=new Messaging(accounts);t.after(()=>accounts.close());
  const body=(text='Is this still available?')=>({listingId,text,clientId:randomUUID()});
  return {accounts,messaging,tokens,listingId,body,advance:ms=>{time+=ms;}};
}
test('only two verified participants can read; admins and unrelated users cannot bypass privacy',async t=>{
  const {messaging,tokens,body}=await setup(t);
  assert.throws(()=>messaging.start(null,body()),/authInvalid/);assert.throws(()=>messaging.start(tokens.seller,body()),/messageOwnListing/);
  const thread=messaging.start(tokens.buyer,{...body(),sellerId:'forged-recipient'});
  for(const token of [tokens.other,tokens.admin]){assert.throws(()=>messaging.read(token,thread.id),/messageAccess/);assert.throws(()=>messaging.send(token,thread.id,body()),/messageAccess/);assert.deepEqual(messaging.inbox(token),[]);}
  const result=messaging.read(tokens.seller,thread.id);assert.equal(result.messages[0].fromMe,false);
  const serialized=JSON.stringify(result);for(const forbidden of ['@example.test','sender_id','buyer_id','seller_id'])assert.equal(serialized.includes(forbidden),false);
});
test('thread reuse and idempotent sends prevent duplicates; unread state is per participant',async t=>{
  const {messaging,tokens,body}=await setup(t);const first=body('<b>Literal question</b>');
  const thread=messaging.start(tokens.buyer,first);assert.equal(messaging.start(tokens.buyer,first).id,thread.id);
  assert.equal(messaging.inbox(tokens.seller)[0].unread,1);messaging.read(tokens.seller,thread.id);assert.equal(messaging.inbox(tokens.seller)[0].unread,0);
  const reply=body('Yes, it is available.');messaging.send(tokens.seller,thread.id,reply);messaging.send(tokens.seller,thread.id,reply);
  assert.equal(messaging.inbox(tokens.buyer)[0].unread,1);
  const page=messaging.read(tokens.buyer,thread.id);assert.equal(page.messages.length,2);assert.equal(page.messages[0].text,'<b>Literal question</b>');assert.equal(page.messages[0].fromMe,true);assert.equal(page.messages[1].fromMe,false);
  assert.equal(messaging.inbox(tokens.buyer)[0].unread,0);
  assert.throws(()=>messaging.send(tokens.seller,thread.id,{...reply,text:'changed'}),/messageInvalid/);
});
test('removed listings keep private history but prohibit new messages',async t=>{
  const {accounts,messaging,tokens,listingId,body}=await setup(t);const thread=messaging.start(tokens.buyer,body());
  accounts.db.prepare("UPDATE listings SET status='removed' WHERE id=?").run(listingId);
  assert.equal(messaging.read(tokens.buyer,thread.id).conversation.status,'removed');
  assert.throws(()=>messaging.send(tokens.seller,thread.id,body()),/messageClosed/);assert.throws(()=>messaging.start(tokens.other,body()),/messageClosed/);
});
test('message limits validate content and leave no empty conversation after rate rejection',async t=>{
  const {accounts,messaging,tokens,body}=await setup(t);
  for(const text of ['',' '.repeat(10),'x'.repeat(2001)])assert.throws(()=>messaging.start(tokens.buyer,body(text)),/messageInvalid/);
  const user=accounts.requireVerified(tokens.buyer),minute=Math.floor(accounts.now()/60000);
  const bucket=accounts.hash(`message-minute:${user.id}:${minute}`);
  accounts.db.prepare('INSERT INTO limits(bucket,count,expires) VALUES(?,30,?)').run(bucket,accounts.now()+60000);
  assert.throws(()=>messaging.start(tokens.buyer,body()),error=>error.status===429);
  assert.equal(messaging.inbox(tokens.buyer).length,0);assert.equal(accounts.db.prepare('SELECT count(*) n FROM messages').get().n,0);
});
test('older messages paginate without losing history',async t=>{
  const {messaging,tokens,body,advance}=await setup(t);const thread=messaging.start(tokens.buyer,body('First message'));
  for(let i=0;i<105;i++){if(i%25===0)advance(61000);messaging.send(tokens.seller,thread.id,body('Reply '+i));}
  const newest=messaging.read(tokens.buyer,thread.id);assert.equal(newest.messages.length,100);assert.equal(newest.hasMore,true);
  const older=messaging.read(tokens.buyer,thread.id,newest.messages[0].id);assert.equal(older.messages.length,6);assert.equal(older.hasMore,false);assert.equal(older.messages[0].text,'First message');
});
test('HTTP endpoints require session, reject the GitHub demo origin and never cache message content',async t=>{
  const {accounts,messaging,tokens,body}=await setup(t);const thread=messaging.start(tokens.buyer,body());
  const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:['https://zekitazegul.github.io']});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/api/conversations')).status,401);
  assert.equal((await fetch(base+'/api/conversations/'+thread.id,{headers:{Authorization:'Bearer '+tokens.admin}})).status,403);
  assert.equal((await fetch(base+'/api/conversations',{headers:{Authorization:'Bearer '+tokens.buyer,Origin:'https://zekitazegul.github.io'}})).status,403);
  const response=await fetch(base+'/api/conversations/'+thread.id,{headers:{Authorization:'Bearer '+tokens.buyer}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('private conversations and unread state survive database backup and restoration',async t=>{
  const {accounts,messaging,tokens,body}=await setup(t);const thread=messaging.start(tokens.buyer,body());
  const prefix=resolve(tmpdir(),'marketplace-chat-'),directory=mkdtempSync(prefix);let restored;
  try{const filename=resolve(directory,'accounts.sqlite');await backup(accounts.db,filename);restored=new Accounts({filename,secret:accounts.secret,adminEmail:'admin@example.test',sendMail:async()=>{}});const copy=new Messaging(restored);assert.equal(copy.inbox(tokens.seller)[0].unread,1);assert.equal(copy.read(tokens.seller,thread.id).messages.length,1);assert.throws(()=>copy.read(tokens.other,thread.id),/messageAccess/);}
  finally{restored?.close();if(!resolve(directory).startsWith(prefix))throw Error('Unexpected test path');rmSync(directory,{recursive:true,force:true});}
});

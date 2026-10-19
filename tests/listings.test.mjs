import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {Accounts} from '../server/accounts.mjs';
import {Listings} from '../server/listings.mjs';
import {createApp} from '../server/http.mjs';
import {resolve} from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {backup} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {Messaging} from '../server/messaging.mjs';

async function setup(t){
  let mail;const accounts=new Accounts({filename:':memory:',secret:'listing-test-secret-'.repeat(3),adminEmail:'owner@example.test',sendMail:async value=>{mail=value;}});
  const tokens={};for(const email of ['owner@example.test','seller@example.test','other@example.test']){await accounts.sendCode(email,email);tokens[email.split('@')[0]]=accounts.verifyCode(email,mail.code,email).token;}
  const listings=new Listings(accounts);t.after(()=>accounts.close());
  const image=await sharp({create:{width:64,height:48,channels:3,background:'#336699'}}).png().withMetadata().toBuffer();
  function form({country='NL',photo=image,title='A handmade chair',price='12.50'}={}){
    const data=new FormData();for(const [key,value] of Object.entries({title,description:'A well-kept chair ready for a new home.',price,kind:'home',country,city:'Utrecht',condition:'good'}))data.set(key,value);
    data.append('photos',new File([photo],'chair.png',{type:'image/png'}));return data;
  }
  return {accounts,listings,tokens,image,form};
}
test('only owner can relist sold items, preserving photos and conversations through review',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const messaging=new Messaging(accounts);
  const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);
  const thread=messaging.start(tokens.other,{listingId:row.id,text:'Is this available?',clientId:randomUUID()});
  listings.sold(tokens.seller,row.id);
  assert.throws(()=>listings.relist(null,row.id),/authInvalid/);
  for(const token of [tokens.other,tokens.owner])assert.throws(()=>listings.relist(token,row.id),/listingActionFailed/);
  assert.equal(listings.mine(tokens.seller)[0].status,'sold');
  listings.relist(tokens.seller,row.id);
  const pending=listings.mine(tokens.seller)[0];assert.equal(pending.id,row.id);assert.equal(pending.status,'pending');assert.deepEqual(pending.photos,row.photos);assert.equal(listings.publicList().length,0);
  assert.throws(()=>listings.photo(row.photos[0]),/authInvalid/);
  assert.equal(messaging.read(tokens.other,thread.id).messages[0].text,'Is this available?');
  assert.throws(()=>messaging.send(tokens.other,thread.id,{text:'Available now?',clientId:randomUUID()}),/messageClosed/);
  assert.throws(()=>listings.relist(tokens.seller,row.id),/listingActionFailed/);
  listings.approve(tokens.owner,row.id);assert.equal(listings.publicList()[0].id,row.id);assert.ok(listings.photo(row.photos[0]).length);
  messaging.send(tokens.seller,thread.id,{text:'Available again',clientId:randomUUID()});assert.equal(messaging.read(tokens.other,thread.id).messages.length,2);
  assert.throws(()=>listings.relist(tokens.seller,row.id),/listingActionFailed/);
  listings.sold(tokens.seller,row.id);listings.remove(tokens.seller,row.id);assert.throws(()=>listings.relist(tokens.seller,row.id),/listingActionFailed/);
});
test('HTTP relisting requires owner session and cannot bypass administrator review',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);listings.sold(tokens.seller,row.id);
  const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:['https://zekitazegul.github.io']});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/api/listings/'+row.id+'/relist';
  assert.equal((await fetch(url,{method:'POST'})).status,401);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+tokens.other}})).status,409);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+tokens.seller,Origin:'https://zekitazegul.github.io'}})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+tokens.seller}})).status,200);
  assert.equal(listings.publicList().length,0);assert.equal(listings.mine(tokens.seller)[0].status,'pending');
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+tokens.seller}})).status,409);
});
test('verified seller can submit; only admin can publish; pending photos are private',async t=>{
  const {listings,tokens,form}=await setup(t);
  await assert.rejects(listings.create(null,form()),/authInvalid/);
  const row=await listings.create(tokens.seller,form());assert.equal(row.status,'pending');assert.equal(row.price,12.5);
  assert.equal(listings.publicList().length,0);assert.equal(listings.mine(tokens.seller).length,1);assert.equal(listings.mine(tokens.other).length,0);
  assert.throws(()=>listings.review(tokens.seller),/authAdminDenied/);
  assert.throws(()=>listings.photo(row.photos[0]),/authInvalid/);
  assert.throws(()=>listings.photo(row.photos[0],tokens.other),/listingActionFailed/);
  const metadata=await sharp(Buffer.from(listings.photo(row.photos[0],tokens.seller))).metadata();
  assert.equal(metadata.format,'jpeg');assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);
  assert.throws(()=>listings.approve(tokens.seller,row.id),/authAdminDenied/);
  listings.approve(tokens.owner,row.id);assert.equal(listings.publicList().length,1);assert.ok(listings.photo(row.photos[0]).length);
});
test('country is physical item location; invalid fields and forged images leave no listing',async t=>{
  const {listings,tokens,form}=await setup(t);
  for(const data of [form({country:'FR'}),form({price:'-1'}),form({photo:Buffer.from('<svg><script>alert(1)</script></svg>')})])await assert.rejects(listings.create(tokens.seller,data));
  assert.equal(listings.mine(tokens.seller).length,0);
  const row=await listings.create(tokens.seller,form({country:'BE',title:'<script>literal text</script>'}));
  assert.equal(row.country,'BE');assert.equal(row.title,'<script>literal text</script>');
  assert.equal(Object.hasOwn(row,'owner_id'),false);assert.equal(Object.hasOwn(row,'email'),false);
});
test('only owner or administrator can remove; removed photos become inaccessible',async t=>{
  const {listings,tokens,form}=await setup(t);const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);
  assert.throws(()=>listings.remove(tokens.other,row.id),/listingActionFailed/);
  listings.remove(tokens.seller,row.id);assert.equal(listings.publicList().length,0);
  assert.throws(()=>listings.photo(row.photos[0],tokens.owner),/listingActionFailed/);
  assert.equal(listings.mine(tokens.seller)[0].status,'removed');
  const second=await listings.create(tokens.seller,form());listings.remove(tokens.owner,second.id);assert.equal(listings.mine(tokens.seller)[0].status,'removed');
});
test('real multipart HTTP upload, CORS boundary and image visibility follow moderation',async t=>{
  const {accounts,tokens,form}=await setup(t);
  const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..'),origins:['https://zekitazegul.github.io','https://market.example.test']});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/api/listings',{method:'POST',body:form()})).status,401);
  assert.equal((await fetch(base+'/api/listings',{headers:{Origin:'https://zekitazegul.github.io'}})).status,403);
  const response=await fetch(base+'/api/listings',{method:'POST',headers:{Authorization:'Bearer '+tokens.seller,Origin:'https://market.example.test'},body:form()});
  assert.equal(response.status,201);const row=await response.json();
  assert.equal((await fetch(base+'/api/photos/'+row.photos[0])).status,401);
  const approve=await fetch(base+'/api/admin/listings/'+row.id+'/approve',{method:'POST',headers:{Authorization:'Bearer '+tokens.owner}});assert.equal(approve.status,200);
  const photo=await fetch(base+'/api/photos/'+row.photos[0]);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/jpeg');
  const rows=await(await fetch(base+'/api/listings')).json();assert.equal(rows[0].id,row.id);
});
test('online database backup restores listing metadata, photos and ownership',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);
  const prefix=resolve(tmpdir(),'marketplace-photo-'),directory=mkdtempSync(prefix);let restored;
  try{
    const filename=resolve(directory,'accounts.sqlite');await backup(accounts.db,filename);
    restored=new Accounts({filename,secret:accounts.secret,adminEmail:'owner@example.test',sendMail:async()=>{}});
    const copy=new Listings(restored);assert.equal(copy.publicList()[0].title,row.title);assert.equal(copy.mine(tokens.seller)[0].id,row.id);
    assert.deepEqual(Buffer.from(copy.photo(row.photos[0])),Buffer.from(listings.photo(row.photos[0])));
  }finally{restored?.close();if(!resolve(directory).startsWith(prefix))throw Error('Unexpected test path');rmSync(directory,{recursive:true,force:true});}
});

test('only owners edit; edits require review, retain or replace photos atomically',async t=>{
  const {listings,tokens,form}=await setup(t);const original=await listings.create(tokens.seller,form());listings.approve(tokens.owner,original.id);
  const update=form({title:'An updated chair',country:'DE',price:'25.99'});update.delete('photos');
  await assert.rejects(listings.create(tokens.other,update,original.id),/listingActionFailed/);
  await assert.rejects(listings.create(tokens.owner,update,original.id),/listingActionFailed/);
  const edited=await listings.create(tokens.seller,update,original.id);
  assert.equal(edited.id,original.id);assert.equal(edited.status,'pending');assert.equal(edited.country,'DE');assert.equal(edited.price,25.99);assert.deepEqual(edited.photos,original.photos);assert.equal(listings.publicList().length,0);
  assert.throws(()=>listings.photo(original.photos[0]),/authInvalid/);
  listings.approve(tokens.owner,original.id);
  await assert.rejects(listings.create(tokens.seller,form({photo:Buffer.from('invalid')}),original.id),/listingPhotoError/);
  assert.equal(listings.publicList()[0].title,'An updated chair');assert.ok(listings.photo(original.photos[0]).length);
  const replaced=await listings.create(tokens.seller,form(),original.id);assert.notEqual(replaced.photos[0],original.photos[0]);assert.throws(()=>listings.photo(original.photos[0],tokens.seller),/listingActionFailed/);
});
test('sold items leave catalogue and cannot be edited, republished or marked by others',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const {Messaging}=await import('../server/messaging.mjs');const messaging=new Messaging(accounts);
  const row=await listings.create(tokens.seller,form());assert.throws(()=>listings.sold(tokens.seller,row.id),/listingActionFailed/);listings.approve(tokens.owner,row.id);
  const {randomUUID}=await import('node:crypto');const body={text:'Is this available?',clientId:randomUUID(),listingId:row.id};const thread=messaging.start(tokens.other,body);
  assert.throws(()=>listings.sold(tokens.other,row.id),/listingActionFailed/);assert.throws(()=>listings.sold(tokens.owner,row.id),/listingActionFailed/);
  listings.sold(tokens.seller,row.id);assert.equal(listings.publicList().length,0);assert.equal(listings.mine(tokens.seller)[0].status,'sold');
  assert.equal(messaging.read(tokens.other,thread.id).conversation.status,'sold');assert.equal(messaging.inbox(tokens.seller)[0].status,'sold');
  assert.throws(()=>messaging.send(tokens.other,thread.id,{text:'Another message',clientId:randomUUID()}),/messageClosed/);assert.throws(()=>messaging.start(tokens.other,{...body,clientId:randomUUID()}),/messageClosed/);
  await assert.rejects(listings.create(tokens.seller,form(),row.id),/listingActionFailed/);assert.throws(()=>listings.approve(tokens.owner,row.id),/listingActionFailed/);
  new Listings(accounts);assert.equal(listings.mine(tokens.seller)[0].status,'sold');listings.remove(tokens.seller,row.id);assert.equal(listings.mine(tokens.seller)[0].status,'removed');
});
test('HTTP edit and sold actions enforce ownership and moderation',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);
  const server=createApp({accounts,mailReady:true,root:resolve(import.meta.dirname,'..')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port+'/api/listings/'+row.id;
  assert.equal((await fetch(base+'/edit',{method:'POST',body:form()})).status,401);
  assert.equal((await fetch(base+'/edit',{method:'POST',headers:{Authorization:'Bearer '+tokens.other},body:form()})).status,409);
  const edit=form();edit.delete('photos');assert.equal((await fetch(base+'/edit',{method:'POST',headers:{Authorization:'Bearer '+tokens.seller},body:edit})).status,200);
  assert.equal(listings.mine(tokens.seller)[0].status,'pending');listings.approve(tokens.owner,row.id);
  assert.equal((await fetch(base+'/sold',{method:'POST',headers:{Authorization:'Bearer '+tokens.other}})).status,409);
  assert.equal((await fetch(base+'/sold',{method:'POST',headers:{Authorization:'Bearer '+tokens.seller}})).status,200);assert.equal(listings.publicList().length,0);
});

test('existing database gains sold column without losing approved listings or photos',async t=>{
  const {accounts,listings,tokens,form}=await setup(t);const row=await listings.create(tokens.seller,form());listings.approve(tokens.owner,row.id);
  accounts.db.exec('ALTER TABLE listings DROP COLUMN sold_at');const migrated=new Listings(accounts);
  assert.equal(migrated.publicList()[0].id,row.id);assert.equal(migrated.mine(tokens.seller)[0].status,'approved');assert.ok(migrated.photo(row.photos[0]).length);
  migrated.sold(tokens.seller,row.id);assert.equal(migrated.mine(tokens.seller)[0].status,'sold');
});

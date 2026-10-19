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

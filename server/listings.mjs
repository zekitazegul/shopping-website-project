import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {AuthError} from './accounts.mjs';

const kinds=['home','fashion','electronics','bikes','leisure'];
export class Listings {
  constructor(accounts){
    this.accounts=accounts;this.db=accounts.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS listings(
      id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,kind TEXT NOT NULL,country TEXT NOT NULL,city TEXT NOT NULL,item_condition TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','removed')),created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS listing_photos(id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,position INTEGER NOT NULL,data BLOB NOT NULL);
      CREATE INDEX IF NOT EXISTS listings_status_time ON listings(status,created_at);
      CREATE INDEX IF NOT EXISTS listings_owner ON listings(owner_id);`);
    if(!this.db.prepare('PRAGMA table_info(listings)').all().some(column=>column.name==='sold_at'))this.db.exec('ALTER TABLE listings ADD COLUMN sold_at INTEGER');
  }
  rows(where='',params=[]){
    return this.db.prepare(`SELECT id,title,description,price_cents,kind,country,city,item_condition,status,sold_at,created_at FROM listings ${where} ORDER BY created_at DESC,id DESC LIMIT 100`).all(...params).map(row=>({
      id:row.id,title:row.title,description:row.description,price:row.price_cents/100,kind:row.kind,country:row.country,city:row.city,condition:row.item_condition,status:row.sold_at!==null&&row.status!=='removed'?'sold':row.status,createdAt:row.created_at,
      photos:this.db.prepare('SELECT id FROM listing_photos WHERE listing_id=? ORDER BY position').all(row.id).map(photo=>photo.id)
    }));
  }
  publicList(){return this.rows("WHERE status='approved' AND sold_at IS NULL");}
  mine(token){const user=this.accounts.requireVerified(token);return this.rows('WHERE owner_id=?',[user.id]);}
  review(token){if(!this.accounts.requireVerified(token).admin)throw new AuthError(403,'authAdminDenied');return this.rows();}
  async create(token,form,id=null){
    const user=this.accounts.requireVerified(token);
    if(id)this.editable(user,id);
    const field=(key,min,max)=>{const value=form.get(key);if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new AuthError(400,'listingInvalid');return value.trim();};
    const title=field('title',3,120),description=field('description',20,3000),city=field('city',2,100);
    const price=field('price',1,12),kind=field('kind',1,30),country=field('country',2,2),condition=field('condition',1,20);
    if(!/^\d{1,6}(\.\d{1,2})?$/.test(price)||Number(price)<=0||!kinds.includes(kind)||!['NL','BE','DE'].includes(country)||!['new','likeNew','good'].includes(condition))throw new AuthError(400,'listingInvalid');
    const files=form.getAll('photos');if((!id&&files.length<1)||files.length>4)throw new AuthError(400,'listingPhotoError');
    this.accounts.limit(id?'edit-listing':'create-listing',user.id,20,86400000);
    const photos=[];
    for(const file of files){
      if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024||file.size===0)throw new AuthError(400,'listingPhotoError');
      try{
        const buffer=Buffer.from(await file.arrayBuffer());
        const jpeg=buffer.subarray(0,3).equals(Buffer.from([255,216,255]));
        const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const webp=buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
        if(!jpeg&&!png&&!webp)throw Error();
        const image=sharp(buffer,{limitInputPixels:25000000});
        const metadata=await image.metadata();
        if(!['jpeg','png','webp'].includes(metadata.format)||(metadata.pages||1)>1)throw Error();
        photos.push(await image.rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:82}).toBuffer());
      }catch{throw new AuthError(400,'listingPhotoError');}
    }
    const editing=Boolean(id);id=id||randomUUID();this.db.exec('BEGIN IMMEDIATE');
    try{
      if(editing){this.editable(user,id);this.db.prepare("UPDATE listings SET title=?,description=?,price_cents=?,kind=?,country=?,city=?,item_condition=?,status='pending' WHERE id=?").run(title,description,Math.round(Number(price)*100),kind,country,city,condition,id);if(photos.length)this.db.prepare('DELETE FROM listing_photos WHERE listing_id=?').run(id);}
      else this.db.prepare('INSERT INTO listings(id,owner_id,title,description,price_cents,kind,country,city,item_condition,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,user.id,title,description,Math.round(Number(price)*100),kind,country,city,condition,this.accounts.now());
      const insert=this.db.prepare('INSERT INTO listing_photos(id,listing_id,position,data) VALUES(?,?,?,?)');
      photos.forEach((data,index)=>insert.run(randomUUID(),id,index,data));this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');throw error;}
    return this.rows('WHERE id=?',[id])[0];
  }
  editable(user,id){
    const listing=this.db.prepare('SELECT owner_id,status,sold_at FROM listings WHERE id=?').get(id);
    if(!listing||listing.owner_id!==user.id||listing.status==='removed'||listing.sold_at!==null)throw new AuthError(409,'listingActionFailed');
    return listing;
  }
  sold(token,id){
    const user=this.accounts.requireVerified(token);this.editable(user,id);
    const result=this.db.prepare("UPDATE listings SET sold_at=? WHERE id=? AND status='approved' AND sold_at IS NULL").run(this.accounts.now(),id);
    if(!result.changes)throw new AuthError(409,'listingActionFailed');
    return {ok:true};
  }
  relist(token,id){
    const user=this.accounts.requireVerified(token);
    const result=this.db.prepare("UPDATE listings SET status='pending',sold_at=NULL WHERE id=? AND owner_id=? AND status='approved' AND sold_at IS NOT NULL").run(id,user.id);
    if(!result.changes)throw new AuthError(409,'listingActionFailed');
    return {ok:true};
  }
  approve(token,id){
    if(!this.accounts.requireVerified(token).admin)throw new AuthError(403,'authAdminDenied');
    const result=this.db.prepare("UPDATE listings SET status='approved' WHERE id=? AND status='pending'").run(id);
    if(!result.changes)throw new AuthError(409,'listingActionFailed');
    return {ok:true};
  }
  remove(token,id){
    const user=this.accounts.requireVerified(token);
    const listing=this.db.prepare('SELECT owner_id,status FROM listings WHERE id=?').get(id);
    if(!listing || (listing.owner_id!==user.id&&!user.admin))throw new AuthError(403,'listingActionFailed');
    this.db.exec('BEGIN IMMEDIATE');
    try{this.db.prepare("UPDATE listings SET status='removed' WHERE id=?").run(id);this.db.prepare('DELETE FROM listing_photos WHERE listing_id=?').run(id);this.db.exec('COMMIT');}
    catch(error){this.db.exec('ROLLBACK');throw error;}
    return {ok:true};
  }
  photo(id,token){
    const photo=this.db.prepare('SELECT p.data,l.status,l.owner_id FROM listing_photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=?').get(id);
    if(!photo)throw new AuthError(404,'listingActionFailed');
    if(photo.status!=='approved'){
      const user=this.accounts.requireVerified(token);
      if(!user.admin&&user.id!==photo.owner_id)throw new AuthError(403,'listingActionFailed');
    }
    return photo.data;
  }
}

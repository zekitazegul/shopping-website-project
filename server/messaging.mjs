import {randomUUID} from 'node:crypto';
import {AuthError} from './accounts.mjs';

const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export class Messaging {
  constructor(accounts){
    this.accounts=accounts;this.db=accounts.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS conversations(
      id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES listings(id),buyer_id TEXT NOT NULL REFERENCES users(id),seller_id TEXT NOT NULL REFERENCES users(id),
      buyer_read INTEGER NOT NULL DEFAULT 0,seller_read INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,UNIQUE(listing_id,buyer_id));
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id TEXT NOT NULL REFERENCES conversations(id),sender_id TEXT NOT NULL REFERENCES users(id),client_id TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(conversation_id,sender_id,client_id));
      CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id,id);
      CREATE INDEX IF NOT EXISTS conversations_buyer ON conversations(buyer_id,updated_at);
      CREATE INDEX IF NOT EXISTS conversations_seller ON conversations(seller_id,updated_at);`);
  }
  participant(token,id){
    const user=this.accounts.requireVerified(token);
    const thread=this.db.prepare('SELECT c.*,l.title,l.status FROM conversations c JOIN listings l ON l.id=c.listing_id WHERE c.id=? AND (c.buyer_id=? OR c.seller_id=?)').get(id,user.id,user.id);
    if(!thread)throw new AuthError(403,'messageAccess');
    return {user,thread};
  }
  summary(thread,user){
    const buyer=thread.buyer_id===user.id;
    return {id:thread.id,listingId:thread.listing_id,title:thread.title,status:thread.status,role:buyer?'buyer':'seller',updatedAt:thread.updated_at,
      unread:this.db.prepare('SELECT count(*) n FROM messages WHERE conversation_id=? AND sender_id!=? AND id>?').get(thread.id,user.id,buyer?thread.buyer_read:thread.seller_read).n};
  }
  inbox(token){
    const user=this.accounts.requireVerified(token);
    return this.db.prepare('SELECT c.*,l.title,l.status FROM conversations c JOIN listings l ON l.id=c.listing_id WHERE c.buyer_id=? OR c.seller_id=? ORDER BY c.updated_at DESC,c.id LIMIT 100').all(user.id,user.id).map(row=>this.summary(row,user));
  }
  validate(body){
    if(!body || typeof body.text!=='string' || body.text.trim().length<1 || body.text.trim().length>2000 || body.text.includes('\0') || !uuid(body.clientId))throw new AuthError(400,'messageInvalid');
    return body.text.trim();
  }
  write(user,thread,body){
    const text=this.validate(body);
    const existing=this.db.prepare('SELECT id,body FROM messages WHERE conversation_id=? AND sender_id=? AND client_id=?').get(thread.id,user.id,body.clientId);
    if(existing){if(existing.body!==text)throw new AuthError(400,'messageInvalid');return existing.id;}
    if(thread.status!=='approved')throw new AuthError(409,'messageClosed');
    this.accounts.limit('message-minute',user.id,30,60000);this.accounts.limit('message-day',user.id,300,86400000);
    const now=this.accounts.now();
    const result=this.db.prepare('INSERT INTO messages(conversation_id,sender_id,client_id,body,created_at) VALUES(?,?,?,?,?)').run(thread.id,user.id,body.clientId,text,now);
    this.db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now,thread.id);
    return Number(result.lastInsertRowid);
  }
  start(token,body){
    const user=this.accounts.requireVerified(token);this.validate(body);
    if(!uuid(body.listingId))throw new AuthError(400,'messageInvalid');
    const listing=this.db.prepare("SELECT id,owner_id,status FROM listings WHERE id=? AND status='approved'").get(body.listingId);
    if(!listing)throw new AuthError(409,'messageClosed');
    if(listing.owner_id===user.id)throw new AuthError(409,'messageOwnListing');
    let thread=this.db.prepare('SELECT c.*,l.status FROM conversations c JOIN listings l ON l.id=c.listing_id WHERE c.listing_id=? AND c.buyer_id=?').get(listing.id,user.id);
    this.db.exec('BEGIN IMMEDIATE');
    try{
      if(!thread){
        this.accounts.limit('new-conversation',user.id,20,86400000);
        thread={id:randomUUID(),listing_id:listing.id,buyer_id:user.id,seller_id:listing.owner_id,status:listing.status};
        this.db.prepare('INSERT INTO conversations(id,listing_id,buyer_id,seller_id,updated_at) VALUES(?,?,?,?,?)').run(thread.id,thread.listing_id,thread.buyer_id,thread.seller_id,this.accounts.now());
      }
      this.write(user,thread,body);this.db.exec('COMMIT');return {id:thread.id};
    }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  send(token,id,body){const {user,thread}=this.participant(token,id);this.db.exec('BEGIN IMMEDIATE');try{this.write(user,thread,body);this.db.exec('COMMIT');return {ok:true};}catch(error){this.db.exec('ROLLBACK');throw error;}}
  read(token,id,before){
    const {user,thread}=this.participant(token,id);
    if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new AuthError(400,'messageInvalid');
    const rows=this.db.prepare('SELECT id,sender_id,body,created_at FROM messages WHERE conversation_id=? AND id<? ORDER BY id DESC LIMIT 101').all(id,before||Number.MAX_SAFE_INTEGER);
    const hasMore=rows.length>100;const page=rows.slice(0,100).reverse();
    if(before===undefined){
      const newest=this.db.prepare('SELECT max(id) n FROM messages WHERE conversation_id=?').get(id).n||0;
      this.db.prepare(`UPDATE conversations SET ${thread.buyer_id===user.id?'buyer_read':'seller_read'}=? WHERE id=?`).run(newest,id);
    }
    return {conversation:{id:thread.id,title:thread.title,status:thread.status,role:thread.buyer_id===user.id?'buyer':'seller'},hasMore,messages:page.map(row=>({id:row.id,text:row.body,fromMe:row.sender_id===user.id,createdAt:row.created_at}))};
  }
}

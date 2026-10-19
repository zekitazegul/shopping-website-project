import {DatabaseSync} from 'node:sqlite';
import {createHmac, randomInt, randomBytes, randomUUID, timingSafeEqual, scrypt} from 'node:crypto';
import {promisify} from 'node:util';
const derivePassword=promisify(scrypt);

export class AuthError extends Error {
  constructor(status,key,retryAfter){super(key);this.status=status;this.retryAfter=retryAfter;}
}
export function normalizeEmail(value){
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw new AuthError(400,'authInvalid');
  return email;
}
export class Accounts {
  constructor({filename,secret,adminEmail,sendMail,now=Date.now}){
    if(!secret || secret.length<32)throw Error('A private server key is required');
    this.db=new DatabaseSync(filename);this.secret=secret;this.adminEmail=normalizeEmail(adminEmail);this.sendMail=sendMail;this.now=now;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,verified_at INTEGER NOT NULL,is_admin INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS challenges(email TEXT PRIMARY KEY,nonce TEXT NOT NULL,digest TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,sent INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS account_passwords(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,salt TEXT NOT NULL,digest TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS session_proofs(digest TEXT PRIMARY KEY REFERENCES sessions(digest) ON DELETE CASCADE,verified_at INTEGER NOT NULL);`);
  }
  hash(value){return createHmac('sha256',this.secret).update(value).digest('hex');}
  prune(){const now=this.now();for(const table of ['sessions','limits'])this.db.prepare(`DELETE FROM ${table} WHERE expires <= ?`).run(now);this.db.prepare('DELETE FROM challenges WHERE expires < ?').run(now-86400000);}
  limit(kind,value,max,window){
    const now=this.now(),bucket=this.hash(`${kind}:${value}:${Math.floor(now/window)}`);
    const expires=(Math.floor(now/window)+1)*window;
    const previous=this.db.prepare('SELECT count FROM limits WHERE bucket=?').get(bucket);
    if(previous?.count>=max)throw new AuthError(429,'authRateLimit',Math.max(1,Math.ceil((expires-now)/1000)));
    this.db.prepare('INSERT INTO limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1,expires=excluded.expires').run(bucket,expires);
    return bucket;
  }
  async sendCode(value,ip,locale='en'){
    const email=normalizeEmail(value);this.prune();
    this.limit('send-ip',ip,30,3600000);
    const previous=this.db.prepare('SELECT sent FROM challenges WHERE email=?').get(email);
    if(previous && previous.sent+60000>this.now())throw new AuthError(429,'authRateLimit',Math.ceil((previous.sent+60000-this.now())/1000));
    const emailBucket=this.limit('send-email',email,6,3600000);
    const code=String(randomInt(0,1000000)).padStart(6,'0'),nonce=randomBytes(16).toString('hex');
    const digest=this.hash(`${email}:${nonce}:${code}`),now=this.now();
    this.db.prepare('INSERT INTO challenges(email,nonce,digest,expires,attempts,sent) VALUES(?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET nonce=excluded.nonce,digest=excluded.digest,expires=excluded.expires,attempts=0,sent=excluded.sent').run(email,nonce,digest,now+600000,now);
    try{await this.sendMail({email,code,locale});}
    catch{this.db.prepare('DELETE FROM challenges WHERE email=? AND nonce=?').run(email,nonce);this.db.prepare('UPDATE limits SET count=max(0,count-1) WHERE bucket=?').run(emailBucket);throw new AuthError(503,'authUnavailable');}
  }
  verifyCode(value,code,ip,rememberUntil){
    if(rememberUntil!==undefined&&(!Number.isSafeInteger(rememberUntil)||rememberUntil<=this.now()||rememberUntil>this.now()+86400000))throw new AuthError(400,'authInvalid');
    const email=normalizeEmail(value);this.limit('verify-ip',ip,60,600000);
    if(typeof code!=='string' || !/^\d{6}$/.test(code))throw new AuthError(400,'authInvalid');
    const challenge=this.db.prepare('SELECT * FROM challenges WHERE email=?').get(email);
    if(!challenge || challenge.expires<=this.now() || challenge.attempts>=5)throw new AuthError(400,'authInvalid');
    this.db.prepare('UPDATE challenges SET attempts=attempts+1 WHERE email=?').run(email);
    const digest=this.hash(`${email}:${challenge.nonce}:${code}`);
    if(!timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(challenge.digest,'hex')))throw new AuthError(400,'authInvalid');
    const token=randomBytes(32).toString('base64url'),expiresAt=rememberUntil??this.now()+86400000;
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('DELETE FROM challenges WHERE email=?').run(email);
      this.db.prepare('INSERT INTO users(id,email,verified_at,is_admin) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET verified_at=excluded.verified_at').run(randomUUID(),email,this.now(),email===this.adminEmail?1:0);
      // The owner-approved administrator is configured on this server, never in request data.
      if(email===this.adminEmail)this.db.prepare('UPDATE users SET is_admin=1 WHERE email=?').run(email);
      const user=this.db.prepare('SELECT id FROM users WHERE email=?').get(email);
      this.db.prepare('INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)').run(this.hash(`session:${token}`),user.id,expiresAt);
      this.db.prepare('INSERT INTO session_proofs(digest,verified_at) VALUES(?,?)').run(this.hash(`session:${token}`),this.now());
      this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');throw error;}
    return {token,expiresAt,user:this.requireVerified(token)};
  }
  requireVerified(token){
    if(typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token))throw new AuthError(401,'authInvalid');
    const user=this.db.prepare('SELECT u.id,u.email,u.is_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.digest=? AND s.expires>? AND u.verified_at IS NOT NULL').get(this.hash(`session:${token}`),this.now());
    if(!user)throw new AuthError(401,'authInvalid');
    return {id:user.id,email:user.email,admin:user.is_admin===1,hasPassword:!!this.db.prepare('SELECT 1 FROM account_passwords WHERE user_id=?').get(user.id)};
  }
  async passwordMatches(password,record){
    const digest=await derivePassword(password,record?.salt||'unknown-account-salt',64);
    return !!record&&timingSafeEqual(digest,Buffer.from(record.digest,'hex'));
  }
  async signInPassword(value,password,ip,rememberUntil){
    const email=normalizeEmail(value);this.prune();this.limit('password-ip',ip,30,600000);this.limit('password-email',email,10,600000);
    if(typeof password!=='string'||password.length<1||password.length>128)throw new AuthError(400,'authPasswordInvalid');
    if(rememberUntil!==undefined&&(!Number.isSafeInteger(rememberUntil)||rememberUntil<=this.now()||rememberUntil>this.now()+86400000))throw new AuthError(400,'authInvalid');
    const record=this.db.prepare('SELECT p.*,u.verified_at FROM account_passwords p JOIN users u ON u.id=p.user_id WHERE u.email=?').get(email);
    if(!await this.passwordMatches(password,record)||!record.verified_at)throw new AuthError(400,'authPasswordInvalid');
    if(this.db.prepare('SELECT digest FROM account_passwords WHERE user_id=?').get(record.user_id)?.digest!==record.digest)throw new AuthError(400,'authPasswordInvalid');
    const token=randomBytes(32).toString('base64url'),expiresAt=rememberUntil??this.now()+86400000;
    this.db.prepare('INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)').run(this.hash(`session:${token}`),record.user_id,expiresAt);
    return {token,expiresAt,user:this.requireVerified(token)};
  }
  async setPassword(token,password,currentPassword){
    const user=this.requireVerified(token);this.limit('set-password',user.id,10,3600000);
    if(typeof password!=='string'||password.length<10||password.length>128)throw new AuthError(400,'authPasswordLength');
    const record=this.db.prepare('SELECT * FROM account_passwords WHERE user_id=?').get(user.id);
    const proof=this.db.prepare('SELECT verified_at FROM session_proofs WHERE digest=?').get(this.hash(`session:${token}`));
    if(record&&(!proof||proof.verified_at+600000<=this.now())){
      if(typeof currentPassword!=='string'||currentPassword.length>128||!await this.passwordMatches(currentPassword,record))throw new AuthError(403,'authPasswordReauth');
    }
    const salt=randomBytes(16).toString('hex'),digest=(await derivePassword(password,salt,64)).toString('hex');
    this.requireVerified(token);
    // Recheck after asynchronous work so concurrent password changes cannot bypass reauthentication.
    const latest=this.db.prepare('SELECT digest FROM account_passwords WHERE user_id=?').get(user.id);
    if(latest?.digest!==record?.digest)throw new AuthError(409,'authPasswordReauth');
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('INSERT INTO account_passwords(user_id,salt,digest) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET salt=excluded.salt,digest=excluded.digest').run(user.id,salt,digest);
      this.db.prepare('DELETE FROM sessions WHERE user_id=? AND digest!=?').run(user.id,this.hash(`session:${token}`));this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');throw error;}
    return {ok:true};
  }
  adminStats(token){
    if(!this.requireVerified(token).admin)throw new AuthError(403,'authAdminDenied');
    return this.db.prepare('SELECT count(*) AS accounts,count(verified_at) AS verified FROM users').get();
  }
  logout(token){if(typeof token==='string')this.db.prepare('DELETE FROM sessions WHERE digest=?').run(this.hash(`session:${token}`));}
  close(){this.db.close();}
}

import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AuthError} from './accounts.mjs';
import {Listings} from './listings.mjs';
import {Messaging} from './messaging.mjs';

async function jsonBody(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new AuthError(415,'authInvalid');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>8192)throw new AuthError(413,'authInvalid');chunks.push(chunk);}
  try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data || typeof data!=='object' || Array.isArray(data))throw Error();return data;}catch{throw new AuthError(400,'authInvalid');}
}
export function createApp({accounts,mailReady,root,origins=[],allowHosts=['127.0.0.1','localhost']}){
  const listings=new Listings(accounts);
  const messaging=new Messaging(accounts);
  const allowedOrigins=new Set(origins);
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    function json(status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
    try{
      const host=new URL(`http://${req.headers.host}`).hostname;
      if(!allowHosts.includes(host))return json(403,{error:'authInvalid'});
      const path=new URL(req.url,'http://localhost').pathname;
      const origin=req.headers.origin;
      if(origin && !allowedOrigins.has(origin))return json(403,{error:'authInvalid'});
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      if(req.method==='OPTIONS'){
        res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'600'});return res.end();
      }
      const token=req.headers.authorization?.replace(/^Bearer /,'');
      const ip=req.socket.remoteAddress||'unknown'; // Never trust forwarded IP headers from arbitrary clients.
      if(path.startsWith('/api/conversations')){
        if(origin==='https://zekitazegul.github.io')throw new AuthError(403,'messageAccess');
        if(path==='/api/conversations'&&req.method==='GET')return json(200,messaging.inbox(token));
        if(path==='/api/conversations'&&req.method==='POST'){accounts.requireVerified(token);return json(201,messaging.start(token,await jsonBody(req)));}
        const thread=path.match(/^\/api\/conversations\/([a-f0-9-]{36})$/);
        if(thread&&req.method==='GET'){const before=new URL(req.url,'http://localhost').searchParams.get('before');return json(200,messaging.read(token,thread[1],before===null?undefined:Number(before)));}
        const reply=path.match(/^\/api\/conversations\/([a-f0-9-]{36})\/messages$/);
        if(reply&&req.method==='POST'){accounts.requireVerified(token);return json(200,messaging.send(token,reply[1],await jsonBody(req)));}
      }
      if(path.startsWith('/api/listings')||path.startsWith('/api/my/listings')||path.startsWith('/api/admin/listings')||path.startsWith('/api/photos')){
        if(origin==='https://zekitazegul.github.io')throw new AuthError(403,'listingActionFailed');
        if(path==='/api/listings' && req.method==='GET')return json(200,listings.publicList());
        if(path==='/api/my/listings' && req.method==='GET')return json(200,listings.mine(token));
        if(path==='/api/admin/listings' && req.method==='GET')return json(200,listings.review(token));
        const edit=path.match(/^\/api\/listings\/([a-f0-9-]{36})\/edit$/);
        const sold=path.match(/^\/api\/listings\/([a-f0-9-]{36})\/sold$/);
        if(sold&&req.method==='POST')return json(200,listings.sold(token,sold[1]));
        const relist=path.match(/^\/api\/listings\/([a-f0-9-]{36})\/relist$/);
        if(relist&&req.method==='POST')return json(200,listings.relist(token,relist[1]));
        if((path==='/api/listings'||edit) && req.method==='POST'){
          accounts.requireVerified(token);
          const type=req.headers['content-type']||'';
          if(!type.startsWith('multipart/form-data;'))throw new AuthError(415,'listingInvalid');
          let size=0;const chunks=[];
          for await(const chunk of req){size+=chunk.length;if(size>13*1024*1024)throw new AuthError(413,'listingPhotoError');chunks.push(chunk);}
          let form;try{form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':type}}).formData();}catch{throw new AuthError(400,'listingInvalid');}
          return json(edit?200:201,await listings.create(token,form,edit?.[1]));
        }
        const approve=path.match(/^\/api\/admin\/listings\/([a-f0-9-]{36})\/approve$/);
        if(approve && req.method==='POST')return json(200,listings.approve(token,approve[1]));
        const remove=path.match(/^\/api\/listings\/([a-f0-9-]{36})\/remove$/);
        if(remove && req.method==='POST')return json(200,listings.remove(token,remove[1]));
        const photo=path.match(/^\/api\/photos\/([a-f0-9-]{36})$/);
        if(photo && req.method==='GET'){const data=listings.photo(photo[1],token);res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':data.length});return res.end(Buffer.from(data));}
      }
      if(path==='/health' && req.method==='GET')return json(200,{ok:true});
      if(path==='/api/status' && req.method==='GET')return json(200,{ready:mailReady});
      if(path==='/api/session' && req.method==='GET')return json(200,{user:accounts.requireVerified(token)});
      if(path==='/api/password-login'&&req.method==='POST'){
        const body=await jsonBody(req);return json(200,await accounts.signInPassword(body.email,body.password,ip,body.rememberUntil));
      }
      if(path==='/api/password'&&req.method==='POST'){
        accounts.requireVerified(token);const body=await jsonBody(req);return json(200,await accounts.setPassword(token,body.password,body.currentPassword));
      }
      if(path==='/api/admin/stats' && req.method==='GET')return json(200,accounts.adminStats(token));
      if(path==='/api/send-code' && req.method==='POST'){
        if(!mailReady)throw new AuthError(503,'authUnavailable');
        const body=await jsonBody(req);await accounts.sendCode(body.email,ip,body.locale);return json(200,{ok:true});
      }
      if(path==='/api/verify-code' && req.method==='POST'){
        if(!mailReady)throw new AuthError(503,'authUnavailable');
        const body=await jsonBody(req);return json(200,accounts.verifyCode(body.email,body.code,ip,body.rememberUntil));
      }
      if(path==='/api/logout' && req.method==='POST'){await jsonBody(req);accounts.logout(token);return json(200,{ok:true});}
      if(path==='/src/auth-config.js' && req.method==='GET'){
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});return res.end(`export const authConfig=${JSON.stringify({url:mailReady?'/api':''})};`);
      }
      if(req.method!=='GET')return json(405,{error:'authInvalid'});
      if(path!=='/' && !/^\/src\/[a-z0-9-]+\.(js|css)$/.test(path))return json(404,{error:'not_found'});
      const file=resolve(root,path==='/'?'index.html':path.slice(1));
      const data=await readFile(file);
      res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(data);
    }catch(error){if(error instanceof AuthError && error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));json(error instanceof AuthError?error.status:500,{error:error instanceof AuthError?error.message:'authUnavailable'});}
  });
  server.requestTimeout=60000;server.headersTimeout=10000;
  return server;
}

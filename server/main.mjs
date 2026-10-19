import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {Accounts} from './accounts.mjs';
import {createApp} from './http.mjs';
import {createMailer} from './mail.mjs';

const root=resolve(import.meta.dirname,'..');
const configFile=process.env.SERVER_CONFIG_PATH||resolve(root,'.server-config.json');
const config=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8').replace(/^\uFEFF/,'')):{};
const port=Number(config.port||4180);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local server port');
const data=resolve(root,'.server-data');mkdirSync(data,{recursive:true,mode:0o700});
const keyFile=resolve(data,'server.key');
if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
const mail=createMailer(config);
const accounts=new Accounts({filename:resolve(data,'accounts.sqlite'),secret:readFileSync(keyFile,'utf8').trim(),adminEmail:config.adminEmail||'owner@example.test',sendMail:mail.send});
const origins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`,...(config.allowedOrigins||[])];
const app=createApp({accounts,mailReady:mail.ready,root,origins,allowHosts:['localhost','127.0.0.1',...(config.allowedHosts||[])]});
app.listen(port,process.env.BIND_HOST||'127.0.0.1',()=>console.log(`Home server: http://127.0.0.1:${port} | Email signup: ${mail.ready?'configured':'not configured'}`));
function shutdown(){app.close(()=>{accounts.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);

import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,copyFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'.server-data');
await access(resolve(source,'accounts.sqlite'));
const target=resolve(root,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(target,{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(source,'accounts.sqlite'),{readOnly:true});
try{await backup(db,resolve(target,'accounts.sqlite'));await copyFile(resolve(source,'server.key'),resolve(target,'server.key'));}
finally{db.close();}
try{await copyFile(process.env.SERVER_CONFIG_PATH||resolve(root,'.server-config.json'),resolve(target,'server-config.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(JSON.stringify({directory:target}));

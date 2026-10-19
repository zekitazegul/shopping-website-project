import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
try{
  const directory=resolve(process.argv[2]||'');
  const db=new DatabaseSync(resolve(directory,'accounts.sqlite'),{readOnly:true});
  try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error();db.prepare('SELECT count(*) FROM users').get();}
  finally{db.close();}
  if(!/^[a-f0-9]{64}$/.test(readFileSync(resolve(directory,'server.key'),'utf8').trim()))throw Error();
  console.log('Backup verified: SQLite integrity, account schema and private server key.');
}catch{console.error('Backup verification failed. No private contents were printed.');process.exitCode=1;}

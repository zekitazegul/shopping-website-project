import {mkdir, copyFile, cp, writeFile} from 'node:fs/promises';
import {validAuthConfig} from '../src/auth.js';
await mkdir('dist', {recursive:true});
await copyFile('index.html', 'dist/index.html');
await cp('src', 'dist/src', {recursive:true});
const url=process.env.SUPABASE_URL || '';
const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY || '';
if(url || publishableKey){
  if(!validAuthConfig({url,publishableKey}))throw new Error('Use a Supabase HTTPS project URL and public sb_publishable_ key. Never use a service-role key.');
  await writeFile('dist/src/auth-config.js',`export const authConfig = ${JSON.stringify({url,publishableKey})};\n`);
}

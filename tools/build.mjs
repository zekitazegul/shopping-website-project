import {mkdir, copyFile, cp, writeFile} from 'node:fs/promises';
import {validAuthConfig} from '../src/auth.js';
await mkdir('dist', {recursive:true});
await copyFile('index.html', 'dist/index.html');
await cp('src', 'dist/src', {recursive:true});
const url=process.env.HOME_AUTH_API_URL || '';
if(url){
  if(!validAuthConfig({url}) || url==='/api')throw new Error('The static GitHub site requires a public HTTPS home-server URL ending in /api.');
  await writeFile('dist/src/auth-config.js',`export const authConfig = ${JSON.stringify({url})};\n`);
}

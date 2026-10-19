import {writeFileSync} from 'node:fs';
import {normalizeEmail} from './accounts.mjs';
try{
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>16384)throw Error();}
  const config=JSON.parse(input.replace(/^\uFEFF/,''));
  normalizeEmail(config.adminEmail);
  if(config.smtpUser)normalizeEmail(config.smtpUser);
  if(config.mailFrom)normalizeEmail(config.mailFrom);
  if(config.port!==4180)throw Error();
  writeFileSync(process.env.SERVER_CONFIG_PATH||'/app/private/server-config.json',JSON.stringify(config),{mode:0o600});
  console.log('Private server configuration applied. Restart the service.');
}catch{console.error('Configuration could not be applied. No settings were printed.');process.exitCode=1;}

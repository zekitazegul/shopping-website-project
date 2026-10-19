import nodemailer from 'nodemailer';
import {authMessages} from '../src/auth-languages.js';
const expiry={tr:'Kod 10 dakika geçerlidir.',en:'This code expires in 10 minutes.',nl:'Deze code is 10 minuten geldig.',de:'Dieser Code ist 10 Minuten gültig.',fr:'Ce code expire dans 10 minutes.',it:'Il codice scade tra 10 minuti.',es:'Este código caduca en 10 minutos.',pl:'Kod jest ważny przez 10 minut.',pt:'Este código expira dentro de 10 minutos.'};
export function createMailer(config){
  const ready=!!(config.smtpHost && config.smtpUser && config.smtpPassword && config.mailFrom);
  if(!ready)return {ready:false,send:async()=>{throw Error('SMTP is not configured');}};
  const port=Number(config.smtpPort||465);
  if(![465,587].includes(port))throw Error('SMTP requires TLS on port 465 or 587');
  const transport=nodemailer.createTransport({host:config.smtpHost,port,secure:port===465,requireTLS:true,auth:{user:config.smtpUser,pass:config.smtpPassword},tls:{minVersion:'TLSv1.2'},connectionTimeout:15000,socketTimeout:20000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  return {ready:true,send:async({email,code,locale})=>{
    const language=Object.hasOwn(authMessages,locale)?locale:'en',t=authMessages[language];
    const result=await transport.sendMail({from:config.mailFrom,to:email,subject:t.authTitle,text:`${t.authCode}: ${code}\n\n${expiry[language]}`});
    if(!result.accepted?.length)throw Error('Email not accepted');
  }};
}

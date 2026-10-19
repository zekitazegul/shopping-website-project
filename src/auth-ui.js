import {createAuth} from './auth.js';
import {authConfig} from './auth-config.js';

export function setupAuth(t) {
  const auth=createAuth(authConfig);
  const $=id=>document.getElementById(id);
  let user=null, email='', codeSent=false, busy=false, message='', adminIntent=false, stats=null;
  let revision=0;
  let retryUntil=0;
  function render() {
    $('account-button').textContent=t(user?'authAccount':'authSignIn');
    $('account-button').dataset.signedIn=String(!!user);
    $('account-button').setAttribute('aria-label',user?`${t('authAccount')}: ${user.email}`:t('authSignIn'));
    $('session-banner').hidden=!user;
    $('session-email').textContent=user?.email || '';
    $('session-admin-badge').hidden=!user?.admin;
    $('session-admin-link').hidden=!user?.admin;
    $('auth-heading').textContent=t(adminIntent?'authAdminTitle':'authTitle');
    $('auth-email-form').hidden=!!user || !auth.configured || codeSent;
    $('auth-code-form').hidden=!!user || !auth.configured || !codeSent;
    $('auth-session').hidden=!user;
    $('auth-user-email').textContent=user?.email || '';
    $('auth-admin-panel').hidden=!user?.admin || !stats;
    $('auth-total').textContent=String(stats?.accounts ?? '');
    $('auth-verified').textContent=String(stats?.verified ?? '');
    const remaining=Math.max(0,Math.ceil((retryUntil-Date.now())/1000));
    $('auth-status').textContent=remaining && !busy?t('authRetryAfter').replace('{seconds}',String(remaining)):t(!auth.configured?'authUnavailable':busy?'authBusy':message)||'';
    for(const button of $('auth-dialog').querySelectorAll('form button'))button.disabled=busy || (remaining>0 && button.type==='submit');
  }
  async function perform(work) {
    if(busy)return;revision++;busy=true;message='';render();
    try{await work();}catch(error){if(error.message==='authRateLimit')retryUntil=Date.now()+(error.retryAfter||60)*1000;if(['authInvalid','authNetwork','authUnavailable'].includes(error.message)){user=null;stats=null;}message=['authUnavailable','authInvalid','authNetwork','authRateLimit','authAdminDenied'].includes(error.message)?error.message:'authInvalid';}
    finally{busy=false;render();}
  }
  async function open(admin=false) {
    adminIntent=admin;message='';stats=null;
    if(!$('auth-dialog').open)$('auth-dialog').showModal();
    render();
    if(auth.configured)await perform(async()=>{
      user=await auth.access();
      if(adminIntent && user){if(!user.admin)throw new Error('authAdminDenied');stats=await auth.adminStats();}
    });
  }
  $('account-button').onclick=()=>open();
  $('admin-login').onclick=()=>open(true);
  $('session-admin-link').onclick=()=>open(true);
  $('auth-close').onclick=()=>$('auth-dialog').close();
  $('auth-email-form').onsubmit=event=>{event.preventDefault();perform(async()=>{
    email=$('auth-email').value.trim();await auth.sendCode(email,document.documentElement.lang);codeSent=true;message='authSent';$('auth-code').value='';
  });};
  $('auth-code-form').onsubmit=event=>{event.preventDefault();perform(async()=>{
    user=await auth.verifyCode(email,$('auth-code').value.trim());
    if(!user)throw new Error('authInvalid');
    codeSent=false;$('auth-code').value='';
    if(adminIntent){if(!user.admin)throw new Error('authAdminDenied');stats=await auth.adminStats();}
  });};
  $('auth-change-email').onclick=()=>{if(busy)return;codeSent=false;message='';$('auth-code').value='';render();};
  $('auth-logout').onclick=()=>perform(async()=>{await auth.signOut();user=null;stats=null;});
  $('session-logout').onclick=$('auth-logout').onclick;
  async function refreshSession(){
    if(!auth.configured || busy || document.hidden)return;
    const current=++revision;let refreshed=null;
    try{refreshed=await auth.access();}catch{}
    if(current!==revision || busy)return;
    user=refreshed;
    if(!user)stats=null;
    render();
  }
  window.addEventListener('focus',refreshSession);
  document.addEventListener('visibilitychange',refreshSession);
  setInterval(()=>{if(user)refreshSession();},60000);
  setInterval(()=>{if(retryUntil){if(Date.now()>=retryUntil){retryUntil=0;if(message==='authRateLimit')message='';}render();}},1000);
  render();
  if(auth.configured)perform(async()=>{user=await auth.access();});
  return {translate:render};
}

import {createAuth} from './auth.js';
import {authConfig} from './auth-config.js';

export function setupAuth(t) {
  const auth=createAuth(authConfig);
  const $=id=>document.getElementById(id);
  const passwordToggles=['auth-login-password','auth-current-password','auth-new-password','auth-confirm-password'].map(id=>{
    const input=$(id),wrapper=document.createElement('div'),button=document.createElement('button');
    wrapper.className='password-field';input.before(wrapper);wrapper.append(input,button);
    button.type='button';button.className='password-toggle';button.setAttribute('aria-controls',id);
    button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="eye-slash" d="m3 3 18 18" hidden/></svg>';
    function update(){const visible=input.type==='text';button.setAttribute('aria-pressed',String(visible));const label=t(visible?'authHidePassword':'authShowPassword')+': '+document.querySelector(`label[for="${id}"]`).textContent;button.setAttribute('aria-label',label);button.title=label;button.querySelector('.eye-slash').toggleAttribute('hidden',!visible);}
    button.onclick=()=>{input.type=input.type==='password'?'text':'password';update();};
    input.form.addEventListener('reset',()=>{input.type='password';update();});
    return {input,update};
  });
  let user=null, email='', codeSent=false, busy=false, message='', adminIntent=false, stats=null;
  let revision=0;
  let retryUntil=0;
  let notificationTimer;
  function finishLogin(){
    $('auth-dialog').close();
    if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
    $('account-button').focus({preventScroll:true});window.scrollTo(0,0);
    clearTimeout(notificationTimer);$('login-notification-text').textContent=t('authLoginSuccess');$('login-notification').hidden=false;
    notificationTimer=setTimeout(()=>{$('login-notification').hidden=true;},8000);
  }
  $('login-notification-close').onclick=()=>{clearTimeout(notificationTimer);$('login-notification').hidden=true;};
  function render() {
    $('login-notification-close').setAttribute('aria-label',t('authClose'));
    if(!user)$('login-notification').hidden=true;
    if(!$('login-notification').hidden)$('login-notification-text').textContent=t('authLoginSuccess');
    passwordToggles.forEach(toggle=>toggle.update());
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
    $('auth-remember-option').hidden=!!user || !auth.configured;
    $('auth-remember').disabled=busy;
    $('auth-session').hidden=!user;
    $('auth-password-form').hidden=!user;
    $('auth-password-title').textContent=t(user?.hasPassword?'authPasswordChange':'authPasswordCreate');
    $('auth-user-email').textContent=user?.email || '';
    $('auth-admin-panel').hidden=!user?.admin || !stats;
    $('auth-total').textContent=String(stats?.accounts ?? '');
    $('auth-verified').textContent=String(stats?.verified ?? '');
    const remaining=Math.max(0,Math.ceil((retryUntil-Date.now())/1000));
    $('auth-status').textContent=remaining && !busy?t('authRetryAfter').replace('{seconds}',String(remaining)):t(!auth.configured?'authUnavailable':busy?'authBusy':message)||'';
    for(const button of $('auth-dialog').querySelectorAll('form button'))button.disabled=busy || (remaining>0 && button.type==='submit');
    document.dispatchEvent(new CustomEvent('accountchange',{detail:{user}}));
  }
  async function perform(work,{login=false}={}) {
    if(busy)return;revision++;busy=true;message='';render();
    let completed=false;
    try{await work();completed=true;}catch(error){if(error.message==='authRateLimit')retryUntil=Date.now()+(error.retryAfter||60)*1000;if(['authInvalid','authNetwork','authUnavailable'].includes(error.message)){user=null;stats=null;}message=['authUnavailable','authInvalid','authNetwork','authRateLimit','authAdminDenied','authPasswordInvalid','authPasswordLength','authPasswordReauth','authPasswordMismatch'].includes(error.message)?error.message:'authInvalid';}
    finally{busy=false;render();if(completed&&login&&user)finishLogin();}
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
  $('auth-dialog').addEventListener('close',()=>{$('auth-password-form').reset();$('auth-login-password').value='';passwordToggles.forEach(toggle=>{toggle.input.type='password';toggle.update();});});
  $('auth-login-password').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('auth-password-login').click();}});
  $('auth-email-form').onsubmit=event=>{event.preventDefault();perform(async()=>{
    email=$('auth-email').value.trim();await auth.sendCode(email,document.documentElement.lang);codeSent=true;message='authSent';$('auth-code').value='';
  });};
  $('auth-code-form').onsubmit=event=>{event.preventDefault();perform(async()=>{
    user=await auth.verifyCode(email,$('auth-code').value.trim(),$('auth-remember').checked);
    if(!user)throw new Error('authInvalid');
    codeSent=false;$('auth-code').value='';
    if(adminIntent){if(!user.admin)throw new Error('authAdminDenied');stats=await auth.adminStats();}
  },{login:true});};
  $('auth-password-login').onclick=()=>{
    if(!$('auth-email').reportValidity())return;
    if(!$('auth-login-password').value){$('auth-login-password').focus();return;}
    perform(async()=>{
      user=await auth.signInPassword($('auth-email').value.trim(),$('auth-login-password').value,$('auth-remember').checked);
      $('auth-login-password').value='';codeSent=false;
      if(adminIntent){if(!user.admin)throw Error('authAdminDenied');stats=await auth.adminStats();}
    },{login:true});
  };
  $('auth-password-form').onsubmit=event=>{event.preventDefault();perform(async()=>{
    if($('auth-new-password').value!==$('auth-confirm-password').value)throw Error('authPasswordMismatch');
    await auth.setPassword($('auth-new-password').value,$('auth-current-password').value);
    $('auth-password-form').reset();user=await auth.access();message='authPasswordSaved';
  });};
  $('auth-change-email').onclick=()=>{if(busy)return;codeSent=false;message='';$('auth-code').value='';render();};
  $('auth-logout').onclick=()=>perform(async()=>{await auth.signOut();user=null;stats=null;$('auth-password-form').reset();$('auth-login-password').value='';});
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
  window.addEventListener('storage',event=>{if(event.key==='shopping.home.auth.remembered'||event.key===null)refreshSession();});
  document.addEventListener('visibilitychange',refreshSession);
  setInterval(()=>{if(user)refreshSession();},60000);
  setInterval(()=>{if(retryUntil){if(Date.now()>=retryUntil){retryUntil=0;if(message==='authRateLimit')message='';}render();}},1000);
  render();
  if(auth.configured)perform(async()=>{user=await auth.access();});
  return {translate:render,auth,open,getUser:()=>user};
}

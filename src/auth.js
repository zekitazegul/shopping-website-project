export function validAuthConfig(config) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url || '') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey || '');
}

export function createAuth(config, {fetcher=globalThis.fetch, storage=globalThis.sessionStorage, now=Date.now}={}) {
  const configured=validAuthConfig(config);
  let session=null;
  try { session=JSON.parse(storage?.getItem('shopping.auth') || 'null'); } catch {}
  function clear() {session=null;try{storage?.removeItem('shopping.auth');}catch{}}
  function remember(value) {session=value;try{storage?.setItem('shopping.auth',JSON.stringify(value));}catch{}}
  async function request(path,{body,token}={}) {
    if(!configured)throw new Error('authUnavailable');
    let response;
    try {response=await fetcher(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});}
    catch {throw new Error('authNetwork');}
    if(!response.ok){if(response.status===401)clear();throw new Error(response.status===429?'authRateLimit':'authInvalid');}
    return response.status===204?null:response.json();
  }
  async function access() {
    if(!session?.access_token || session.expires_at*1000<=now()){clear();return null;}
    const token=session.access_token;
    try {
      const user=await request('/auth/v1/user',{token});
      const rights=await request('/rest/v1/rpc/account_access',{body:{},token});
      if(!user.email_confirmed_at || rights?.verified!==true){clear();return null;}
      return {email:user.email,id:user.id,admin:rights.admin===true};
    }catch(error){clear();throw error;}
  }
  return {
    configured,
    async sendCode(email) {await request('/auth/v1/otp',{body:{email,create_user:true}});},
    async verifyCode(email,code) {
      if(!/^\d{6,8}$/.test(code))throw new Error('authInvalid');
      const data=await request('/auth/v1/verify',{body:{email,token:code,type:'email'}});
      if(!data.access_token || !data.expires_in)throw new Error('authInvalid');
      remember({access_token:data.access_token,expires_at:Math.floor(now()/1000)+data.expires_in});
      return access();
    },
    access,
    async adminStats() {
      const user=await access();if(!user?.admin)throw new Error('authAdminDenied');
      return request('/rest/v1/rpc/admin_account_stats',{body:{},token:session.access_token});
    },
    async signOut() {
      const token=session?.access_token;clear();
      if(token)try{await request('/auth/v1/logout',{body:{},token});}catch{}
    }
  };
}

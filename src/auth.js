export function validAuthConfig(config){
  if(config?.url==='/api')return true;
  try{const url=new URL(config?.url);return url.protocol==='https:' && url.pathname==='/api' && !url.username && !url.password && !url.search && !url.hash;}catch{return false;}
}
export function createAuth(config,{fetcher=globalThis.fetch,storage=globalThis.sessionStorage,persistentStorage=globalThis.localStorage,now=Date.now}={}){
  const configured=validAuthConfig(config);let session=null;
  const rememberedKey='shopping.home.auth.remembered';
  function storedRemembered(){try{return JSON.parse(persistentStorage?.getItem(rememberedKey)||'null');}catch{return null;}}
  try{session=storedRemembered()||JSON.parse(storage?.getItem('shopping.home.auth')||'null');}catch{}
  function clear(){session=null;try{storage?.removeItem('shopping.home.auth');}catch{}try{persistentStorage?.removeItem(rememberedKey);}catch{}}
  function remember(value,persist){clear();session={...value,remembered:false};if(persist&&persistentStorage)try{session.remembered=true;persistentStorage.setItem(rememberedKey,JSON.stringify(session));return;}catch{session.remembered=false;}try{storage?.setItem('shopping.home.auth',JSON.stringify(session));}catch{}}
  async function request(path,{body,token,raw=false}={}){
    if(!configured)throw new Error('authUnavailable');
    let response;
    const multipart=typeof FormData!=='undefined' && body instanceof FormData;
    try{response=await fetcher(config.url+path,{method:body?'POST':'GET',headers:{...(!multipart?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:multipart?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});}
    catch{throw new Error('authNetwork');}
    if(!response.ok){
      if(response.status===401)clear();
      const error=new Error(response.status===429?'authRateLimit':response.status===403?'authAdminDenied':response.status===503?'authUnavailable':'authInvalid');
      try{const payload=await response.json();if(['listingInvalid','listingPhotoError','listingActionFailed','messageAccess','messageInvalid','messageClosed','messageOwnListing','authPasswordInvalid','authPasswordLength','authPasswordReauth'].includes(payload.error))error.message=payload.error;}catch{}
      if(response.status===429)error.retryAfter=Math.max(1,Number(response.headers?.get('Retry-After'))||60);
      throw error;
    }
    return raw?response.blob():response.json();
  }
  function token(){if(session?.remembered)session=storedRemembered();else session=storedRemembered()||session;if(!session?.token || !Number.isFinite(session.expiresAt) || session.expiresAt<=now()){clear();return null;}return session.token;}
  async function access(){
    const value=token();if(!value)return null;
    try{const data=await request('/session',{token:value});return data.user;}
    catch(error){if(error.message!=='authNetwork')clear();throw error;}
  }
  return {
    configured,
    async sendCode(email,locale='en'){await request('/send-code',{body:{email,locale}});},
    async verifyCode(email,code,rememberToday=false){
      if(!/^\d{6}$/.test(code))throw new Error('authInvalid');
      const midnight=new Date(now());midnight.setHours(24,0,0,0);
      const rememberUntil=Math.min(midnight.getTime(),now()+86400000);
      const data=await request('/verify-code',{body:{email,code,...(rememberToday?{rememberUntil}:{})}});
      if(!data.token || !data.expiresAt)throw new Error('authInvalid');
      remember({token:data.token,expiresAt:data.expiresAt},rememberToday);return access();
    },
    async signInPassword(email,password,rememberToday=false){
      const midnight=new Date(now());midnight.setHours(24,0,0,0);
      const data=await request('/password-login',{body:{email,password,...(rememberToday?{rememberUntil:Math.min(midnight.getTime(),now()+86400000)}:{})}});
      if(!data.token||!Number.isFinite(data.expiresAt))throw Error('authInvalid');
      remember({token:data.token,expiresAt:data.expiresAt},rememberToday);return access();
    },
    async setPassword(password,currentPassword){return request('/password',{token:token(),body:{password,currentPassword}});},
    access,
    async api(path,body){return request(path,{body,token:token()});},
    async photo(id){return request('/photos/'+id,{token:token(),raw:true});},
    async adminStats(){const user=await access();if(!user?.admin)throw new Error('authAdminDenied');return request('/admin/stats',{token:token()});},
    async signOut(){const value=token();clear();if(value)try{await request('/logout',{body:{},token:value});}catch{}}
  };
}

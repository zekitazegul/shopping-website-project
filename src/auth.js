export function validAuthConfig(config){
  if(config?.url==='/api')return true;
  try{const url=new URL(config?.url);return url.protocol==='https:' && url.pathname==='/api' && !url.username && !url.password && !url.search && !url.hash;}catch{return false;}
}
export function createAuth(config,{fetcher=globalThis.fetch,storage=globalThis.sessionStorage,now=Date.now}={}){
  const configured=validAuthConfig(config);let session=null;
  try{session=JSON.parse(storage?.getItem('shopping.home.auth')||'null');}catch{}
  function clear(){session=null;try{storage?.removeItem('shopping.home.auth');}catch{}}
  function remember(value){session=value;try{storage?.setItem('shopping.home.auth',JSON.stringify(value));}catch{}}
  async function request(path,{body,token}={}){
    if(!configured)throw new Error('authUnavailable');
    let response;
    try{response=await fetcher(config.url+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});}
    catch{throw new Error('authNetwork');}
    if(!response.ok){
      if(response.status===401)clear();
      throw new Error(response.status===429?'authRateLimit':response.status===403?'authAdminDenied':response.status===503?'authUnavailable':'authInvalid');
    }
    return response.json();
  }
  function token(){if(!session?.token || !Number.isFinite(session.expiresAt) || session.expiresAt<=now()){clear();return null;}return session.token;}
  async function access(){
    const value=token();if(!value)return null;
    try{const data=await request('/session',{token:value});return data.user;}
    catch(error){clear();throw error;}
  }
  return {
    configured,
    async sendCode(email,locale='en'){await request('/send-code',{body:{email,locale}});},
    async verifyCode(email,code){
      if(!/^\d{6}$/.test(code))throw new Error('authInvalid');
      const data=await request('/verify-code',{body:{email,code}});
      if(!data.token || !data.expiresAt)throw new Error('authInvalid');
      remember({token:data.token,expiresAt:data.expiresAt});return access();
    },
    access,
    async adminStats(){const user=await access();if(!user?.admin)throw new Error('authAdminDenied');return request('/admin/stats',{token:token()});},
    async signOut(){const value=token();clear();if(value)try{await request('/logout',{body:{},token:value});}catch{}}
  };
}

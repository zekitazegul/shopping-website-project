import {authConfig} from './auth-config.js';

const languages=['tr','en','nl','de','fr','it','es','pl','pt'];
export function setupListingUI(t,account,onCatalog){
  const $=id=>document.getElementById(id),api=account.auth;
  const live=authConfig.url==='/api';
  const marketUrl=authConfig.url.startsWith('https:')?authConfig.url.slice(0,-4)+'/':'';
  let busy=false,message='',mode='mine',managerRows=[],objectUrls=[],version=0,catalogRevision=0;
  const make=(tag,value,css)=>{const el=document.createElement(tag);if(value)el.textContent=value;if(css)el.className=css;return el;};
  function options(id,values){const selected=$(id).value;$(id).replaceChildren(...values.map(([value,key])=>{const option=make('option',t(key));option.value=value;return option;}));if(values.some(([value])=>value===selected))$(id).value=selected;}
  function translate(){
    $('listing-toolbar').hidden=!live&&!marketUrl;
    $('listing-create').hidden=!live;$('listing-mine').hidden=!live;
    $('listing-moderate').hidden=!live||!account.getUser()?.admin;
    $('listing-market-link').hidden=live||!marketUrl;
    if(marketUrl)$('listing-market-link').href=marketUrl;
    options('listing-kind',[['home','home'],['fashion','fashion'],['electronics','electronics'],['bikes','bikes'],['leisure','leisure']]);
    options('listing-country',[['NL','NL'],['BE','BE'],['DE','DE']]);
    options('listing-condition',[['good','good'],['likeNew','likeNew'],['new','new']]);
    $('listing-message').textContent=message?t(message):'';
    $('listing-manager-title').textContent=t(mode==='admin'?'listingReviewTitle':'listingMine');
    if($('listing-manager').open)drawManager();
  }
  async function refresh(){
    if(!live)return;
    const current=++catalogRevision;
    try{const rows=await api.api('/listings');if(current!==catalogRevision)return;onCatalog(rows.map(row=>({...row,id:'live:'+row.id,live:true,title:Object.fromEntries(languages.map(lang=>[lang,row.title])),photoUrls:row.photos.map(id=>'/api/photos/'+id)})));$('listing-catalog-error').hidden=true;}
    catch{if(current===catalogRevision)$('listing-catalog-error').hidden=false;}
  }
  async function signedIn(){if(await api.access())return true;await account.open();return false;}
  async function openCreate(){
    if(!live || !await signedIn())return;
    message='';translate();$('listing-editor').showModal();
  }
  function revoke(){version++;objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];}
  function drawManager(){
    revoke();const current=version;
    $('listing-manager-rows').replaceChildren();
    if(!managerRows.length){$('listing-manager-rows').append(make('p',t('listingEmpty')));return;}
    for(const row of managerRows){
      const price=new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency:'EUR'}).format(row.price);
      const card=make('article',null,'managed-listing');card.append(make('h3',row.title),make('p',row.city+' · '+t(row.country)+' · '+price),make('p',row.description),make('strong',t('listing'+row.status[0].toUpperCase()+row.status.slice(1))));
      const images=make('div',null,'listing-thumbnails');
      row.photos.forEach((id,index)=>{const image=make('img');image.alt=row.title+' '+(index+1);images.append(image);api.photo(id).then(blob=>{if(current!==version)return;const url=URL.createObjectURL(blob);objectUrls.push(url);image.src=url;}).catch(()=>image.remove());});
      card.append(images);const actions=make('div',null,'listing-row-actions');
      if(mode==='admin'&&row.status==='pending'){const approve=make('button',t('listingApprove'),'primary');approve.onclick=()=>action('/admin/listings/'+row.id+'/approve');actions.append(approve);}
      if(row.status!=='removed'){const remove=make('button',t('listingRemove'),'text-button');remove.onclick=()=>{if(window.confirm(t('listingConfirmRemove')))action('/listings/'+row.id+'/remove');};actions.append(remove);}
      card.append(actions);$('listing-manager-rows').append(card);
    }
    for(const button of $('listing-manager-rows').querySelectorAll('button'))button.disabled=busy;
  }
  async function loadManager(){managerRows=await api.api(mode==='admin'?'/admin/listings':'/my/listings');drawManager();}
  async function action(path){
    if(busy)return;busy=true;drawManager();$('listing-manager-status').textContent=t('listingWorking');
    try{await api.api(path,{});await loadManager();await refresh();$('listing-manager-status').textContent='';}
    catch(error){$('listing-manager-status').textContent=t(error.message==='authAdminDenied'?'authAdminDenied':'listingActionFailed');}
    finally{busy=false;drawManager();}
  }
  async function openManager(admin=false){
    if(!live||!await signedIn())return;
    if(admin&&!account.getUser()?.admin)return;
    mode=admin?'admin':'mine';managerRows=[];translate();$('listing-manager').showModal();$('listing-manager-status').textContent=t('listingWorking');
    try{await loadManager();$('listing-manager-status').textContent='';}catch{$('listing-manager-status').textContent=t('listingLoadError');}
  }
  async function compress(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('listingPhotoError');
    let image;
    try{image=await createImageBitmap(file);const scale=Math.min(1,1600/image.width,1600/image.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('listingPhotoError')),'image/jpeg',0.85));}
    catch{throw Error('listingPhotoError');}finally{image?.close();}
  }
  $('listing-form').onsubmit=async event=>{
    event.preventDefault();if(busy)return;busy=true;message='listingWorking';translate();$('listing-submit').disabled=true;
    try{
      const form=new FormData($('listing-form'));form.delete('photos');const photos=$('listing-photos').files;
      if(photos.length<1||photos.length>4)throw Error('listingPhotoError');
      for(const [index,file] of [...photos].entries())form.append('photos',await compress(file),'photo-'+index+'.jpg');
      await api.api('/listings',form);message='listingSubmitted';$('listing-form').reset();
    }catch(error){message=['listingInvalid','listingPhotoError','listingActionFailed','authRateLimit'].includes(error.message)?error.message:'listingActionFailed';}
    finally{busy=false;$('listing-submit').disabled=false;translate();}
  };
  $('listing-create').onclick=openCreate;$('listing-mine').onclick=()=>openManager();$('listing-moderate').onclick=()=>openManager(true);
  $('listing-editor-close').onclick=()=>{if(!busy)$('listing-editor').close();};$('listing-manager-close').onclick=()=>$('listing-manager').close();
  $('listing-manager').addEventListener('close',revoke);
  let previousUser=account.getUser()?.id;
  document.addEventListener('accountchange',()=>{
    const current=account.getUser()?.id;
    if(previousUser!==current){previousUser=current;if(!current){$('listing-editor').close();$('listing-manager').close();managerRows=[];revoke();}}
    $('listing-moderate').hidden=!live||!account.getUser()?.admin;
  });
  window.addEventListener('focus',refresh);
  translate();refresh();
  return {translate,live};
}

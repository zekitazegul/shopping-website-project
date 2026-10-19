import {authConfig} from './auth-config.js';

export function setupMessageUI(t,account){
  const $=id=>document.getElementById(id),api=account.auth,live=authConfig.url==='/api';
  let inbox=[],selected=null,target=null,conversation=null,history=[],hasMore=false,allOlderLoaded=false,busy=false,loading=false,note='',own=false,version=0;
  let clientId=crypto.randomUUID(),lastUser=account.getUser()?.id;
  const make=(tag,value,css)=>{const el=document.createElement(tag);if(value)el.textContent=value;if(css)el.className=css;return el;};
  function drawHistory(older=false){
    const container=$('message-history'),oldHeight=container.scrollHeight,oldTop=container.scrollTop,atBottom=oldHeight-oldTop-container.clientHeight<70;
    container.replaceChildren(...history.map(message=>{
      const card=make('article',null,'chat-message'+(message.fromMe?' from-me':''));
      card.append(make('strong',t(message.fromMe?'messageYou':conversation.role==='buyer'?'messageSeller':'messageBuyer')),make('p',message.text),make('time',new Date(message.createdAt).toLocaleString(document.documentElement.lang)));
      return card;
    }));
    if(older)container.scrollTop=container.scrollHeight-oldHeight+oldTop;
    else if(atBottom)container.scrollTop=container.scrollHeight;
  }
  function render(){
    const signed=!!account.getUser();
    $('message-inbox').hidden=!live||!signed;
    const unread=inbox.reduce((sum,row)=>sum+row.unread,0);
    $('message-inbox').textContent=t('messageInbox')+(unread?' ('+unread+')':'');
    $('message-heading').textContent=conversation?.title||target?.title||t('messageInbox');
    $('message-list').replaceChildren(...(inbox.length?inbox.map(row=>{
      const button=make('button',row.title+' · '+t(row.role==='buyer'?'messageSeller':'messageBuyer')+(row.unread?' ('+row.unread+')':''),'conversation-link');button.type='button';button.setAttribute('aria-pressed',String(selected===row.id));button.onclick=()=>select(row.id);return button;
    }):[make('p',t('messageEmpty'))]));
    $('message-compose').hidden=!selected&&!target;
    $('message-choose').hidden=!!selected||!!target;
    $('message-status').textContent=t(busy?'messageSending':conversation?.status&&conversation.status!=='approved'?'messageClosed':note)||'';
    const disabled=busy||loading||own||!!(conversation?.status&&conversation.status!=='approved');
    $('message-text').disabled=disabled;$('message-send').disabled=disabled;
    $('message-older').hidden=!hasMore||!selected;$('message-older').disabled=busy||loading;
    $('message-refresh').disabled=loading||busy;
  }
  async function loadInbox(){
    if(!live||!account.getUser())return;
    const current=version;
    try{const rows=await api.api('/conversations');if(current!==version)return;inbox=rows;render();}
    catch(error){if(current===version){note=error.message==='messageAccess'?'messageAccess':'messageFailed';render();}}
  }
  async function loadThread(older=false){
    if(!selected||loading)return;loading=true;render();
    const current=version,id=selected;
    try{
      const suffix=older&&history.length?'?before='+history[0].id:'';
      const data=await api.api('/conversations/'+id+suffix);
      if(current!==version||id!==selected)return;
      const previous=history.map(row=>row.id).join(',');conversation=data.conversation;
      if(!history.length||older){hasMore=data.hasMore;if(!data.hasMore)allOlderLoaded=true;}
      if(allOlderLoaded)hasMore=false;
      history=[...new Map([...history,...data.messages].map(row=>[row.id,row])).values()].sort((a,b)=>a.id-b.id);
      if(previous!==history.map(row=>row.id).join(','))drawHistory(older);
      await loadInbox();
    }catch(error){if(current===version)note=['messageAccess','messageClosed'].includes(error.message)?error.message:'messageFailed';}
    finally{if(current===version){loading=false;render();}}
  }
  async function select(id){
    if(busy||loading)return;version++;selected=id;target=null;conversation=null;history=[];hasMore=false;allOlderLoaded=false;own=false;note='';clientId=crypto.randomUUID();$('message-text').value='';$('message-history').replaceChildren();render();await loadThread();
  }
  async function open(){
    if(!live)return false;
    if(!await api.access()){await account.open();return false;}
    if(!$('messages-dialog').open)$('messages-dialog').showModal();
    await loadInbox();return true;
  }
  async function contact(detail){
    if(busy)return;version++;loading=false;selected=null;target=detail;conversation=null;history=[];hasMore=false;allOlderLoaded=false;note='';own=false;clientId=crypto.randomUUID();$('message-text').value='';$('message-history').replaceChildren();render();
    if(!await open())return;
    $('message-text').focus();
  }
  $('message-compose').onsubmit=async event=>{
    event.preventDefault();if(busy||loading||own)return;
    const text=$('message-text').value.trim();if(!text||text.length>2000){note='messageInvalid';render();return;}
    busy=true;note='';render();const current=version;
    try{
      if(selected)await api.api('/conversations/'+selected+'/messages',{text,clientId});
      else{const created=await api.api('/conversations',{listingId:target.listingId,text,clientId});if(current!==version)return;selected=created.id;target=null;}
      if(current!==version)return;
      $('message-text').value='';clientId=crypto.randomUUID();note='messageSent';await loadThread();
    }catch(error){if(current===version){note=['messageAccess','messageInvalid','messageClosed','messageOwnListing','authRateLimit'].includes(error.message)?error.message:'messageFailed';own=note==='messageOwnListing';}}
    finally{if(current===version){busy=false;render();}}
  };
  $('message-text').addEventListener('input',()=>{clientId=crypto.randomUUID();});
  $('message-inbox').onclick=()=>open();
  $('messages-close').onclick=()=>$('messages-dialog').close();
  $('message-older').onclick=()=>loadThread(true);
  $('message-refresh').onclick=async()=>{if(selected)await loadThread();else await loadInbox();};
  document.addEventListener('contactseller',event=>{contact(event.detail).catch(()=>{note='messageFailed';render();});});
  document.addEventListener('accountchange',()=>{
    const current=account.getUser()?.id;
    if(current!==lastUser){lastUser=current;version++;inbox=[];selected=null;target=null;conversation=null;history=[];hasMore=false;loading=false;busy=false;note='';$('message-text').value='';$('message-history').replaceChildren();
      if(!current)$('messages-dialog').close();else loadInbox();}
    render();
  });
  setInterval(()=>{if(live&&account.getUser()&&!document.hidden&&!busy&&!loading){if($('messages-dialog').open&&selected)loadThread();else loadInbox();}},30000);
  render();if(account.getUser())loadInbox();
  return {translate(){render();if(history.length)drawHistory();}};
}

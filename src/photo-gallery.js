const keys=['photoOpen','photoPrevious','photoNext','photoCounter','photoUnavailable'];
const rows={
tr:['Fotoğrafı büyüt','Önceki fotoğraf','Sonraki fotoğraf','Fotoğraf {current} / {total}','Fotoğraf yüklenemedi. Başka bir fotoğrafı seçebilirsin.'],
en:['Enlarge photo','Previous photo','Next photo','Photo {current} of {total}','Unable to load this photo. You can select another photo.'],
nl:['Foto vergroten','Vorige foto','Volgende foto','Foto {current} van {total}','Deze foto kon niet worden geladen. Je kunt een andere foto kiezen.'],
de:['Foto vergrößern','Vorheriges Foto','Nächstes Foto','Foto {current} von {total}','Dieses Foto konnte nicht geladen werden. Wähle ein anderes Foto.'],
fr:['Agrandir la photo','Photo précédente','Photo suivante','Photo {current} sur {total}','Impossible de charger cette photo. Vous pouvez en choisir une autre.'],
it:['Ingrandisci foto','Foto precedente','Foto successiva','Foto {current} di {total}','Impossibile caricare la foto. Puoi sceglierne un’altra.'],
es:['Ampliar foto','Foto anterior','Foto siguiente','Foto {current} de {total}','No se pudo cargar esta foto. Puedes elegir otra.'],
pl:['Powiększ zdjęcie','Poprzednie zdjęcie','Następne zdjęcie','Zdjęcie {current} z {total}','Nie udało się wczytać zdjęcia. Możesz wybrać inne.'],
pt:['Ampliar fotografia','Fotografia anterior','Fotografia seguinte','Fotografia {current} de {total}','Não foi possível carregar esta fotografia. Pode escolher outra.']
};
export const photoMessages=Object.fromEntries(Object.entries(rows).map(([lang,values])=>[lang,Object.fromEntries(keys.map((key,index)=>[key,values[index]]))]));

export function setupPhotoGallery(t){
  const dialog=document.createElement('dialog');dialog.id='photo-viewer';dialog.setAttribute('aria-labelledby','photo-title');
  dialog.innerHTML='<button id="photo-close" type="button" class="text-button"></button><h2 id="photo-title"></h2><div class="photo-stage"><img id="photo-full"><p id="photo-error" role="status" hidden></p></div><div class="photo-controls"><button id="photo-previous" type="button" class="text-button"></button><p id="photo-counter" role="status" aria-live="polite" aria-atomic="true"></p><button id="photo-next" type="button" class="text-button"></button></div><div id="photo-thumbnails" class="photo-thumbnails"></div>';
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id);
  let item=null,index=0;
  const counter=(current,total)=>t('photoCounter').replace('{current}',String(current)).replace('{total}',String(total));
  function thumbnail(url,position,total,onClick){
    const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.setAttribute('aria-label',t('photoOpen')+': '+counter(position+1,total));
    image.src=url;image.alt='';image.loading='lazy';button.append(image);button.onclick=onClick;return button;
  }
  function draw(){
    if(!item)return;
    const focusedThumbnail=[...$('photo-thumbnails').children].indexOf(document.activeElement);
    const urls=item.photoUrls,title=item.title[document.documentElement.lang];
    $('photo-title').textContent=title;$('photo-full').alt=title+' · '+counter(index+1,urls.length);$('photo-full').hidden=false;$('photo-error').hidden=true;$('photo-full').src=urls[index];
    $('photo-counter').textContent=counter(index+1,urls.length);
    $('photo-thumbnails').replaceChildren(...urls.map((url,position)=>{const button=thumbnail(url,position,urls.length,()=>{index=position;draw();});button.setAttribute('aria-pressed',String(position===index));return button;}));
    if(focusedThumbnail>=0)$('photo-thumbnails').children[focusedThumbnail]?.focus({preventScroll:true});
    $('photo-previous').disabled=$('photo-next').disabled=urls.length<2;
  }
  function translate(){
    $('photo-close').textContent=t('close');$('photo-previous').textContent=t('photoPrevious');$('photo-next').textContent=t('photoNext');$('photo-error').textContent=t('photoUnavailable');
    if(dialog.open)draw();
  }
  function open(value,position){item=value;index=position;translate();draw();if(!dialog.open)dialog.showModal();}
  function move(offset){if(item){index=(index+offset+item.photoUrls.length)%item.photoUrls.length;draw();}}
  $('photo-close').onclick=()=>dialog.close();$('photo-previous').onclick=()=>move(-1);$('photo-next').onclick=()=>move(1);
  $('photo-full').onerror=()=>{$('photo-full').hidden=true;$('photo-error').hidden=false;};
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}});
  dialog.addEventListener('close',()=>{item=null;$('photo-full').removeAttribute('src');$('photo-thumbnails').replaceChildren();});
  function preview(value){
    const group=document.createElement('div');group.className='photo-preview';
    const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.className='photo-enlarge';button.setAttribute('aria-label',t('photoOpen')+': '+value.title[document.documentElement.lang]);
    image.src=value.photoUrls[0];image.alt=value.title[document.documentElement.lang];button.append(image);button.onclick=()=>open(value,0);group.append(button);
    if(value.photoUrls.length>1){const strip=document.createElement('div');strip.className='photo-thumbnails';strip.append(...value.photoUrls.map((url,position)=>thumbnail(url,position,value.photoUrls.length,()=>open(value,position))));group.append(strip);}
    return group;
  }
  translate();return {preview,translate};
}

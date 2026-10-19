export const conditions=['used','good','likeNew','openBox','brandNew'];
const rows={
tr:['Kullanılmış','İyi','Çok iyi','Yeni ama kutusu açılmış','Yeni ve kutusunda','Yeni (kutu bilgisi belirtilmemiş)'],
en:['Used','Good','Very good','New, open box','Brand new, in box','New (packaging unspecified)'],
nl:['Gebruikt','Goed','Zeer goed','Nieuw, doos geopend','Gloednieuw in doos','Nieuw (verpakking niet vermeld)'],
de:['Gebraucht','Gut','Sehr gut','Neu, Verpackung geöffnet','Fabrikneu und originalverpackt','Neu (Verpackung nicht angegeben)'],
fr:['Utilisé','Bon état','Très bon état','Neuf, boîte ouverte','Neuf dans sa boîte','Neuf (emballage non précisé)'],
it:['Usato','Buono','Ottimo','Nuovo, confezione aperta','Nuovo nella confezione','Nuovo (confezione non specificata)'],
es:['Usado','Bueno','Muy bueno','Nuevo, caja abierta','Nuevo en su caja','Nuevo (embalaje sin especificar)'],
pl:['Używany','Dobry','Bardzo dobry','Nowy, otwarte opakowanie','Fabrycznie nowy w pudełku','Nowy (opakowanie nieokreślone)'],
pt:['Usado','Bom','Muito bom','Novo, caixa aberta','Novo na caixa','Novo (embalagem não especificada)']
};
export const conditionMessages=Object.fromEntries(Object.entries(rows).map(([lang,labels])=>{
  if(labels.length!==conditions.length+1)throw Error('Missing condition translations: '+lang);
  return [lang,Object.fromEntries([...conditions,'new'].map((key,index)=>[key,labels[index]]))];
}));

import {additionalTitles} from './extra-languages.js';
export const items = [
{id:1,kind:'home',icon:'🪑',color:'#e9ddcc',price:45,country:'NL',city:'Utrecht',condition:'good',title:{nl:'Een stoel met karakter',en:'A chair with character',tr:'Karakter sahibi bir sandalye'}},
{id:2,kind:'fashion',icon:'🧥',color:'#e4e8df',price:38,country:'NL',city:'Amsterdam',condition:'likeNew',title:{nl:'Je nieuwe favoriete jas',en:'Your next favorite jacket',tr:'Yeni favori ceketin'}},
{id:3,kind:'electronics',icon:'📷',color:'#e6e3e9',price:120,country:'BE',city:'Antwerpen',condition:'good',title:{nl:'Analoge camera, tijdloze beelden',en:'Film camera, timeless memories',tr:'Analog fotoğraf makinesi'}},
{id:4,kind:'bikes',icon:'🚲',color:'#e1e9e7',price:165,country:'NL',city:'Rotterdam',condition:'good',title:{nl:'Klaar voor de stad',en:'Ready for the city',tr:'Şehir turuna hazır bisiklet'}},
{id:5,kind:'home',icon:'💡',color:'#eee5d5',price:24,country:'DE',city:'Köln',condition:'likeNew',title:{nl:'Een warm lichtpuntje',en:'A little warmth for your room',tr:'Odana sıcaklık katan lamba'}},
{id:6,kind:'fashion',icon:'👟',color:'#e5e9ee',price:55,country:'NL',city:'Den Haag',condition:'new',title:{nl:'Frisse sneakers voor elke dag',en:'Fresh sneakers for every day',tr:'Her güne uygun spor ayakkabı'}},
{id:7,kind:'leisure',icon:'🎸',color:'#eaded5',price:85,country:'NL',city:'Eindhoven',condition:'good',title:{nl:'Ruimte voor een nieuwe hobby',en:'Make room for a new hobby',tr:'Yeni bir hobiye yer aç'}},
{id:8,kind:'leisure',icon:'🎒',color:'#e1e6dc',price:32,country:'BE',city:'Gent',condition:'likeNew',title:{nl:'Voor je volgende avontuur',en:'For your next adventure',tr:'Bir sonraki maceran için'}}
];
for(const [locale,titles] of Object.entries(additionalTitles))for(const [index,item] of items.entries())item.title[locale]=titles[index];
export function selectItems(source,state,locale){
const q=state.query.trim().toLocaleLowerCase(locale);
return source.filter(i=>(!q||(i.title[locale]+' '+i.city).toLocaleLowerCase(locale).includes(q))&&(!state.category||i.kind===state.category)&&(!state.country||i.country===state.country)&&(!state.condition||i.condition===state.condition)&&(state.min===''||i.price>=Number(state.min))&&(state.max===''||i.price<=Number(state.max))&&(!state.favoritesOnly||state.favorites.includes(i.id))).sort((a,b)=>state.sort==='low'?a.price-b.price:state.sort==='high'?b.price-a.price:(b.createdAt||b.id)-(a.createdAt||a.id));
}

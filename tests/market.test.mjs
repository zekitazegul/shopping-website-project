import test from 'node:test';import assert from 'node:assert/strict';import {items,selectItems} from '../src/market.js';
import {buildFeedbackMailto} from '../src/feedback.js';
import {conditions,conditionMessages} from '../src/conditions.js';
test('email draft preserves multilingual content and prevents extra mail headers',()=>{
const url=new URL(buildFeedbackMailto('developer@example.test','Öneri & soru\r\nBcc: nobody','Mesaj? & # +\nİkinci satır'));
assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'developer@example.test');
assert.equal(url.searchParams.get('subject'),'Öneri & soru Bcc: nobody');
assert.equal(url.searchParams.get('body'),'Mesaj? & # +\nİkinci satır');assert.equal(url.searchParams.size,2);
});
const base={query:'',category:'',country:'',condition:'',min:'',max:'',sort:'recent',favoritesOnly:false,favorites:[]};
test('five condition filters stay distinct across interface languages and countries',()=>{
  const source=conditions.map((condition,index)=>({...items[0],id:index+20,condition,country:index%2?'BE':'NL'}));
  for(const locale of Object.keys(conditionMessages))for(const condition of conditions){
    const matches=selectItems(source,{...base,condition},locale);assert.equal(matches.length,1);assert.equal(matches[0].condition,condition);
    assert.ok(conditionMessages[locale][condition]);assert.equal(selectItems(source,{...base,condition,country:matches[0].country==='NL'?'BE':'NL'},locale).length,0);
  }
});
test('country selects physical location in every interface locale',()=>{for(const locale of ['tr','en','nl','de','fr','it','es','pl','pt']){const result=selectItems(items,{...base,country:'NL'},locale);assert.equal(result.length,5);assert.ok(result.every(i=>i.country==='NL'));}});
test('filters compose with price, category, condition and favorites',()=>{const result=selectItems(items,{...base,country:'NL',category:'fashion',condition:'brandNew',min:'40',max:'60',favoritesOnly:true,favorites:[6]},'en');assert.deepEqual(result.map(i=>i.id),[6]);});
test('search finds city and translated titles',()=>{assert.equal(selectItems(items,{...base,query:'utrecht'},'tr')[0].id,1);assert.equal(selectItems(items,{...base,query:'sandalye'},'tr')[0].id,1);});
test('sort, empty and favorite views',()=>{assert.equal(selectItems(items,{...base,sort:'low'},'nl')[0].price,24);assert.equal(selectItems(items,{...base,min:'1000'},'en').length,0);assert.equal(selectItems(items,{...base,favoritesOnly:true},'en').length,0);});

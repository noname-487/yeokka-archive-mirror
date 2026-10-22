import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import app,{normalizeTitle,parseSheet} from '../worker/index.js';
const config=JSON.parse(await readFile('config/sources.json'));
let total=0;
for(const [year,a] of Object.entries(config))for(const month of Object.keys(a.months)){
 const d=JSON.parse(await readFile('docs/data/'+year+'/'+month+'.json'));
 assert.equal(d.year,+year);assert.equal(d.month,+month);assert.ok(Date.parse(d.updatedAt));
 for(const e of d.events){assert.ok(e.date.startsWith(year+'-'+month.padStart(2,'0')));assert.ok(!/#\s*\d/.test(e.title));if(e.url)assert.match(e.url,/^https:\/\/www.youtube.com\/watch\?v=[\w-]{11}$/);}
 total+=d.events.length;
}
assert.ok(total>3000);
const html=await readFile('docs/index.html','utf8');
assert.ok(!html.includes('/api/month'));assert.ok(html.includes('./data/'));assert.ok(html.includes('href="./"'));
for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const originalFetch=globalThis.fetch;let calls=[];
globalThis.fetch=async url=>{calls.push(url);throw new Error('offline')};
try{const r=await app.fetch(new Request('https://test/api/month?year=2024&month=8'));assert.equal(r.status,200);const d=await r.json();assert.equal(d.stale,true);assert.ok(d.events.length);assert.ok(calls.every(x=>x.startsWith('https://noname-487.github.io/')));assert.equal((await app.fetch(new Request('https://test/api/month?year=2024&month=13'))).status,400)}finally{globalThis.fetch=originalFetch}
assert.equal(normalizeTitle('게임 #12'),'게임');assert.throws(()=>parseSheet('<table></table>',1,2024));
console.log('Cache validation passed: '+total+' records, static scripts, offline fallback, no visitor Google requests');

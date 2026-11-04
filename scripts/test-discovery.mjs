import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseMonthTabs} from './discover-months.mjs';
import app,{validateCatalog} from '../worker/index.js';
const tab=(name,gid)=>'items.push({name: '+JSON.stringify(name)+', pageUrl: "ignored", gid: "'+gid+'",initialSheet:false});';
assert.deepEqual(parseMonthTabs(tab('아카이브 안내',1)+tab('26년11월',871632542)+tab('26년 12월',123456)+tab('25년12월',999),2026),{11:871632542,12:123456});
assert.deepEqual(parseMonthTabs(tab('2026년 01월',3)+tab('2월',4),2026),{1:3,2:4});
assert.throws(()=>parseMonthTabs(tab('26년12월',1)+tab('26년12월',2),2026),/Ambiguous/);
assert.throws(()=>parseMonthTabs('<html>Access denied</html>',2026),/No month/);
assert.throws(()=>parseMonthTabs(tab('26년13월',1),2026));
const catalog={2024:[1,12],2025:[1,12],2026:[1,11,12]};assert.equal(validateCatalog(catalog)[2026].at(-1),12);
for(const bad of [[12,12],[0],[13],['12'],[]])assert.throws(()=>validateCatalog({...catalog,2026:bad}));
// Simulate a newly discovered December, then run the real static builder in isolation.
const root=await mkdtemp(join(tmpdir(),'yeokka-month-test-'));
try{
 await writeFile(join(root,'package.json'),'{"type":"module"}');
 for(const dir of ['worker','config','scripts','docs/data']){await mkdir(join(root,dir),{recursive:true});await cp(new URL('../'+dir+'/',import.meta.url),join(root,dir),{recursive:true})}
 const config=JSON.parse(await readFile(join(root,'config/sources.json'))),year=Math.max(...Object.keys(config).map(Number));
 config[year].months[12]=123456;await writeFile(join(root,'config/sources.json'),JSON.stringify(config));
 const previous=JSON.parse(await readFile(join(root,'docs/data/'+year+'/11.json')));
 const december={...previous,month:12,source:config[year].url+'#gid=123456',events:previous.events.map(e=>({...e,date:e.date.replace('-11-','-12-')}))};
 await writeFile(join(root,'docs/data/'+year+'/12.json'),JSON.stringify(december));
 execFileSync(process.execPath,['scripts/build-pages.mjs'],{cwd:root,stdio:'pipe'});
 const built=JSON.parse(await readFile(join(root,'docs/data/catalog.json')));assert.equal(built[year].at(-1),12);
 const html=await readFile(join(root,'docs/index.html'),'utf8');assert(html.includes('const archiveMonths={'));assert(!html.includes('/* ARCHIVE_MONTHS */null'));assert(!html.includes('/api/catalog'));assert(html.includes('./data/catalog.json'));
 const originalFetch=globalThis.fetch;const requests=[];globalThis.fetch=async url=>{requests.push(url);return Response.json(url.endsWith('catalog.json')?catalog:december)};try{const discovered=await app.fetch(new Request('https://test/api/catalog'));assert.equal((await discovered.json())[2026].at(-1),12);const response=await app.fetch(new Request('https://test/api/month?year=2026&month=12'));assert.equal(response.status,200);assert.equal((await response.json()).month,12);assert(requests.every(url=>url.startsWith('https://raw.githubusercontent.com/')))}finally{globalThis.fetch=originalFetch}
 const seed=await readFile(join(root,'worker/cache-seed.js'),'utf8');assert(seed.includes('"'+year+'-12"'));
 const workflow=await readFile('.github/workflows/pages.yml','utf8');assert(workflow.indexOf('Discover new month tabs')<workflow.indexOf('Decide cache refresh scope'));assert(workflow.includes('git add config/sources.json'));
}finally{await rm(root,{recursive:true,force:true})}
console.log('Month discovery passed: November/December tab detection, bad/duplicate tab retention, catalog validation, December static build and fallback bundle.');

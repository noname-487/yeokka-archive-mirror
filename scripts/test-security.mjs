import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import vm from 'node:vm';
import app,{validateMonth,readMonthResponse} from '../worker/index.js';
const source=await readFile('worker/index.js','utf8'),html=await readFile('docs/index.html','utf8');
const good=JSON.parse(await readFile('docs/data/2026/10.json','utf8')),canonical=good.source.split('#')[0],clone=()=>structuredClone(good);
for(const patch of [{videoId:'ciZv94CNcoI" onerror="alert(1)'},{date:'2026-10-99'},{date:'2025-10-01'},{title:'x'.repeat(301)},{part:'1부" onclick="alert(1)'},{category:'<img src=x onerror=alert(1)>'}]){const d=clone();Object.assign(d.events[0],patch);assert.throws(()=>validateMonth(d,2026,10,canonical));}
let d=clone();d.events[0].url='javascript:alert(1)';d.source='https://evil.example/';const clean=validateMonth(d,2026,10,canonical);assert.equal(clean.events[0].url,'https://www.youtube.com/watch?v='+clean.events[0].videoId);assert.equal(clean.source,canonical);
d=clone();d.events=Array(1001).fill(d.events[0]);assert.throws(()=>validateMonth(d,2026,10,canonical));
await assert.rejects(()=>readMonthResponse(new Response('<html>',{headers:{'Content-Type':'text/html'}}),2026,10,canonical));
await assert.rejects(()=>readMonthResponse(new Response(' '.repeat(1048577),{headers:{'Content-Type':'application/json'}}),2026,10,canonical),/크기/);
const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];assert(!policy.includes('unsafe-inline'));assert(!policy.includes('unsafe-eval'));assert(policy.includes("connect-src 'self'"));assert(policy.includes("base-uri 'none'"));assert(!/\son(?:error|load|click)\s*=/i.test(html));
for(const tag of ['script','style'])for(const m of html.matchAll(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)<\\/'+tag+'>','g'))){const hash=createHash('sha256').update(m[1]).digest('base64');assert(policy.includes("'sha256-"+hash+"'"));if(tag==='script')new vm.Script(m[1]);}
assert(!policy.includes(createHash('sha256').update('alert(1)').digest('base64')));assert(html.includes('name="referrer" content="no-referrer"'));
const core=source.split('/* LIBRARY_DATA_START */')[1].split('/* LIBRARY_DATA_END */')[0];
const lib=await import('data:text/javascript;base64,'+Buffer.from(core+'\nexport {readTransferCode,checkedNotes};').toString('base64'));
const bomb='a'.repeat(2097153),payload=gzipSync(bomb).toString('base64url'),sum=createHash('sha256').update(bomb).digest('hex').slice(0,24);await assert.rejects(()=>lib.readTransferCode('YKM1.'+payload+'.'+sum),/크|풀지/);assert.throws(()=>lib.checkedNotes(JSON.parse('{"__proto__":{"polluted":true}}')));assert.equal({}.polluted,undefined);
const context=vm.createContext({});vm.runInContext(source.match(/const esc=.*;/)[0]+'\n'+source.match(/function thumb\(.*\n/)[0]+'\nglobalThis.thumb=thumb',context);const thumbnail=context.thumb({title:'"><img src=x onerror=alert(1)>',videoId:'ciZv94CNcoI'});assert(!thumbnail.includes('alt=""><img'));assert(thumbnail.includes('&lt;img'));
await assert.rejects(()=>readMonthResponse(new Response(JSON.stringify(good),{headers:{'Content-Type':'text/plain'}}),2026,10,canonical));
assert.equal((await readMonthResponse(new Response(JSON.stringify(good),{headers:{'Content-Type':'text/plain'}}),2026,10,canonical,true)).month,10);
const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(good)};
try{const req=()=>new Request('https://test/api/month?year=2026&month=10&refresh=1');const responses=await Promise.all([app.fetch(req()),app.fetch(req()),app.fetch(req())]);assert(responses.every(r=>r.ok));assert.equal(calls,1);await app.fetch(req());assert.equal(calls,1);const page=await app.fetch(new Request('https://test/'));assert(page.headers.get('Content-Security-Policy').includes('frame-ancestors'));assert.equal(page.headers.get('Referrer-Policy'),'no-referrer')}finally{globalThis.fetch=original}
const workflow=await readFile('.github/workflows/pages.yml','utf8');assert(workflow.includes('permissions: {}'));assert.equal([...workflow.matchAll(/uses: .*@([a-f0-9]{40})/g)].length,[...workflow.matchAll(/uses:/g)].length);assert(!workflow.includes('pull_request_target'));
console.log('Security tests passed: cache injection, URL allowlist, CSP hashes, compressed payload limit, escaped titles, concurrent refresh deduplication, scoped/pinned Actions.');

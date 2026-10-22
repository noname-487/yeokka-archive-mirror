import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseSheet} from '../worker/index.js';
const config=JSON.parse(await readFile(new URL('../config/sources.json',import.meta.url)));
const root=new URL('../docs/data/',import.meta.url);
const read=async p=>{try{return JSON.parse(await readFile(new URL(p,root)))}catch{return null}};
const all=Object.entries(config).flatMap(([year,a])=>Object.keys(a.months).map(month=>({year:+year,month:+month,a}))).sort((a,b)=>a.year-b.year||a.month-b.month);
const scope=process.argv.includes('--recent')?'recent':'all';
const selected=scope==='recent'?all.slice(-2):all;
const previous=await read('manifest.json');
const errors=[];let missing=false;
for(const {year,month,a} of selected){
 const path=year+'/'+month+'.json',old=await read(path);
 try{
  const url=a.url.replace(/\/edit.*$/,'')+'/htmlview/sheet?headers=true&gid='+a.months[month];
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const events=parseSheet(await response.text(),month,year);
  if(old?.events.length>=20&&events.length<old.events.length*.6)throw new Error('Unexpected record drop; retaining previous cache');
  const data={year,month,events,updatedAt:new Date().toISOString(),source:a.url+'#gid='+a.months[month]};
  await mkdir(new URL(year+'/',root),{recursive:true});await writeFile(new URL(path,root),JSON.stringify(data)+'\n');
  console.log(year+'-'+month+': '+events.length+' records');
 }catch(error){errors.push({year,month,message:String(error.message),checkedAt:new Date().toISOString()});missing||=!old;console.error(year+'-'+month+': '+error.message+'; retained last good cache');}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
const months=[];
for(const {year,month,a} of all){const data=await read(year+'/'+month+'.json');if(!data){missing=true;continue}months.push({year,month,count:data.events.length,updatedAt:data.updatedAt,source:a.url});}
const selectedKeys=new Set(selected.map(x=>x.year+'-'+x.month));
const retainedErrors=(previous?.errors||[]).filter(e=>!selectedKeys.has(e.year+'-'+e.month));
await writeFile(new URL('manifest.json',root),JSON.stringify({version:1,checkedAt:new Date().toISOString(),scope,months,errors:[...retainedErrors,...errors]},null,2)+'\n');
if(missing)process.exitCode=1;

import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Read tab metadata as data only. Never execute Google-provided JavaScript.
export function parseMonthTabs(html,year){
 const months={};
 for(const m of html.matchAll(/items\.push\(\{name:\s*("(?:\\.|[^"\\])*"),[\s\S]*?\bgid:\s*"(\d{1,12})"/g)){
  const name=JSON.parse(m[1].replace(/\\x([\da-f]{2})/gi,'\\u00$1')).normalize('NFKC').replace(/\s+/g,'');
  const match=name.match(/^(?:(20\d{2}|\d{2})년)?(0?[1-9]|1[0-2])월$/);
  if(!match)continue;
  if(match[1]&&Number(match[1].length===2?'20'+match[1]:match[1])!==Number(year))continue;
  const month=Number(match[2]),gid=Number(m[2]);
  if(!Number.isSafeInteger(gid)||gid<0)continue;
  if(months[month]!==undefined&&months[month]!==gid)throw Error('Ambiguous month tabs: '+year+'-'+month);
  months[month]=gid;
 }
 if(!Object.keys(months).length)throw Error('No month tabs found for '+year);
 return months;
}
export async function readSheetHTML(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>4194304)throw Error('Source HTML too large');chunks.push(chunk)}
 return Buffer.concat(chunks).toString('utf8');
}
export async function discoverMonths(){
 const path=new URL('../config/sources.json',import.meta.url),config=JSON.parse(await readFile(path));
 const year=Math.max(...Object.keys(config).map(Number)),archive=config[year];
 try{
  const found=parseMonthTabs(await readSheetHTML(archive.url.replace(/\/edit.*$/,'')+'/htmlview'),year);
  const added=Object.keys(found).filter(m=>archive.months[m]===undefined);
  const changed=Object.keys(found).filter(m=>archive.months[m]!==found[m]);
  if(changed.length){archive.months={...archive.months,...found};await writeFile(path,JSON.stringify(config,null,2)+'\n')}
  console.log('Month discovery: '+year+'; '+(added.length?'new '+added.join(','):'no new months'));
  return added.map(Number);
 }catch(error){console.error('Month discovery warning: '+error.message+'; keeping registered months');return []}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await discoverMonths();

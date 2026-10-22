import {readFile,writeFile,mkdir} from 'node:fs/promises';
const worker=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const match=worker.match(/export const PAGE=String.raw`([\s\S]*)`;\s*$/);
if(!match)throw new Error('PAGE template missing');
// String.raw preserves backslashes; this template has no interpolation.
const html=match[1].replace("'/api/month?year='+y+'&month='+m+(force?'&refresh=1':'')","'./data/'+y+'/'+m+'.json'+(force?'?t='+Date.now():'')").replace('href="/"','href="./"');
if(html.includes('/api/month'))throw new Error('Unexpected API dependency');
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/index.html',import.meta.url),html);
await writeFile(new URL('../docs/.nojekyll',import.meta.url),'');
// Bundle a read-only fallback for the original Worker deployment.
const config=JSON.parse(await readFile(new URL('../config/sources.json',import.meta.url)));
const seed={};for(const [year,a] of Object.entries(config))for(const month of Object.keys(a.months))seed[year+'-'+month]=JSON.parse(await readFile(new URL('../docs/data/'+year+'/'+month+'.json',import.meta.url)));
await writeFile(new URL('../worker/cache-seed.js',import.meta.url),'export default '+JSON.stringify(seed)+';\n');

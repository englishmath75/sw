import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),out={at:new Date().toISOString(),operation:'anonymous public read only',sites:[]};
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error(url+' HTTP '+r.status);return Buffer.from(await r.arrayBuffer());};
for(const origin of ['https://mk.englishmath.kr','https://englishmath-python.vercel.app']){
 const html=(await get(origin+'/')).toString('utf8'),urls=[...new Set([...html.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),origin).href).filter(u=>new URL(u).origin===origin))].sort();
 if(!urls.length)throw Error('No protected-site assets found: '+origin);
 const assets=await Promise.all(urls.map(async url=>({url,sha256:sha(await get(url))})));
 out.sites.push({origin,assets});
}
if(process.env.PROTECTED_BASELINE){const old=JSON.parse(await readFile(process.env.PROTECTED_BASELINE,'utf8'));if(JSON.stringify(old.sites)!==JSON.stringify(out.sites))throw Error('Protected public assets differ; inspect existing work before publication');}
const dir=process.env.VERIFICATION_DIR||'sw/evidence';await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'protected-public-assets.json'),JSON.stringify(out,null,2));console.log('SW_PROTECTED_SNAPSHOT '+JSON.stringify(out));

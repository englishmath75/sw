import {readFile,writeFile} from 'node:fs/promises';
const dir=process.argv[2],file=dir+'/site-version.json',v=JSON.parse(await readFile(file,'utf8'));
v.publisher_repository='englishmath75/sw';v.publisher_sha=process.env.PUBLISHER_SHA;v.release_policy='pinned validated SW source';
await writeFile(file,JSON.stringify(v,null,2));
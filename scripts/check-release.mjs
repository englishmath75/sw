import {readFile,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const release=JSON.parse(await readFile('release-source.json','utf8'));
if(release.repository!=='englishmath75/pico-lab-classroom'||!/^[a-f0-9]{40}$/.test(release.source_sha))throw Error('Explicit SW source pin required');
if(!['integrated','baseline'].includes(release.mode)||release.rules_approved!==true)throw Error('Release approval record is missing');
const run=JSON.parse(execFileSync('gh',['api','repos/'+release.repository+'/actions/runs/'+release.validation_run],{encoding:'utf8'}));
const validations={'.github/workflows/sw-v2-validation.yml':'work/sw-v2-unified-20261106','.github/workflows/sw-integrated-validation.yml':'work/sw-integrated-20261107'};
if(validations[run.path]!==run.head_branch||run.conclusion!=='success')throw Error('Pinned source lacks successful SW validation');
if(run.path==='.github/workflows/sw-integrated-validation.yml'){
 if(release.rules_approval_status!=='APPROVED_BY_USER_AND_APPLIED'||!/^release-approval-[\w-]+\.json$/.test(release.rules_approval_record||''))throw Error('Integrated rules application record required');
 const proof=JSON.parse(await readFile(release.rules_approval_record,'utf8'));
 if(proof.project!=='englishmath-python-classroom'||proof.applied!==true||proof.rules_sha256!==release.rules_sha256||proof.source_sha!==release.source_sha||!proof.applied_at)throw Error('Rules application evidence differs from pinned source');
}
if(release.mode==='integrated'&&run.head_sha!==release.source_sha)throw Error('Validation SHA differs from source pin');
if(release.mode==='baseline'){
 if(release.source_sha!=='c38e7ce5e057b68898d086dde1caaaceae4f6d00'||release.baseline_publisher_sha!=='17162105ba32ac5075017115901800cb298068a0'||run.head_sha!==release.baseline_validation_source_sha)throw Error('Unknown rollback pair');
 const jobs=JSON.parse(execFileSync('gh',['api','repos/'+release.repository+'/actions/runs/'+release.validation_run+'/jobs'],{encoding:'utf8'}));
 if(!jobs.jobs.some(j=>j.name==='Rebuild preserved SW source/publisher pair'&&j.conclusion==='success'))throw Error('Rollback pair was not rebuilt successfully');
}
let current={};try{current=await (await fetch('https://sw.englishmath.kr/site-version.json',{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}})).json();}catch{}
const changed=process.env.EVENT_NAME!=='schedule'||current.source_sha!==release.source_sha||current.publisher_sha!==process.env.GITHUB_SHA;
await appendFile(process.env.GITHUB_OUTPUT,'source_sha='+release.source_sha+'\nchanged='+changed+'\n');
console.log(JSON.stringify({source_sha:release.source_sha,validation_run:release.validation_run,changed,policy:'Pinned release; never follow source main automatically'}));

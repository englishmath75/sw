import {readFile,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const release=JSON.parse(await readFile('release-source.json','utf8'));
if(release.repository!=='englishmath75/pico-lab-classroom'||!/^[a-f0-9]{40}$/.test(release.source_sha))throw Error('Explicit SW source pin required');
if(!['integrated','baseline'].includes(release.mode)||release.rules_approved!==true)throw Error('Release approval record is missing');
const run=JSON.parse(execFileSync('gh',['api','repos/'+release.repository+'/actions/runs/'+release.validation_run],{encoding:'utf8'}));
const validations={'.github/workflows/sw-v2-validation.yml':'work/sw-v2-unified-20261106','.github/workflows/sw-integrated-validation.yml':'work/sw-integrated-20261107','.github/workflows/sw-membership-validation.yml':'work/sw-membership-codes-20261109'};
if(validations[run.path]!==run.head_branch||run.conclusion!=='success')throw Error('Pinned source lacks successful SW validation');
if(['.github/workflows/sw-integrated-validation.yml','.github/workflows/sw-membership-validation.yml'].includes(run.path)){
 if(release.rules_approval_status!=='APPROVED_BY_USER_AND_APPLIED'||!/^release-approval-[\w-]+\.json$/.test(release.rules_approval_record||''))throw Error('Integrated rules application record required');
 const proof=JSON.parse(await readFile(release.rules_approval_record,'utf8'));
 if(proof.project!=='englishmath-python-classroom'||proof.applied!==true||proof.rules_sha256!==release.rules_sha256||!/^([a-f0-9]{40})$/.test(proof.source_sha||'')||!proof.applied_at)throw Error('Rules application evidence is missing or invalid');
 if(run.path==='.github/workflows/sw-membership-validation.yml'&&proof.source_sha!==release.source_sha)throw Error('Membership release requires approval for this exact source SHA');
 if(proof.source_sha!==release.source_sha){
  // A previously applied rules receipt remains valid only for a strictly verified
  // descendant that changes these UI/test/docs paths, never Firebase security rules.
  const compare=JSON.parse(execFileSync('gh',['api','repos/'+release.repository+'/compare/'+proof.source_sha+'...'+release.source_sha],{encoding:'utf8'}));
  const allowed=new Set(['sw/src/app.js','sw/src/cloud.js','sw/src/styles.css','sw/shell.html','sw/tests/integration-accounts.mjs','sw/TEACHER_GUIDE.md']);
  if(compare.status!=='ahead'||!Array.isArray(compare.files)||compare.files.length===0||
     compare.files.some(f=>!allowed.has(f.filename)||f.status!=='modified')||
     compare.total_commits>30)throw Error('Pinned source changed files outside the approved UI-only release scope; new Firebase rules review required');
  console.log('Approved Firebase rules are unchanged; UI-only descendant verified against '+proof.source_sha);
 }
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

import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(tmpdir(),'sw-release-test-'));
try{
 await mkdir(path.join(root,'scripts'));await mkdir(path.join(root,'bin'));
 await copyFile('scripts/check-release.mjs',path.join(root,'scripts/check-release.mjs'));
 await writeFile(path.join(root,'bin/gh'),'#!/usr/bin/env node\nprocess.stdout.write(process.env.SW_TEST_RUN);\n',{mode:0o755});
 await writeFile(path.join(root,'mock.mjs'),'globalThis.fetch=async()=>({json:async()=>({})});');
 const sha='a'.repeat(40),release={repository:'englishmath75/pico-lab-classroom',source_sha:sha,mode:'integrated',validation_run:1,rules_approved:true,rules_approval_status:'APPROVED_BY_USER_AND_APPLIED',rules_approval_record:'release-approval-membership.json',rules_sha256:'b'.repeat(64)};
 const run={path:'.github/workflows/sw-membership-validation.yml',head_branch:'work/sw-membership-codes-20261109',head_sha:sha,conclusion:'success'};
 const proof={project:'englishmath-python-classroom',applied:true,rules_sha256:release.rules_sha256,source_sha:sha,applied_at:'2026-11-09T00:00:00Z'};
 async function check(name,r=release,w=run,p=proof,pass=false){await writeFile(path.join(root,'release-source.json'),JSON.stringify(r));await writeFile(path.join(root,'release-approval-membership.json'),JSON.stringify(p));const result=spawnSync(process.execPath,['--import',path.join(root,'mock.mjs'),'scripts/check-release.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,PATH:path.join(root,'bin')+path.delimiter+process.env.PATH,SW_TEST_RUN:JSON.stringify(w),GITHUB_OUTPUT:path.join(root,'out'),EVENT_NAME:'push',GITHUB_SHA:'c'.repeat(40)}});assert.equal(result.status===0,pass,name+'\n'+result.stderr);console.log('PASS '+name);}
 await check('exact tested and approved SW source accepted',release,run,proof,true);
 await check('unapproved publication denied',{...release,rules_approved:false});
 await check('failed source validation denied',release,{...run,conclusion:'failure'});
 await check('wrong source SHA denied',release,{...run,head_sha:'d'.repeat(40)});
 await check('different branch denied',release,{...run,head_branch:'main'});
 await check('missing rule application denied',release,run,{...proof,applied:false});
 await check('approval for older source denied',release,run,{...proof,source_sha:'e'.repeat(40)});
 console.log('7 publisher release gates passed');
}finally{await rm(root,{recursive:true,force:true});}

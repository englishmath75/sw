'use strict';
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const deploy=require('./deploy-pages-queue.cjs');
async function run(statuses,options={}){
 let clock=0;const calls=[],outputs={},messages=[];let polls=0;
 const context={repo:{owner:'englishmath75',repo:'sw'},ref:'refs/heads/main',sha:'a'.repeat(40),runId:99,...options.context};
 const github={request:async(route,args)=>{
  calls.push({route,args});
  if(route.includes('/artifacts'))return {data:{artifacts:options.artifacts||[{id:1,name:'github-pages',size_in_bytes:600000000,expired:false}]}};
  if(route==='POST /repos/{owner}/{repo}/pages/deployments')return{data:{id:context.sha,page_url:'https://sw.englishmath.kr/'}};
  if(route.endsWith('/cancel'))return {data:{}};
  const status=statuses[Math.min(polls++,statuses.length-1)];
  if(status instanceof Error)throw status;
  return {data:{status}};
 }};
 const core={getIDToken:async()=>'test-oidc',setSecret:()=>{},setOutput:(k,v)=>outputs[k]=v,info:x=>messages.push(x),warning:x=>messages.push(x)};
 try{const value=await deploy({github,context,core,now:()=>clock,sleep:async ms=>{clock+=ms},signals:new EventEmitter(),timeout:options.timeout||1800000,completionGrace:options.completionGrace??300000,interval:options.interval||10000});return {value,calls,outputs,messages,clock};}
 catch(error){return {error,calls,outputs,messages,clock};}
}
(async()=>{
 const delayed=await run([...Array(65).fill('deployment_queued'),'deployment_in_progress','succeed']);
 assert.equal(delayed.value.status,'succeed');assert(delayed.clock>600000);assert(!delayed.calls.some(x=>x.route.endsWith('/cancel')));
 assert.equal(delayed.outputs.status,'succeed');assert(!delayed.messages.join('').includes('test-oidc'));
 const timed=await run(['deployment_queued'],{timeout:30000});assert.match(timed.error.message,/completion deadline exceeded/);assert.equal(timed.calls.filter(x=>x.route.endsWith('/cancel')).length,1);assert.equal(timed.outputs.status,undefined);
 const productionDelay=await run([...Array(60).fill('syncing_files'),...Array(57).fill(''),'finished_file_sync',...Array(8).fill('finished_file_sync'),'succeed']);
 assert.equal(productionDelay.value.status,'succeed');assert(productionDelay.clock>1200000);assert(!productionDelay.calls.some(x=>x.route.endsWith('/cancel')));
 const finishing=await run(['syncing_files','finished_file_sync','','succeed'],{timeout:30000,completionGrace:30000});
 assert.equal(finishing.value.status,'succeed');assert.equal(finishing.clock,40000);
 const stuckFinishing=await run(['syncing_files','finished_file_sync'],{timeout:30000,completionGrace:30000});
 assert(stuckFinishing.error);assert.equal(stuckFinishing.clock,50000);assert.equal(stuckFinishing.calls.filter(x=>x.route.endsWith('/cancel')).length,1);
 const failed=await run(['deployment_content_failed']);assert.match(failed.error.message,/terminal state/);assert.equal(failed.outputs.status,undefined);
 const wrong=await run(['succeed'],{context:{repo:{owner:'englishmath75',repo:'pico-lab-classroom'}}});assert.equal(wrong.calls.length,0);
 const oversize=await run(['succeed'],{artifacts:[{id:1,name:'github-pages',size_in_bytes:1073741825}]});assert(oversize.error);assert(!oversize.calls.some(x=>x.route.startsWith('POST')));
 const denied=await run([Object.assign(Error('sensitive payload must not leak'),{status:403})]);assert.match(denied.error.message,/HTTP 403/);assert(!denied.error.message.includes('sensitive'));assert.equal(denied.calls.filter(x=>x.route.endsWith('/cancel')).length,1);
 console.log('PASS: delayed queue, observed 20-minute sync regression, bounded activation grace, stuck activation cancellation, timeout cancellation, terminal failure, SW-only guard, artifact limit, API-error redaction');
})().catch(e=>{console.error(e.message);process.exitCode=1});

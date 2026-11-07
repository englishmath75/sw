'use strict';
// Same Pages REST/OIDC protocol as actions/deploy-pages; allow a bounded queue
// without cancelling a deployment just as the hosting service starts it.
module.exports = async function deploy({github,context,core,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),timeout=1800000,completionGrace=300000,interval=10000,signals=process}) {
  if(context.repo.owner!=='englishmath75'||context.repo.repo!=='sw'||context.ref!=='refs/heads/main'||!/^[a-f0-9]{40}$/.test(context.sha)) throw Error('SW main deployment only');
  const base={...context.repo,request:{timeout:30000}};
  const api=async(route,args={})=>{
    try{return (await github.request(route,{...base,...args})).data;}
    catch(e){throw Object.assign(Error('Pages API HTTP '+(e.status||'network failure')),{status:e.status});}
  };
  const listed=await api('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts',{run_id:context.runId,per_page:100});
  const artifacts=listed.artifacts.filter(a=>a.name==='github-pages'&&!a.expired);
  if(artifacts.length!==1||artifacts[0].size_in_bytes>1073741824) throw Error('Exactly one current-run Pages artifact under 1 GiB is required');
  const oidc=await core.getIDToken();core.setSecret(oidc);
  const created=await api('POST /repos/{owner}/{repo}/pages/deployments',{artifact_id:artifacts[0].id,pages_build_version:context.sha,oidc_token:oidc});
  const id=created.id||created.status_url?.split('/').pop();
  if(!id)throw Error('Pages deployment ID missing');
  core.setOutput('page_url',created.page_url||'https://sw.englishmath.kr/');
  let pending=true,errors=0,lastStatus='',syncFinished=false;
  const cancel=async()=>{
    if(pending){pending=false;await api('POST /repos/{owner}/{repo}/pages/deployments/{deployment_id}/cancel',{deployment_id:id});}
  };
  const signal=()=>{cancel().catch(()=>{}).finally(()=>process.exit(1));};
  signals.once('SIGINT',signal);signals.once('SIGTERM',signal);
  const started=now(),hardDeadline=started+timeout+completionGrace;
  let deadline=started+timeout;
  try {
    while(now()<deadline){
      await sleep(interval);
      let result;
      try {result=await api('GET /repos/{owner}/{repo}/pages/deployments/{deployment_id}',{deployment_id:id});errors=0;}
      catch(e){if(++errors>=5||[401,403].includes(e.status))throw e;core.warning(e.message);continue;}
      const status=result.status;
      if(status!==lastStatus){core.info('Pages status: '+(status||'(pending status unavailable)'));lastStatus=status;}
      // Real hosting evidence: file sync completed at 19m39s; the old 20m
      // timer cancelled before Pages could activate the release. Allow one
      // bounded finishing interval; repeated status polls cannot extend it.
      if(status==='finished_file_sync'&&!syncFinished){
        syncFinished=true;
        deadline=Math.min(hardDeadline,Math.max(deadline,now()+completionGrace));
        core.info('Pages file sync finished; awaiting activation within the bounded completion window');
      }
      if(status==='succeed'){pending=false;core.setOutput('status','succeed');return {status,publisherSha:context.sha,artifactId:artifacts[0].id};}
      if(['deployment_failed','deployment_perms_error','deployment_content_failed','deployment_cancelled','deployment_lost'].includes(status)){
        pending=false;throw Error('Pages terminal state: '+status);
      }
    }
    throw Error('Pages completion deadline exceeded after '+Math.round((now()-started)/1000)+' seconds; cancelling this deployment');
  } catch(e){if(pending)await cancel().catch(()=>core.warning('Cancellation failed; inspect Pages status before retrying'));throw e;}
  finally{signals.removeListener('SIGINT',signal);signals.removeListener('SIGTERM',signal);}
};

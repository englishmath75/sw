import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const {chromium}=createRequire(path.resolve('package.json'))('@playwright/test');
const origin=process.env.SW_VERIFY_ORIGIN||'https://sw.englishmath.kr';
const dir=path.resolve(process.env.VERIFICATION_DIR||'verification');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.SW_VIDEO_BROWSER==='chrome'?{channel:'chrome'}:{})});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage(),proof={sourceSha:process.env.SOURCE_SHA,browser:process.env.SW_VIDEO_BROWSER||'chromium',checks:[],status:'FAIL',networkFailures:[],pageErrors:[]};
page.on('requestfailed',r=>proof.networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('pageerror',e=>proof.pageErrors.push(e.message));
try{
 const delivery=await (await page.request.get(origin+'/video-delivery.json')).json();
 assert.equal(delivery.sourceSha,process.env.SOURCE_SHA);assert.equal(delivery.playlists.length,18);
 for(const [i,playlist] of ['learning-videos/v5/ep01/index.m3u8','learning-videos/v6/step1/index.m3u8','videos/lesson10/index.m3u8'].entries()){
  assert(delivery.playlists.includes(playlist));
  await page.goto(origin+'/404.html');
  await page.setContent('<html lang="ko"><meta charset="utf-8"><title>수업 동영상 재생 검증</title><body style="background:#132f40;color:white;font-family:sans-serif;padding:24px"><h1>기존 수업 동영상 재생 확인</h1><video id="v" controls muted style="width:100%;max-width:1100px"></video></body></html>');
  await page.addScriptTag({url:origin+'/learning-videos/hls.min.js'});
  const requests=[];const record=req=>{if(req.url().startsWith(delivery.originalOrigin)&&req.url().endsWith('.ts'))requests.push(req.url());};page.on('request',record);
  await page.evaluate(src=>{
   const v=document.getElementById('v');window.videoErrors=[];window.hls=new Hls();
   hls.on(Hls.Events.ERROR,(_,data)=>{window.videoErrors.push({type:data.type,details:data.details,fatal:data.fatal,reason:data.reason,error:data.error?.message});});
   hls.attachMedia(v);hls.loadSource(src);hls.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(e=>window.videoErrors.push(e.message)));
  },origin+'/'+playlist);
  await page.waitForFunction(()=>{const v=document.getElementById('v');return v.currentTime>.1&&v.videoWidth>0;},null,{timeout:90000});
  const state=await page.evaluate(()=>{const v=document.getElementById('v');v.pause();return {time:v.currentTime,width:v.videoWidth,height:v.videoHeight,duration:v.duration,errors:window.videoErrors};});
  assert.deepEqual(state.errors,[]);assert(requests.length>0,'Original video segments must be fetched');
  await page.screenshot({path:path.join(dir,'video-playback-'+i+'.png')});
  proof.checks.push({playlist,status:'PASS',...state,segmentRequests:requests});
  await page.evaluate(()=>hls.destroy());page.off('request',record);
 }
 proof.status='PASS';
}catch(e){proof.error=e.message;proof.video=await page.evaluate(()=>{const v=document.getElementById('v');return v?{time:v.currentTime,width:v.videoWidth,readyState:v.readyState,networkState:v.networkState,paused:v.paused,muted:v.muted,error:v.error?{code:v.error.code,message:v.error.message}:null,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),hlsErrors:window.videoErrors,codecs:{avc:MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E028"')}}:null;}).catch(()=>null);process.exitCode=1;await page.screenshot({path:path.join(dir,'video-failure.png')}).catch(()=>{});}
finally{await writeFile(path.join(dir,'video-playback.json'),JSON.stringify(proof,null,2));await browser.close();console.log(JSON.stringify(proof));}

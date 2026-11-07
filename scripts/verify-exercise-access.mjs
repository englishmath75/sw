import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const {chromium,expect:pwExpect}=require('@playwright/test');
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,collection,getDocFromServer,getDocs,setDoc,updateDoc,Timestamp}=require('firebase/firestore');
const expect=pwExpect.configure({timeout:25000}),exec=promisify(execFile),projectId='demo-englishmath-python',artifacts=resolve(process.env.VERIFICATION_DIR||'verification');
for(const k of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'])if(process.env[k]&&!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[k]))throw Error('Local emulator only');
await mkdir(artifacts,{recursive:true});
const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile('sw/security/integration-proposed.rules','utf8')}});
const people=Object.fromEntries(['student','other','teacher'].map(k=>[k,{uid:'sw-v2-'+k,email:'sw-v2-'+k+'@muhak-g-h.gne.go.kr',name:'SW 검증 '+k}]));
const results=[],errors=[],devices=[],vendorCache=new Map(),dist=resolve('dist');
let browser,server,origin,lastPage;
const frame=p=>p.frameLocator('#sw-classroom-frame');
const fixture='SW_V2_EMULATOR_20261107';
async function admin(fn){let value;await env.withSecurityRulesDisabled(async c=>{value=await fn(c.firestore());});return value;}
async function record(uid,id){return admin(async db=>{const s=await getDocFromServer(doc(db,'users',uid,'workspaces',id));return s.exists()?s.data():null;});}
async function scope(uid){return admin(async db=>{const out={};for(const g of ['workspaces','progress','revisions','submissions','limits'])out[g]=(await getDocs(collection(db,'users',uid,g))).docs.map(d=>[d.id,d.data()]).sort();return JSON.stringify(out);});}
const localDocs='http://127.0.0.1:8080/v1/projects/'+projectId+'/databases/(default)/documents/';
const value=async(uid,id)=>{const r=await fetch(localDocs+'users/'+uid+'/workspaces/'+id,{headers:{Authorization:'Bearer owner'}});if(r.status===404)return null;assert(r.ok);return JSON.parse((await r.json()).fields.code.stringValue).value;};
async function seed(){
 await env.clearFirestore();await admin(async db=>{await setDoc(doc(db,'staff',people.teacher.uid),{classIds:['class-2-1']});
  await Promise.all([setDoc(doc(db,'config/access'),{allowedDomains:['muhak-g-h.gne.go.kr'],allowedEmails:[]}),setDoc(doc(db,'classes/class-2-1'),{title:'2026학년도 2학년 1반',active:true}),
   ...Object.values(people).map(p=>setDoc(doc(db,'users',p.uid),{email:p.email,displayName:p.name,classId:'class-2-1',status:'approved',createdAt:Timestamp.now(),updatedAt:Timestamp.now()}))]);
 });
 const cleared=await fetch('http://127.0.0.1:9099/emulator/v1/projects/'+projectId+'/accounts',{method:'DELETE'});assert(cleared.ok);
 const imported=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/'+projectId+'/accounts:batchCreate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({users:Object.values(people).map(p=>({localId:p.uid,email:p.email,emailVerified:true,displayName:p.name,providerUserInfo:[{providerId:'google.com',rawId:p.email,email:p.email,displayName:p.name}]}))})});assert(imported.ok);
}
async function device(path='/?page=home',{clock=false,camera=false}={}){
 const context=await browser.newContext({locale:'ko-KR',viewport:{width:1440,height:1000},permissions:camera?['camera']:[]});
 await context.route('**/student-config.json',r=>r.fulfill({json:{enabled:true,emulator:true,firebase:{apiKey:'fake-api-key',authDomain:projectId+'.firebaseapp.com',projectId,appId:'sw-emulator-test'}}}));
 await context.route('https://**/*',async r=>{
  const url=new URL(r.request().url());if(!['apis.google.com','www.gstatic.com'].includes(url.hostname))return r.abort();
  if(!vendorCache.has(url.href))vendorCache.set(url.href,exec('curl',['--fail','--silent','--show-error','--location','--retry','1','--max-time','30','--url',url.href],{encoding:'buffer',maxBuffer:64000000}).then(x=>x.stdout));
  await r.fulfill({body:await vendorCache.get(url.href),contentType:'text/javascript'});
 });
 const p=await context.newPage();lastPage=p;if(clock)await p.clock.install();
 p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
 await p.addInitScript(()=>{try{if(navigator.mediaDevices){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{const stream=await original(c);top.__mockTracks??=[];top.__mockTracks.push(...stream.getTracks());return stream;};}}catch{}});
 const writes=[];p.on('request',r=>{if(/\/documents:commit$|Firestore\/Commit|Firestore\/Write\/channel/.test(r.url())&&/writes|commit/i.test(r.postData()||''))writes.push(r.url());});
 devices.push({context,page:p,writes});await p.goto(origin+path);await expect(p.locator('#sw-save-state')).not.toHaveText('로그인 상태 확인 중');return {context,page:p,writes};
}
async function login(p,person){
 const popup=p.waitForEvent('popup');await p.locator('#sw-login').click();const q=await popup;await q.waitForLoadState();await q.getByText(person.email,{exact:true}).click();
 await expect(p.locator('#sw-user')).toContainText(person.name);await expect(p.locator('#sw-space')).toHaveText('2026학년도 2학년 1반');
 await expect(p.locator('#sw-message')).not.toContainText('승인 정보를 읽지 못했습니다');
 await expect(p.locator('#sw-message')).not.toContainText('학습을 마쳤습니다');
 await expect(p.locator('#sw-message')).not.toContainText('15분 동안');
}
async function nav(p,id){await p.locator('a[data-route="'+id+'"]').click();await expect(p).toHaveURL(new RegExp('[?&]page='+id+'(?:&|$)'));if(id!=='data-lab'&&id!=='practice'&&id!=='library')await expect(p.locator('#sw-classroom-frame')).toBeVisible();}
async function scenario(name,fn){
 const started=Date.now();try{await fn();results.push({name,status:'PASS',durationMs:Date.now()-started,environment:'Chromium + Firebase emulators; clock advances only to skip the previously verified 16-second save pacing'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.message,durationMs:Date.now()-started});throw e;}
}
async function shot(p,name){await p.screenshot({path:resolve(artifacts,name+'.png'),fullPage:false});if(['datalab-python-table','lesson-account-restored','avatar-common-menu','layout-390','home-390','home-1440','review-390','review-1440'].includes(name)){const b=await p.screenshot({type:'jpeg',quality:55,fullPage:false});console.log('SW_PREVIEW '+name+' '+b.toString('base64'));}}const EX='sw3-2026-g2-swx0060',BASE='/?page=exercise&exercise='+EX;
const CODE='A = [3, 5, 2]\nB = A\nA.append(7)\nprint(B)';
const age=async()=>{const r=await fetch(localDocs+'users/'+people.student.uid+'/limits/state?updateMask.fieldPaths=updatedAt',{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{updatedAt:{timestampValue:new Date(Date.now()-20000).toISOString()}}})});assert(r.ok);};
async function code(p,text){const e=p.locator('.cm-content').first();await e.click();await e.press('ControlOrMeta+a');await e.fill(text);}
try{
 await seed();const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.py':'text/plain','.csv':'text/csv','.ttf':'font/ttf'};
 server=createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';const file=resolve(dist,'.'+pathname);if(!file.startsWith(dist+sep))throw Error('path');res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});let school,home;
 const catalog=JSON.parse(await readFile('sw/exercises.json','utf8'));
 const sample=(e,i)=>'# '+e.title+'\nV = '+i+'\nprint(V)';
 const navigate=async(p,id)=>{await p.evaluate(url=>{history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));},'/?page=exercise&exercise='+id);};
 school=await device(BASE,{clock:true});const p=school.page;await login(p,people.student);
 for(const [i,e] of catalog.entries())await scenario(e.id+' opens and saves its own code/input',async()=>{
  if(i){await age();await p.clock.fastForward(17000);}await navigate(p,e.id);
  await expect(p.locator('.sw-practice h2')).toHaveText(e.title);
  await expect(p.locator('.cm-content')).not.toHaveText('');
  await code(p,sample(e,i));await p.locator('.sw-practice textarea').first().fill(String(i));
  await p.locator('.sw-practice').getByRole('button',{name:'계정에 저장',exact:true}).click();
  await expect.poll(async()=>(await value(people.student.uid,e.id))?.code,{timeout:40000}).toBe(sample(e,i));
  await expect(p.locator('#sw-save-state')).toContainText('클라우드 저장 완료');
 });
 home=await device(BASE);const q=home.page;await login(q,people.student);
 for(const [i,e] of catalog.entries())await scenario(e.id+' restores in independent browser context',async()=>{
  await navigate(q,e.id);await expect(q.locator('.sw-practice h2')).toHaveText(e.title);
  await expect(q.locator('.cm-content')).toHaveText(sample(e,i),{useInnerText:true});
  await expect(q.locator('.sw-practice textarea').first()).toHaveValue(String(i));
 });
 await q.screenshot({path:artifacts+'/all-exercises-last-restored.png'});

}finally{
 await writeFile(artifacts+'/all-exercise-access.json',JSON.stringify({results,errors},null,2));
 for(const d of devices)await d.context.close().catch(()=>{});await browser?.close();server?.close();await env.cleanup();
}
if(results.some(r=>r.status==='FAIL')||errors.length)process.exitCode=1;

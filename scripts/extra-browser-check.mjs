import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(path.resolve('package.json')),{chromium,expect}=require('@playwright/test');
const {routes}=await import(pathToFileURL(path.resolve('sw/src/registry.js')));
const dist=path.resolve('dist'),dir=path.resolve('sw/evidence');await mkdir(dir,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(dist,'.'+name);if(!file.startsWith(dist+path.sep))throw Error('path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,b=await chromium.launch({headless:true,args:['--no-sandbox']}),context=await b.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[],results=[];
p.on('pageerror',e=>errors.push(e.message));
await context.route('**/student-config.json',r=>r.fulfill({json:{enabled:true,emulator:true,firebase:{projectId:'demo-englishmath-python',apiKey:'fake',appId:'extra-ui-test',authDomain:'demo-englishmath-python.firebaseapp.com'}}}));
await context.route('https://**/*',r=>r.abort());
try{
 for(const [id,route] of Object.entries(routes)){
  const alias=route.file&&route.file!=='index.html'?'/'+route.file:'/?page='+id;
  await p.goto(origin+alias);await expect(p).toHaveURL(new RegExp('[?&]page='+id+'(?:[&#]|$)'));
  if(route.kind==='frame'){const f=p.frameLocator('#sw-classroom-frame');await expect(f.locator('body')).toBeVisible();assert((await f.locator('body').innerText()).trim().length>30);}
  if(route.kind==='datalab')await expect(p.locator('.cm-content')).toBeVisible();
  if(route.storageMode==='none')await expect(p.locator('#sw-save')).toBeHidden();
  results.push({id,alias,status:'PASS'});
 }
 for(const [alias,page] of [['/student-room.html?panel=library','library'],['/student-room.html?panel=teacher','teacher'],['/student-room.html?workspace=scratch-04','practice'],['/data-lab/index.html','data-lab'],['/pandas-data-lab/step-by-step.html?lesson=8','lesson']]){
  await p.goto(origin+alias);await expect(p).toHaveURL(new RegExp('[?&]page='+page+'(?:[&#]|$)'));results.push({alias,page,status:'PASS'});
 }
 await p.goto(origin+'/step-by-step.html?lesson=3');const f=p.frameLocator('#sw-classroom-frame');await expect(f.locator('#heroTitle')).toContainText('3차시');
 for(const [selector,extension] of [['#savePy','.py'],['#exportJson','.json'],['#downloadCsv','.csv']]){
  const wait=p.waitForEvent('download');await f.locator(selector).click();const d=await wait;assert(d.suggestedFilename().endsWith(extension));const name=path.join(dir,'download-check'+extension);await d.saveAs(name);if(extension!=='.py')assert((await readFile(name)).length>10);results.push({download:extension,status:'PASS'});
 }
 await p.goto(origin+'/first-analysis.html');const first=p.frameLocator('#sw-classroom-frame');await first.locator('#analysisNote').fill('가상 자료의 분석 설명');await p.locator('nav[aria-label="수업 메뉴"] [data-route=home]').click();await p.goBack();await expect(first.locator('#analysisNote')).toHaveValue('가상 자료의 분석 설명');
 const txt=p.waitForEvent('download');await first.locator('#saveNote').click();assert((await txt).suggestedFilename().endsWith('.txt'));
 await p.goto(origin+'/?page=data');const data=p.frameLocator('#sw-classroom-frame');
 await data.locator('#uploadCsv').setInputFiles({name:'fictional-test.csv',mimeType:'text/csv',buffer:Buffer.from('item,sales\nPRIVATE_CSV_FIXTURE,7')});
 await expect(data.locator('#csvInput')).toHaveValue('item,sales\nPRIVATE_CSV_FIXTURE,7');
 const exportWait=p.waitForEvent('download');await p.locator('#sw-export').click();const exportFile=await exportWait;await exportFile.saveAs(path.join(dir,'user-csv-boundary.json'));const exported=await readFile(path.join(dir,'user-csv-boundary.json'),'utf8');assert(!exported.includes('PRIVATE_CSV_FIXTURE'));assert(exported.includes('user-file'));
 await p.locator('nav[aria-label="수업 메뉴"] [data-route=home]').click();await p.goBack();await expect(data.locator('#csvInput')).toHaveValue('item,sales\nPRIVATE_CSV_FIXTURE,7');
 results.push({userCsv:'selected file remains in same-session memory; excluded from account backup',status:'PASS'});
 assert.deepEqual(errors,[]);console.log('PASS all registered routes, old aliases, read-only controls and real CSV/Python/JSON/TXT downloads');
}finally{await writeFile(path.join(dir,'extra-browser-results.json'),JSON.stringify({environment:'Anonymous local Chromium; no production login, data writes or camera',sourceSha:process.env.SW_SOURCE_SHA,results,errors},null,2));await b.close();await new Promise(r=>server.close(r));}

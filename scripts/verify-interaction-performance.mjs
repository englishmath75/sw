import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium,expect}=createRequire(resolve('package.json'))('@playwright/test');
const dir=resolve(process.env.VERIFICATION_DIR||'verification');await mkdir(dir,{recursive:true});
let server;let origin=process.env.SW_VERIFY_ORIGIN;
if(!origin){const root=resolve('dist'),types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'};server=createServer(async(req,res)=>{try{let name=new URL(req.url,'http://local').pathname;if(name.endsWith('/'))name+='index.html';const p=resolve(root,'.'+decodeURIComponent(name));assert(p.startsWith(root+sep));res.setHeader('Content-Type',types[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch(),results=[],errors=[];const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'}),p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));
const edit=async(page,code)=>{let e=page.locator('.cm-content');await e.click();await e.press('ControlOrMeta+a');await e.fill(code);};
const done=async(page)=>expect(page.locator('.sw-practice [role=status]').first()).toContainText('정상 완료',{timeout:150000});
async function check(name,fn){const start=Date.now();console.log('START',name);try{let detail=await fn();results.push({name,status:'PASS',durationMs:Date.now()-start,...detail});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',message:e.message});console.error('FAIL',name,e.message);}}
try{
await check('cold page and first Python run versus warm revisit and fresh Worker',async()=>{
 const samples=[];
 for(const pass of ['cold','warm']){const start=Date.now();await p.goto(origin+'/?page=practice');await expect(p.locator('.cm-content')).toBeVisible({timeout:30000});const editorMs=Date.now()-start;await edit(p,'import pandas as pd\ndf=pd.DataFrame({"상품":["빵","우유"],"수량":[2,3]})\nprint(df.shape)');const runStart=Date.now();await p.getByRole('button',{name:'전체 실행',exact:true}).click();await done(p);await expect(p.getByTestId('trace-stdout')).toHaveText('(2, 2)\n');const runtimeMs=Date.now()-runStart;const network=await p.evaluate(()=>{let n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd,resources:performance.getEntriesByType('resource').length};});samples.push({pass,editorMs,runtimeMs,...network});}
 return {environment:process.env.SW_VERIFY_ORIGIN?'Production Chromium, not school network':'Local asset server Chromium, not school network',samples};
});
await check('keyboard editor shortcut and Tab/Enter navigate synchronized trace',async()=>{
 await edit(p,'X = 1\nX += 2\nprint(X)');await p.locator('.cm-content').press('ControlOrMeta+Enter');console.log('Keyboard run sent');await done(p);console.log('Keyboard run completed');await expect(p.getByTestId('trace-stdout')).toHaveText('(출력 없음)');
 async function tabTo(text){for(let i=0;i<50;i++){await p.keyboard.press('Tab');if(await p.evaluate(t=>document.activeElement?.tagName==='BUTTON'&&document.activeElement?.textContent===t,text))return;}throw Error('Tab cannot reach '+text);}
 await p.keyboard.press('Escape');console.log('Escape pressed');await tabTo('마지막');console.log('Last reached');await p.keyboard.press('Enter');await expect(p.getByTestId('trace-stdout')).toHaveText('3\n');await tabTo('처음');await p.keyboard.press('Enter');await expect(p.getByTestId('trace-stdout')).toHaveText('(출력 없음)');return {input:'CodeMirror Ctrl+Enter and actual keyboard Tab/Enter; no mouse for trace'};
});
await check('200 percent CSS zoom keeps editing and all trace buttons accessible',async()=>{
 await p.evaluate(()=>document.body.style.zoom='2');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const n=p.getByRole('button',{name:'마지막',exact:true});await n.scrollIntoViewIfNeeded();await n.click();await expect(p.getByTestId('trace-stdout')).toHaveText('3\n');await p.screenshot({path:dir+'/zoom-200-percent.png'});await p.evaluate(()=>document.body.style.zoom='');return {zoom:'200% CSS layout zoom at 1440x1000'};
});
await check('390px touch controls move last and first without stale output',async()=>{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'ko-KR'}),q=await c.newPage();await q.goto(origin+'/?page=practice');await expect(q.locator('.cm-content')).toBeVisible({timeout:30000});await edit(q,'A=[1,2]\nA.append(3)\nprint(A)');await q.getByRole('button',{name:'한 줄씩 보기',exact:true}).tap();await done(q);await q.getByRole('button',{name:'마지막',exact:true}).tap();await expect(q.getByTestId('trace-stdout')).toHaveText('[1, 2, 3]\n');await q.getByRole('button',{name:'처음',exact:true}).tap();await expect(q.getByTestId('trace-stdout')).toHaveText('(출력 없음)');assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await q.screenshot({path:dir+'/mobile-touch-trace.png'});await c.close();
});
}finally{await writeFile(dir+'/interaction-performance.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),results,errors},null,2));await browser.close();server?.close();}
if(results.some(r=>r.status!=='PASS')||errors.length)process.exitCode=1;

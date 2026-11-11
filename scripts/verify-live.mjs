import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve('package.json'));
const {chromium,expect}=require('@playwright/test');
const expected=process.env.SOURCE_SHA;if(!/^[a-f0-9]{40}$/.test(expected||''))throw Error('Exact source SHA required');
const origin=process.env.SW_VERIFY_ORIGIN||'https://sw.englishmath.kr',dir=path.resolve(process.env.VERIFICATION_DIR||'verification');await mkdir(dir,{recursive:true});
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const proof={sourceSha:expected,environment:(process.env.SW_VERIFY_ORIGIN?'Local candidate':'Production')+' anonymous Chromium; no Google login or physical camera',checks:[],realGoogle:'NOT_RUN',independentBrowser:'NOT_RUN',schoolPC:'NOT_RUN',physicalCamera:'NOT_RUN'};
try{
 const version=await (await p.request.get(origin+'/site-version.json?verify='+expected)).json();assert.equal(version.source_sha,expected);proof.siteVersion=version;
 if(expected==='c38e7ce5e057b68898d086dde1caaaceae4f6d00'){await p.goto(origin+'/');await expect(p.locator('.classroom-unit')).toHaveText('고2 | 소프트웨어와 생활');await p.goto(origin+'/ai-avatar.html');await expect(p.locator('#animals button')).toHaveCount(8);proof.checks.push('preserved baseline homepage and avatar');proof.status='PASS';}else{
 await p.goto(origin+'/?page=home');await expect(p.locator('#sw-classroom-frame')).toBeVisible();await expect(p.locator('#sw-user')).toHaveText('로그인 전');
 await expect(p.locator('.classroom-unit')).toHaveText('고2 | 소프트웨어와 생활');assert.equal(await p.locator('.classroom-unit').evaluate(x=>getComputedStyle(x).fontSize),'16px');await p.screenshot({path:path.join(dir,'sw-home-desktop.png')});
 await p.locator('[data-route="lesson"]').click();const lesson=p.frameLocator('#sw-classroom-frame');
 if(['09de344cf895209adb1c48ec37d99cebf65aab27','e7edf318d696f1ec6875eaa68037f151271805d3'].includes(expected)){
  await expect(lesson.locator('.lesson-course')).toContainText('1차시 · 판다스 첫 수업 · Series');
  await expect(p.locator('[data-route="pandas-intro"]')).toHaveCount(0);
  await expect(lesson.locator('.example')).toHaveCount(29);
  await lesson.getByRole('link',{name:/2차시 ·/}).click();await p.waitForURL('**/?page=lesson&lesson=2');
  await expect(lesson.locator('#heroTitle')).toContainText('2차시');
  await lesson.locator('#lessonPicker').evaluate(el=>el.open=true);await lesson.locator('[data-lesson="0"]').click();
  await p.waitForURL('**/?page=lesson&lesson=1');await expect(lesson.locator('#code-1')).toBeVisible();
  proof.checks.push('Series lesson 1 replaces former lesson; standalone sidebar absent; lesson 2 and return work');
 }else await expect(lesson.locator('#heroTitle')).toContainText('1차시');await p.screenshot({path:path.join(dir,'sw-lesson-desktop.png')});proof.checks.push('home, legacy lesson and common menu');
 await p.locator('[data-route="data-lab"]').click();await expect(p.locator('.cm-content')).toContainText('import pandas as pd');await expect(p.getByRole('button',{name:/^(한 줄씩 보기|▶ 실제 Python 실행)$/})).toBeVisible({timeout:150000});if(await p.getByRole('button',{name:'한 줄씩 보기',exact:true}).count()){await p.getByRole('button',{name:'한 줄씩 보기',exact:true}).click();await expect(p.getByTestId('data-status')).toContainText('실행 완료',{timeout:150000});await expect(p.getByTestId('trace-stdout')).toHaveText('(출력 없음)');await p.getByRole('button',{name:'마지막',exact:true}).click();await expect(p.getByTestId('trace-stdout')).toContainText('(3, 2)');
 const outputStyle=await p.getByTestId('trace-stdout').evaluate(el=>{const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,fontSize:parseFloat(s.fontSize)};});
 const luminance=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const a=luminance(outputStyle.color),z=luminance(outputStyle.background),contrast=(Math.max(a,z)+.05)/(Math.min(a,z)+.05);
 assert(contrast>=4.5,'Output text must have readable contrast');assert(outputStyle.fontSize>=14,'Output text must be readable at classroom size');proof.outputStyle={...outputStyle,contrast};
 await p.getByRole('button',{name:'처음',exact:true}).click();await expect(p.getByTestId('trace-stdout')).toHaveText('(출력 없음)');}else{await p.getByRole('button',{name:'▶ 실제 Python 실행',exact:true}).click();await expect(p.getByTestId('data-status')).toContainText('실행 완료',{timeout:150000});await expect(p.getByTestId('data-stdout')).toContainText('(3, 2)');}await p.screenshot({path:path.join(dir,'sw-datalab-production.png')});proof.checks.push('native data lab, actual Python shape (3,2)');
 if(await p.getByRole('button',{name:'한 줄씩 보기',exact:true}).count()){
  const edit=async code=>{const e=p.locator('.cm-content');await e.click();await e.press('ControlOrMeta+a');await e.fill(code);};
  const done=()=>expect(p.locator('.sw-practice [role=status]').first()).toContainText('정상 완료',{timeout:150000});
  await p.goto(origin+'/?page=practice');await expect(p.locator('.cm-content')).toBeVisible();
  await edit('import turtle\nt=turtle.Turtle()\nt.color("cyan")\nt.forward(100)\nt.left(90)\nt.forward(50)');
  await p.getByRole('button',{name:'한 줄씩 보기',exact:true}).click();await done();await expect(p.locator('.sw-turtle')).toHaveCount(0);
  await p.getByRole('button',{name:'마지막',exact:true}).click();await expect(p.locator('figcaption')).toContainText('(100.00, 50.00)');await expect(p.locator('.sw-turtle svg line')).toHaveCount(2);
  await p.screenshot({path:path.join(dir,'sw-turtle-production.png')});await p.getByRole('button',{name:'처음',exact:true}).click();await expect(p.locator('.sw-turtle')).toHaveCount(0);proof.checks.push('production Turtle actual code, position and empty initial frame');
  await edit('import matplotlib.pyplot as plt\nplt.figure()\nplt.plot([1,2],[3,4])\nplt.title("매점 판매량")\nplt.show()\nplt.figure()\nplt.bar([1,2],[5,3])\nplt.title("요일별 비교")\nplt.show()');
  await p.locator('.cm-content').press('ControlOrMeta+Enter');await done();await expect(p.locator('.sw-trace img')).toHaveCount(0);await p.getByRole('button',{name:'마지막',exact:true}).click();await expect(p.locator('.sw-trace img')).toHaveCount(2);await p.screenshot({path:path.join(dir,'sw-matplotlib-production.png')});await p.getByRole('button',{name:'처음',exact:true}).click();await expect(p.locator('.sw-trace img')).toHaveCount(0);proof.checks.push('Ctrl+Enter executes; multiple Korean Matplotlib figures synchronized with trace');
  await p.goto(origin+'/?page=exercise&exercise=sw3-2026-g2-swx0125');await expect(p.locator('.cm-content')).toBeVisible();
  const catalog=JSON.parse(await (await import('node:fs/promises')).readFile('sw/exercises.json','utf8'));await edit(catalog.find(e=>e.sourceId==='SWX0125').teacherCode+'\n# 운영 실행 확인\n');
  await p.getByRole('button',{name:'전체 실행',exact:true}).click();await done();await expect(p.locator('canvas')).toBeVisible();await p.getByRole('button',{name:'마지막 프레임',exact:true}).click();await expect(p.getByLabel('작품 프레임')).toHaveValue('89');await p.screenshot({path:path.join(dir,'sw-artwork-production.png')});proof.checks.push('edited Python artwork executes and displays 90 recorded frames');
 }
 await p.locator('[data-route="avatar"]').click();const frame=p.frameLocator('#sw-classroom-frame');await expect(frame.locator('#animals button')).toHaveCount(8);assert.equal(await frame.locator('#camera').evaluate(v=>v.srcObject===null),true);await p.screenshot({path:path.join(dir,'sw-avatar-desktop.png')});proof.checks.push('pink avatar menu; eight animals; camera inactive');
 await p.setViewportSize({width:390,height:1000});await p.screenshot({path:path.join(dir,'sw-avatar-mobile.png')});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);proof.status='PASS';}
}catch(e){proof.status='FAIL';proof.error=e.message;process.exitCode=1;await p.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});}
finally{await writeFile(path.join(dir,'browser-live.json'),JSON.stringify(proof,null,2));await b.close();console.log(JSON.stringify(proof));}

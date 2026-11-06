import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve('package.json'));
const {chromium,expect}=require('@playwright/test');
const expected=process.env.SOURCE_SHA;if(!/^[a-f0-9]{40}$/.test(expected||''))throw Error('Exact source SHA required');
const origin='https://sw.englishmath.kr',dir=path.resolve(process.env.VERIFICATION_DIR||'verification');await mkdir(dir,{recursive:true});
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const proof={sourceSha:expected,environment:'Production anonymous Chromium; no Google login or physical camera',checks:[],realGoogle:'NOT_RUN',independentBrowser:'NOT_RUN',schoolPC:'NOT_RUN',physicalCamera:'NOT_RUN'};
try{
 const version=await (await p.request.get(origin+'/site-version.json?verify='+expected)).json();assert.equal(version.source_sha,expected);proof.siteVersion=version;
 if(expected==='c38e7ce5e057b68898d086dde1caaaceae4f6d00'){await p.goto(origin+'/');await expect(p.locator('.classroom-unit')).toHaveText('고2 | 소프트웨어와 생활');await p.goto(origin+'/ai-avatar.html');await expect(p.locator('#animals button')).toHaveCount(8);proof.checks.push('preserved baseline homepage and avatar');proof.status='PASS';}else{
 await p.goto(origin+'/?page=home');await expect(p.locator('#sw-classroom-frame')).toBeVisible();await expect(p.locator('#sw-user')).toHaveText('로그인 전');
 await expect(p.locator('.classroom-unit')).toHaveText('고2 | 소프트웨어와 생활');assert.equal(await p.locator('.classroom-unit').evaluate(x=>getComputedStyle(x).fontSize),'16px');await p.screenshot({path:path.join(dir,'sw-home-desktop.png')});
 await p.locator('[data-route="lesson"]').click();await expect(p.frameLocator('#sw-classroom-frame').locator('#heroTitle')).toContainText('1차시');await p.screenshot({path:path.join(dir,'sw-lesson-desktop.png')});proof.checks.push('home, legacy lesson and common menu');
 await p.locator('[data-route="data-lab"]').click();await expect(p.locator('.cm-content')).toContainText('import pandas as pd');await p.getByRole('button',{name:'▶ 실제 Python 실행',exact:true}).click();await expect(p.getByTestId('data-status')).toContainText('실행 완료',{timeout:150000});await expect(p.getByTestId('data-stdout')).toContainText('(3, 2)');await p.screenshot({path:path.join(dir,'sw-datalab-production.png')});proof.checks.push('native data lab, actual Python shape (3,2)');
 await p.locator('[data-route="avatar"]').click();const frame=p.frameLocator('#sw-classroom-frame');await expect(frame.locator('#animals button')).toHaveCount(8);assert.equal(await frame.locator('#camera').evaluate(v=>v.srcObject===null),true);await expect(p.locator('#sw-save')).toBeHidden();await p.screenshot({path:path.join(dir,'sw-avatar-desktop.png')});proof.checks.push('pink avatar menu; eight animals; camera inactive; no save');
 await p.setViewportSize({width:390,height:1000});await p.screenshot({path:path.join(dir,'sw-avatar-mobile.png')});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);proof.status='PASS';}
}catch(e){proof.status='FAIL';proof.error=e.message;process.exitCode=1;await p.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});}
finally{await writeFile(path.join(dir,'browser-live.json'),JSON.stringify(proof,null,2));await b.close();console.log(JSON.stringify(proof));}

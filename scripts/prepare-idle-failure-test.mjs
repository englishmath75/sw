import {readFile,writeFile} from 'node:fs/promises';
let source=await readFile('sw/tests/browser.mjs','utf8');
const replace=(a,b)=>{if(!source.includes(a))throw Error('Harness anchor missing: '+a);source=source.replace(a,b);};
replace('async function scenario(name,fn){','async function scenario(name,fn){\n if(!name.startsWith("idle warning"))return;');
replace("await expect(p.locator('#sw-code')).toBeVisible();await p.clock.fastForward(14*60000+1000);","await expect(p.locator('#sw-code')).toBeVisible();await p.locator('#sw-code').fill('print(\\\"OFFLINE_IDLE_FIXTURE\\\")');await p.context().setOffline(true);await p.locator('#sw-save').click();await expect(p.locator('#sw-save-state')).toContainText('저장 실패');await p.clock.fastForward(14*60000+1000);");
replace("await expect(p.locator('#sw-user')).toHaveText('로그인 전');await p.context().close();\n });\n await scenario('inquiry D","await expect(p.locator('#sw-user')).toHaveText('로그인 전');await expect(p.locator('#sw-code')).toHaveCount(0);assert.equal(await record(people.idle.uid,'scratch-01'),null);await p.context().close();\n });\n await scenario('inquiry D");
replace("assert.equal(errors.length,0,'Unexpected page errors: '","assert.equal(results.length,1,'exactly one targeted idle-failure scenario must run');assert.equal(errors.length,0,'Unexpected page errors: '");
await writeFile('sw/tests/idle-failure.generated.mjs',source);
console.log('Targeted additional test: real emulator login, offline failed save, 14-minute warning, 15-minute logout, DOM cleared and no server write. Fake clock; not a school-PC test.');

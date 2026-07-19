import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:860,height:900}, deviceScaleFactor:1.3 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/index.html',{waitUntil:'networkidle'});
await p.waitForTimeout(300);
const opts=await p.$$eval('#month option',o=>o.map(x=>x.value));
console.log('month options:', opts.join(', '));
for(const mid of ['2026-06','2026-05']){
  await p.selectOption('#month',mid); await p.waitForTimeout(180);
  const arows=await p.$$eval('#abody tr',e=>e.length);
  const atext=await p.$eval('#abody',e=>e.textContent.slice(0,20).replace(/\s+/g,' '));
  await p.click('.tab[data-view="player"]'); await p.waitForTimeout(150);
  const prows=await p.$$eval('#pbody tr',e=>e.length);
  const first=await p.$eval('#pbody tr',e=>e.textContent.replace(/\s+/g,' ').trim().slice(0,40)).catch(()=>'-');
  await p.click('.tab[data-view="alliance"]'); await p.waitForTimeout(80);
  console.log(mid,'| alliance rows:',arows,'("'+atext+'") | player rows:',prows,'| first player:',first);
}
console.log('JS_ERRORS:', errs.length?errs.join(' | '):'none');
await b.close();

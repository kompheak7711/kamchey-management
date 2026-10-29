const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const page_src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
const shell = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${page_src}</body></html>`;
fs.writeFileSync(path.join(__dirname, 'page.html'), shell);
const url = 'file://' + path.join(__dirname, 'page.html');
const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(opts = {}, s = seed) {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1200, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light', timezoneId: 'Asia/Phnom_Penh' });
    await ctx.addInitScript({ path: path.join(__dirname, 'mock.js') });
    await ctx.addInitScript(`window.__mockInit(${JSON.stringify(s)})`);
    await ctx.addInitScript(() => { const fixed = new Date('2026-10-27T20:30:00+07:00').getTime(); const D = Date; class FD extends D { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } } window.Date = FD; });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.goto(url + (opts.hash || ''));
    await page.waitForFunction(() => !document.querySelector('#view').textContent.includes('Opening your loans'), null, { timeout: 5000 });
    await page.waitForTimeout(150);
    return { ctx, page };
  }
  const text = async (page, sel) => (await page.locator(sel).allInnerTexts()).join(' | ');

  // 1. Home with examples
  let { ctx, page } = await open();
  console.log('KPIs:', await text(page, '.kpi'));
  console.log('Attention:', await text(page, 'section:nth-of-type(2) .row'));
  console.log('Upcoming:', await text(page, 'section:nth-of-type(3) .row'));
  await page.screenshot({ path: out + '/home-desktop.png', fullPage: true });
  for (const h of ['loans', 'loan-lex4', 'loan-lex2', 'titles', 'borrowers', 'borrower-bexsophea', 'payments', 'more']) {
    await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(120);
    await page.screenshot({ path: `${out}/${h}.png`, fullPage: true });
  }
  await page.evaluate(() => { location.hash = 'loan-lex4'; }); await page.waitForTimeout(100);
  console.log('L-004 callout:', await text(page, '.callout'));
  console.log('L-004 schedule:', (await text(page, 'tbody tr')).replace(/\t/g, ' '));

  // 2. Flow: new loan with new borrower and a title paper (3%)
  await page.click('#hdr-loan');
  await page.selectOption('#l-borrower', '__new');
  await page.fill('#l-bname', 'Vanna Test');
  await page.fill('#lb-phone', '099 000 111');
  await page.fill('#lb-addr', 'Kampong Cham');
  await page.fill('#lb-gname', 'Bopha (sister)');
  await page.fill('#l-start', '2026-08-20');
  await page.fill('#l-amount', '4000');
  await page.click('[data-rate="3"]');
  await page.fill('#l-term', '12');
  console.log('Loan preview:', await text(page, '#l-preview'));
  await page.fill('#lt-no', 'KC-55-0101');
  await page.fill('#lt-loc', 'Kampong Cham town');
  await page.fill('#lt-value', '15000');
  await page.screenshot({ path: out + '/form-loan.png' });
  await page.click('#sheet button[type=submit]');
  await page.waitForTimeout(200);
  console.log('After save hash:', await page.evaluate(() => location.hash), '| sheet open:', await page.evaluate(() => document.querySelector('#sheet').open));
  console.log('New loan head:', await text(page, '.detail-id'), '| callout:', await text(page, '.callout'));
  // record payment: should prefill interest owed (2 months x $120 since Sep 20, Oct 20)
  await page.click('.head-actions [data-act=pay]');
  await page.waitForTimeout(100);
  console.log('Pay info:', await text(page, '#p-info'), '| quick:', await text(page, '#p-quick'), '| prefilled int:', await page.inputValue('#p-int'));
  await page.screenshot({ path: out + '/form-pay.png' });
  await page.click('#sheet button[type=submit]');
  await page.waitForTimeout(200);
  console.log('After pay callout:', await text(page, '.callout'));
  // partial repayment of 1000 -> next interest 90
  await page.click('.head-actions [data-act=pay]');
  await page.fill('#p-int', '');
  await page.fill('#p-prin', '1000');
  console.log('Part repay summary:', await text(page, '#p-sum'));
  await page.click('#sheet button[type=submit]');
  await page.waitForTimeout(200);
  console.log('After part repay facts:', await text(page, '.facts'));
  // payoff
  await page.click('.head-actions [data-act=payoff]');
  await page.waitForTimeout(100);
  console.log('Payoff fields:', await page.inputValue('#p-int'), await page.inputValue('#p-prin'), '|', await text(page, '#p-sum'));
  await page.click('#sheet button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Toast:', await text(page, '#toast'), '| chips:', await text(page, '.detail-id .row-chips'), '| title state:', await text(page, '.title-card .title-top'));
  // return the title
  await page.click('[data-act=return-title]');
  await page.click('#sheet button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Title after return:', await text(page, '.title-card .title-top'));
  // validation: over-repay
  await page.evaluate(() => { location.hash = 'loan-lex3'; }); await page.waitForTimeout(100);
  await page.click('.head-actions [data-act=pay]');
  await page.fill('#p-prin', '999999');
  await page.click('#sheet button[type=submit]'); await page.waitForTimeout(100);
  console.log('Over-repay error:', await text(page, '#sheet .form-error'));
  await page.click('#sheet [data-close]');
  // search and filters
  await page.evaluate(() => { location.hash = 'loans'; }); await page.waitForTimeout(100);
  await page.click('[data-act=loan-filter][data-v=behind]'); await page.waitForTimeout(50);
  console.log('Behind loans:', await text(page, '.list .row-title'));
  await page.fill('#loan-q', 'rithy'); await page.waitForTimeout(50);
  console.log('Search keeps focus:', await page.evaluate(() => document.activeElement.id), '| rows:', await page.locator('.list .row').count());
  // export
  await page.evaluate(() => { location.hash = 'more'; }); await page.waitForTimeout(100);
  await page.click('[data-act=export]'); await page.waitForTimeout(500);
  console.log('Export:', JSON.stringify(await page.evaluate(() => window.__saved || null)), '| toast:', await text(page, '#toast'));
  const b64 = await page.evaluate(async () => { const buf = new Uint8Array(await window.__savedBlob.arrayBuffer()); let s = ''; for (const x of buf) s += String.fromCharCode(x); return btoa(s); });
  fs.writeFileSync(path.join(out, 'export.xlsx'), Buffer.from(b64, 'base64'));
  // settings: switch rule to days
  await page.check('#s-days'); await page.click('#settings-form button[type=submit]'); await page.waitForTimeout(150);
  console.log('Settings doc:', JSON.stringify(await page.evaluate(() => window.__store.get('settings/main'))));
  // remove examples
  await page.click('[data-act=remove-examples]');
  await page.click('#ask-yes'); await page.waitForTimeout(800);
  const left = await page.evaluate(() => [...window.__store.keys()]);
  console.log('After removing examples:', left.length, 'docs:', left.filter(k => !k.startsWith('payments/')).join(', '), '+', left.filter(k => k.startsWith('payments/')).length, 'payments');
  await ctx.close();

  // 3. Phone width and dark mode
  ({ ctx, page } = await open({ viewport: { width: 390, height: 844 } }));
  await page.screenshot({ path: out + '/home-phone.png', fullPage: true });
  const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('Phone overflow home:', await overflow());
  for (const h of ['loan-lex4', 'titles', 'borrower-bexsophea', 'payments', 'more']) { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(100); console.log('Phone overflow', h, await overflow()); }
  await page.evaluate(() => { location.hash = 'loan-lex4'; }); await page.waitForTimeout(100);
  await page.screenshot({ path: out + '/loan-phone.png', fullPage: true });
  await page.click('.head-actions [data-act=pay]'); await page.waitForTimeout(100);
  await page.screenshot({ path: out + '/pay-phone.png' });
  await ctx.close();
  ({ ctx, page } = await open({ dark: true }));
  await page.screenshot({ path: out + '/home-dark.png', fullPage: true });
  await page.evaluate(() => { location.hash = 'loan-lex4'; }); await page.waitForTimeout(100);
  await page.screenshot({ path: out + '/loan-dark.png', fullPage: true });
  await ctx.close();

  // 4. Empty ledger and no runtime
  ({ ctx, page } = await open({}, {}));
  await page.screenshot({ path: out + '/empty.png', fullPage: true });
  await ctx.close();
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage(); await p2.goto(url); await p2.waitForTimeout(300);
  console.log('No runtime:', (await p2.locator('#view').innerText()).slice(0, 120));
  await browser.close();
  console.log('Console errors:', errors.length ? errors : 'none');
})().catch(e => { console.error(e); process.exit(1); });

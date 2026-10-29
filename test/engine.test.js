const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const code = src.split('/* ENGINE START */')[1].split('/* ENGINE END */')[0];
const E = vm.runInNewContext(code + '\nEngine;');
const eqJ = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const pays = (loanId, list) => list.map(([date, interest, principal = 0]) => ({ loanId, date, interest, principal }));

t('addMonths clamps month ends', () => {
  assert.strictEqual(E.addMonths('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(E.addMonths('2026-01-31', 2), '2026-03-31');
  assert.strictEqual(E.addMonths('2028-01-31', 1), '2028-02-29');
  assert.strictEqual(E.addMonths('2025-12-15', 1), '2026-01-15');
  assert.strictEqual(E.addMonths('2026-11-30', 3), '2027-02-28');
  assert.strictEqual(E.daysBetween('2026-09-01', '2026-10-27'), 56);
  assert.strictEqual(E.addDays('2026-10-27', 14), '2026-11-10');
});

const asOf = '2026-10-27';
t('up-to-date 2% loan', () => {
  const loan = { id: 'L3', startDate: '2026-04-10', principal: 5000, rate: 0.02, termMonths: 12 };
  const c = E.computeLoan(loan, pays('L3', [['2026-05-10', 100], ['2026-06-10', 100], ['2026-07-10', 100], ['2026-08-10', 100], ['2026-09-10', 100], ['2026-10-10', 100]]), asOf, 'full');
  assert.strictEqual(c.periods.length, 6);
  assert.strictEqual(c.interestCharged, 600);
  assert.strictEqual(c.interestOwed, 0);
  assert.strictEqual(c.status, 'active');
  assert.strictEqual(c.next.due, '2026-11-10');
  assert.strictEqual(c.next.interest, 100);
  assert.strictEqual(c.maturity, '2027-04-10');
  const q = E.payoffQuote(loan, pays('L3', [['2026-05-10', 100], ['2026-06-10', 100], ['2026-07-10', 100], ['2026-08-10', 100], ['2026-09-10', 100], ['2026-10-10', 100]]), asOf, 'full');
  eqJ(q, { principal: 5000, interest: 100, total: 5100 });
  const qd = E.payoffQuote(loan, pays('L3', [['2026-05-10', 100], ['2026-06-10', 100], ['2026-07-10', 100], ['2026-08-10', 100], ['2026-09-10', 100], ['2026-10-10', 100]]), asOf, 'days');
  assert.strictEqual(qd.interest, 54.84); // 17 of 31 days
  const qn = E.payoffQuote(loan, pays('L3', [['2026-05-10', 100], ['2026-06-10', 100], ['2026-07-10', 100], ['2026-08-10', 100], ['2026-09-10', 100], ['2026-10-10', 100]]), asOf, 'none');
  assert.strictEqual(qn.interest, 0);
});

t('partial repayment lowers later interest; late detection', () => {
  const loan = { id: 'L4', startDate: '2026-06-01', principal: 12000, rate: 0.02, termMonths: 6 };
  const c = E.computeLoan(loan, pays('L4', [['2026-07-01', 240], ['2026-08-01', 240, 2000]]), asOf, 'full');
  eqJ(c.periods.map(p => p.interest), [240, 240, 200, 200]);
  eqJ(c.periods.map(p => p.balance), [12000, 12000, 10000, 10000]);
  assert.strictEqual(c.interestOwed, 400);
  assert.strictEqual(c.outstanding, 10000);
  assert.strictEqual(c.firstUnpaid.due, '2026-09-01');
  assert.strictEqual(c.daysLate, 56);
  assert.strictEqual(c.monthsOwed, 2);
  assert.strictEqual(c.status, 'late');
  assert.strictEqual(c.next.due, '2026-11-01');
  assert.strictEqual(c.next.interest, 200);
});

t('3% loan past its due date but interest paid', () => {
  const loan = { id: 'L2', startDate: '2025-12-15', principal: 3000, rate: 0.03, termMonths: 6 };
  const list = []; for (let m = 1; m <= 10; m++) list.push([`2026-${String(m).padStart(2, '0')}-15`, 90]);
  const c = E.computeLoan(loan, pays('L2', list), asOf, 'full');
  assert.strictEqual(c.periods.length, 10);
  assert.strictEqual(c.interestOwed, 0);
  assert.strictEqual(c.maturity, '2026-06-15');
  assert.strictEqual(c.pastMaturity, true);
  assert.strictEqual(c.status, 'overdue');
  assert.strictEqual(c.next.interest, 90);
});

t('closed loan on the due date: no extra month', () => {
  const loan = { id: 'L1', startDate: '2025-11-05', principal: 2000, rate: 0.02, termMonths: 6 };
  const c = E.computeLoan(loan, pays('L1', [['2025-12-05', 40], ['2026-01-05', 40], ['2026-02-05', 40], ['2026-03-05', 40], ['2026-04-05', 40], ['2026-05-05', 40, 2000]]), asOf, 'full');
  assert.strictEqual(c.closed, true);
  assert.strictEqual(c.closedOn, '2026-05-05');
  assert.strictEqual(c.periods.length, 6);
  assert.strictEqual(c.interestOwed, 0);
  assert.strictEqual(c.status, 'closed');
  assert.strictEqual(c.next, null);
  assert.strictEqual(c.outstanding, 0);
});

t('payoff mid-month under each rule', () => {
  const loan = { id: 'X', startDate: '2026-01-01', principal: 1000, rate: 0.02 };
  const p = pays('X', [['2026-01-15', 0, 1000]]);
  const full = E.computeLoan(loan, p, asOf, 'full');
  assert.strictEqual(full.interestCharged, 20); assert.strictEqual(full.status, 'closed-owing'); assert.strictEqual(full.periods[0].partial, true);
  assert.strictEqual(E.computeLoan(loan, p, asOf, 'days').interestCharged, 9.03); // 14/31 of 20
  assert.strictEqual(E.computeLoan(loan, p, asOf, 'none').interestCharged, 0);
  assert.strictEqual(E.computeLoan(loan, p, asOf, 'none').status, 'closed');
});

t('by-the-day rule splits a month around a part repayment', () => {
  const loan = { id: 'Y', startDate: '2026-01-01', principal: 1000, rate: 0.02 };
  const c = E.computeLoan(loan, pays('Y', [['2026-01-16', 0, 500]]), '2026-03-01', 'days');
  eqJ(c.periods.map(p => p.interest), [14.84, 10]); // (1000*15 + 500*16)/31*2%, then 500*2%
});

t('interest paid ahead and due-soon', () => {
  const loan = { id: 'Z', startDate: '2026-09-30', principal: 1000, rate: 0.03 };
  const c = E.computeLoan(loan, pays('Z', [['2026-10-05', 30]]), asOf, 'full');
  // first month due 30 Oct is still upcoming and already covered
  assert.strictEqual(c.periods.length, 0);
  assert.strictEqual(c.interestOwed, -30);
  assert.strictEqual(c.next.paid, 30);
  assert.strictEqual(c.status, 'active');
  const c2 = E.computeLoan(loan, [], asOf, 'full');
  assert.strictEqual(c2.status, 'due-soon');
});

t('due today counts as owed, not late', () => {
  const loan = { id: 'D', startDate: '2026-09-27', principal: 2000, rate: 0.02 };
  const c = E.computeLoan(loan, [], asOf, 'full');
  assert.strictEqual(c.interestOwed, 40);
  assert.strictEqual(c.daysLate, 0);
  assert.strictEqual(c.status, 'due-today');
});

t('future start and bad data do not crash', () => {
  const c = E.computeLoan({ startDate: '2026-11-01', principal: 1000, rate: 0.02 }, [], asOf, 'full');
  assert.strictEqual(c.periods.length, 0); assert.strictEqual(c.next.due, '2026-12-01');
  const bad = E.computeLoan({ startDate: '', principal: 'abc', rate: null }, [{ date: 'x', interest: 5 }], asOf, 'full');
  assert.strictEqual(bad.valid, false); assert.strictEqual(bad.periods.length, 0);
  assert.strictEqual(E.payoffQuote({ startDate: '', principal: 0 }, [], asOf, 'full'), null);
});

t('long running loan stays fast', () => {
  const t0 = Date.now();
  for (let i = 0; i < 300; i++) E.computeLoan({ startDate: '2016-01-01', principal: 10000, rate: 0.02 }, [], asOf, 'full');
  assert.ok(Date.now() - t0 < 2000);
});
console.log(n, 'engine tests passed');

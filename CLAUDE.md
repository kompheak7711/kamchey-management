# KamChey Management

Single-file web app (`index.html`, vanilla JS, no build step) published as a private claude.ai artifact. The artifact's database holds the owner's real loan records, so:

- Republish only to the existing artifact URL (kept in project memory, not in this public repo). A new artifact means an empty database.
- Omit `capabilities` when republishing so the db, user, assets and downloads declarations carry forward.
- Never commit real borrower, loan or payment data. `test/seed.json` holds made-up examples only.

Interest model (the owner's rules): monthly rate per loan on the balance still owed at the start of each month; interest-only payments with the principal repaid at the end (part repayments allowed); interest payments fill the oldest month first; the final partial month follows `settings/main.partialMonth` (full, days or none, default full). The engine lives between `/* ENGINE START */` and `/* ENGINE END */`.

Before publishing, run `npm test`: `test/engine.test.js` checks the interest math in Node, and `test/run.js` drives every screen in Playwright with `test/mock.js` standing in for the claude.ai runtime. Check that it ends with `Console errors: none` and zero phone overflow.

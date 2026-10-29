# KamChey Management

A private loan book for lending money against land and house titles (ប្លង់). It keeps each borrower's contact details, every loan and the interest it earns each month, the payments received, and the title papers held as collateral.

The whole app is one file, `index.html`. It runs as a private artifact on claude.ai, and claude.ai stores the records. **This repository holds no loan, borrower or payment records.** It holds only the code and made-up example data for the tests.

## Screens

- **Home**: who is late, which title papers are ready to give back, and the interest due in the next two weeks.
- **Loans**: each loan's monthly schedule, what is owed today and the amount to pay it off.
- **Titles**: every title paper held, where it is kept, photos, and when it was given back.
- **Borrowers**: phone numbers, address, ID number and a guarantor for each borrower.
- **Payments**: every payment received.
- **More**: the default rate, the partial-month rule, an Excel export and removing the example loans.

## How interest works

- Each loan has its own monthly rate (2% by default, or 3%, or any other rate).
- Each month's interest is the rate times what is still owed at the start of that month.
- Borrowers pay interest monthly and repay the loan amount at the end, in full or in parts. A part repayment lowers the interest from the next month on.
- Interest payments go to the oldest unpaid month first.
- When a loan is repaid partway through a month, the app charges the full month by default. Under More you can switch to charging by the day, or to charging nothing for that month.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The app: screens, interest engine and Excel export |
| `test/engine.test.js` | Checks the interest math |
| `test/run.js` | Walks through every screen in a headless browser with the example loans, prints what it sees and saves screenshots to `test/shots/` |
| `test/mock.js` | Stands in for the claude.ai runtime (database, files, downloads) during `run.js` |
| `test/seed.json` | The example loans used by `run.js` |
| `test/make_seed.py` | Rebuilds `seed.json` |

## Running the tests

You need Node.js 20 or later.

```sh
npm install
npx playwright install chromium
npm test
```

`npm run test:engine` runs only the interest checks, which need nothing but Node.

## Updating the live app

1. Edit `index.html`.
2. Run `npm test`.
3. Ask Claude to republish it to the same artifact link.

Always republish to the same link. Your records belong to that artifact, so publishing as a new artifact starts with an empty loan book.

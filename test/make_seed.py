import json, os
now = "2026-10-27T20:30:00.000Z"
docs = {}
def add(path, **kw):
    kw.setdefault("createdAt", now); kw.setdefault("updatedAt", now); kw["example"] = True
    docs[path] = kw
add("borrowers/bexsophea", name="Sophea Chan (example)", phone="012 345 678", phone2="Telegram @sophea_c", address="Street 1986, Sen Sok, Phnom Penh", idNumber="010203040", guarantorName="Dara Chan (brother)", guarantorPhone="011 222 333", notes="")
add("borrowers/bexrithy", name="Rithy Sok (example)", phone="017 888 999", phone2="", address="Ta Khmau, Kandal", idNumber="020304050", guarantorName="Srey Sok (wife)", guarantorPhone="015 444 555", notes="")
add("borrowers/bexmalis", name="Malis Kim (example)", phone="096 111 222", phone2="Telegram @maliskim", address="Svay Dangkum, Siem Reap", idNumber="030405060", guarantorName="", guarantorPhone="", notes="")
add("loans/lex1", number=1, borrowerId="bexsophea", startDate="2025-11-05", principal=2000, rate=0.02, termMonths=6, notes="")
add("loans/lex2", number=2, borrowerId="bexmalis", startDate="2025-12-15", principal=3000, rate=0.03, termMonths=6, notes="Asked for two more months to repay.")
add("loans/lex3", number=3, borrowerId="bexsophea", startDate="2026-04-10", principal=5000, rate=0.02, termMonths=12, notes="")
add("loans/lex4", number=4, borrowerId="bexrithy", startDate="2026-06-01", principal=12000, rate=0.02, termMonths=6, notes="")
i = 0
def pay(loan, date, interest, principal=0, method="Cash"):
    global i; i += 1
    add(f"payments/pex{i:02d}", loanId=loan, date=date, interest=interest, principal=principal, method=method, notes="")
for m in ["2025-12-05", "2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05"]: pay("lex1", m, 40)
pay("lex1", "2026-05-05", 40, 2000)
for k in range(1, 11): pay("lex2", f"2026-{k:02d}-15", 90, 0, "ABA" if k % 2 else "Cash")
for k in range(5, 11): pay("lex3", f"2026-{k:02d}-10", 100, 0, "ABA")
pay("lex4", "2026-07-01", 240)
pay("lex4", "2026-08-01", 240, 2000)
def title(tid, loan, kind, doc, no, owner, loc, size, value, recv, kept):
    add(f"titles/{tid}", loanId=loan, kind=kind, docType=doc, titleNumber=no, ownerName=owner, location=loc, sizeM2=size, value=value, receivedDate=recv, keptAt=kept, status="Held", photos=[], notes="")
title("tex1", "lex1", "House", "Hard title", "EX-04-1188", "Sophea Chan", "Sen Sok, Phnom Penh", 96, 25000, "2025-11-05", "Office safe")
title("tex2", "lex2", "Land", "Soft title", "EX-07-2210", "Malis Kim", "Svay Dangkum, Siem Reap", 450, 9000, "2025-12-15", "Office safe")
title("tex3", "lex3", "Land", "Hard title", "EX-12-0345", "Sophea Chan", "Sen Sok, Phnom Penh", 300, 40000, "2026-04-10", "Bank safe box")
title("tex4", "lex4", "Land and house", "Hard title", "EX-08-7781", "Rithy Sok", "Ta Khmau, Kandal", 220, 60000, "2026-06-01", "Office safe")
json.dump(docs, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed.json"), "w"), indent=1)
print(len(docs), "docs")

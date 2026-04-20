# E-Max Loan Manager — User Guide

A simple loan manager for E-EMAX Enterprise.

---

## Explain-it-to-my-mother version

You're using E-Max to keep track of money you lend out. The app does four things for you, every day:

1. **Remembers who owes you what.** No more notebook pages. Every loan, every payment, all in one place.
2. **Does the math.** Enter the amount you lent and how many months. The app computes interest, the monthly payment, and the total to collect. You don't have to calculate anything by hand.
3. **Reminds your customers to pay.** Tap the green WhatsApp circle on any loan card and a polite message opens, already typed out. You decide whether to send it.
4. **Shows you how your business is doing.** The Analytics screen answers: *How much did I collect this month? Who are my best customers? How many loans are overdue?*

That's the whole app. Everything else is detail.

---

## The main screens

### Dashboard
The home screen. Shows today's numbers:
- **Active loans** — how many loans are currently being paid back
- **Collected this month** — money that came in since the 1st
- **Outstanding** — money still owed across everyone
- **Due this week** — loans with a payment due in the next 7 days

### Loans
Every loan you've ever given. Sort by status (Active, Overdue, Completed, Defaulted). Tap any loan to see details, record a payment, or send a WhatsApp reminder.

### Scan
Use your phone camera to OCR a paper loan document. Useful if you have old paper records you want to digitise. After scanning, review the fields — OCR is not perfect — then save.

### Applications
When you send someone an enrollment link (see Settings), they fill out their details on their own phone. Their application lands here. You review and approve, then a loan record is created.

### Borrowers
Your address book. Every person you've ever lent to. Tap to see their loan history and current balance.

### Analytics
Charts. Monthly Collections. Loans Issued per month. Status breakdown. Top 10 borrowers by total borrowed.

### Settings
Your business name, your name, your phone. Plus the About panel (app version, reminders info).

---

## How to add a loan (5 steps)

1. **Borrower** — name, phone, Ghana Card number, occupation. If you've lent to them before, type the first few letters of their name — the app will find them and skip the rest.
2. **Guarantor** — name, phone, relationship, Ghana Card (optional on the card number).
3. **Witness** — *optional*. Leave blank if there's no witness on the paper.
4. **Loan terms** — amount, duration in months, start date. The interest rate is fixed at 10%/month (the standard E-Max rate) and a 4% processing fee is added.
5. **Review** — check the numbers, tap Create.

After creation, the loan shows in the Loans list. Tap it to record payments, or tap the green WhatsApp circle to send a reminder.

---

## How to record a payment

1. Open the loan from the Loans list.
2. Tap **Record Payment**.
3. Enter the amount received. If it's less than the monthly payment, that's fine — it's recorded as a partial.
4. Tap Record. The balance updates immediately.

The app tracks late payments automatically based on the loan's monthly schedule. If a payment is late, a 10% penalty is added to that month.

---

## The WhatsApp reminder flow

On every loan card and loan detail page, when the borrower has a phone number, a green circle with a chat icon appears. Tap it.

WhatsApp opens on your phone with the customer's number and a message already written. The message matches the loan's state:

- **Overdue** → "Your loan is overdue and GH₵X is still outstanding. Please settle as soon as possible. Thank you."
- **Upcoming** → "Quick reminder — your monthly payment of GH₵X is coming up. Please get in touch if you need anything. Thank you."
- **Completed** → "Thank you for completing your loan with E-EMAX Enterprise. We appreciate you."

**You are in control.** The app does not send anything automatically. You read the message, edit it if you want, and tap send yourself. No spam, no accidents.

---

## The numbers that matter

**Interest** — 10% per month, flat. A GH₵1,000 loan for 3 months has GH₵300 of interest (10% × 3 months × 1,000).

**Processing fee** — 4%, paid up-front when the loan is issued. Optional; the toggle is on the Loan step. Some customers pay it, some don't.

**Late penalty** — 10% of the monthly payment, added when a payment is recorded after the due date.

**Monthly payment** = (principal + total interest) ÷ months.

**Total repayable** = principal + total interest. Excludes processing fee (which is paid separately up-front).

---

## Tips for daily use

- **Add the app to your home screen.** On iPhone Safari: Share → Add to Home Screen. On Android Chrome: ⋮ → Add to Home screen. Then it opens like a real app, fullscreen, and works offline.
- **Send reminders on Monday morning.** Loans are usually paid weekly or monthly. A gentle Monday nudge before the busy week gets the best response.
- **Record payments the same day.** Don't batch them at month-end. The analytics are only as good as the data you enter.
- **Review the Applications tab once a day.** If you've shared the enrollment link, new applications can come in any time.

---

## When something breaks

- Pull down from the top of the screen to refresh.
- If numbers look wrong, close the app and reopen it.
- To see the Diagnostics panel (checks database connection, auth, table counts, PWA status): long-press (hold for 1.5 seconds) on the "E-Max" brand logo in the sidebar.
- Still stuck? Your data is safe on Supabase — nothing is lost.

---

## What the app does *not* do

- It does **not** send messages by itself. You tap WhatsApp, you send.
- It does **not** accept payments electronically. Cash is cash. You record it.
- It does **not** connect to any bank or mobile money system. You can add that later if you want.
- It does **not** show ads, track you, or share your customers' data with anyone.

Built simple, on purpose.

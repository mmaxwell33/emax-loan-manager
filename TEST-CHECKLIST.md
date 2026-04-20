# Test Checklist

Run through this before shipping the refined build to production.

## Start the local server

```bash
cd /path/to/EMax-Loan-Manager/refined
./run-local.sh
# opens http://localhost:8080
```

If `python3` isn't available the script will fall back to Node's `http-server` (installs on the fly if needed).

## Smoke tests

### Auth & landing
- [ ] Page loads at `/` without console errors
- [ ] Sign-in with a known agent account succeeds
- [ ] Dashboard renders KPIs, not zeros (assuming the account has data)
- [ ] Sidebar brand reads "E-Max" / "E-EMAX Enterprise"
- [ ] Nav icons are Lucide SVGs (not emoji)

### Service worker
- [ ] DevTools → Application → Service Workers shows `sw.js` activated, cache name `emax-loans-v2`
- [ ] Disconnect network, refresh — app shell still loads
- [ ] All JS modules are in cache (check Application → Cache Storage)

### Dashboard
- [ ] "Collected this month" and "Outstanding" format in GH₵
- [ ] "Due this week" list renders
- [ ] "No payments due this week" shows empty state if applicable

### Loan wizard — happy path
- [ ] Step 1 (Borrower): name, phone, Ghana Card, occupation datalist autosuggests
- [ ] Step 2 (Guarantor): required fields block Next; optional card number allowed
- [ ] Step 3 (Witness): **label says "optional"**, no red asterisks, Next works with all fields blank
- [ ] Step 4 (Loan): interest rate is a locked 10% display with "standard E-Max rate" subtitle — no dropdown
- [ ] Step 5 (Review): shows principal, interest, total, monthly payment correctly
- [ ] Submit creates loan; no console errors; list refreshes

### Loan wizard — Ghana Card bug fix
- [ ] After creating a loan, query Supabase `borrowers` — `ghana_card_number` is populated (not null)
- [ ] Confirm the field was previously going to the wrong column name (`ghana_card`)

### Scanner
- [ ] Scan a document, approve, save — no Postgres errors in console
- [ ] Check `guarantors` and `witnesses` inserts completed (they were silently failing before because of `loan_id`)

### WhatsApp reminder
- [ ] Loan card shows a green circle chip when the borrower has a phone
- [ ] Tapping the chip opens `https://wa.me/233…?text=…` in a new tab
- [ ] The message reads "Hi {first name}, this is a friendly reminder from E-EMAX Enterprise…"
- [ ] Overdue loans get the overdue wording; upcoming loans get the upcoming wording; completed loans get the thank-you
- [ ] Loan detail page also shows a "Send WhatsApp reminder" button for non-completed loans
- [ ] Loan detail page does NOT show the button when borrower has no phone

### Analytics
- [ ] Chart titled "Monthly Collections (GH₵)" — not "Interest Earned"
- [ ] Bar colour is gold (`#D4A94A`), not indigo
- [ ] Status donut renders with gold, red, green, grey
- [ ] Top Borrowers table renders; initials avatar backgrounds are gold
- [ ] Changing the period dropdown rebuilds charts

### Settings
- [ ] **No** push-notification toggle
- [ ] "About reminders" info card explains the WhatsApp flow
- [ ] Diagnostics panel **not visible by default**
- [ ] Long-press (~1.5s) on the sidebar brand reveals Diagnostics in the About panel
- [ ] Save settings → toast "Settings saved" (no emoji)

### Enrollment flow
- [ ] `/enrollment.html?agent_id=…` loads with gold theme
- [ ] Form submit creates an application row
- [ ] Application appears in Scan → Applications tab
- [ ] Approve loads data into the loan wizard

### PWA install
- [ ] Chrome desktop: install prompt appears via address bar
- [ ] iOS Safari: Share → Add to Home Screen → opens fullscreen
- [ ] Android Chrome: ⋮ → Install app → opens fullscreen
- [ ] App icon uses the gold brand colour

## Regression checks

- [ ] Payments page records payments correctly; late flag respects due date
- [ ] Late penalty = 10% of monthly payment
- [ ] Loan completion (amount_paid >= total_repayable) flips status to Completed
- [ ] Borrowers list search works
- [ ] Reports page exports without errors

## Visual QA

- [ ] No stray indigo `#5B5BD6` anywhere: `grep -r "5B5BD6\|5b5bd6\|rgba(91,91,214" css/ js/ index.html enrollment.html`
- [ ] No orphan emoji in main UI chrome (sidebar, nav, card titles, wizard steps)
- [ ] Focus ring is gold on inputs
- [ ] Safe-area bottom padding visible on iOS (no content under the home-indicator bar)

## Sign-off

When all checks pass, rename `refined/` to the live directory (or deploy `refined/*` over the existing files). Bump the service worker version number if you merge any further JS changes.

# E-Max Loan Manager — Phase 2 Refinement Diff Summary

Scope: `/refined/` is a parallel folder. Originals in the project root are untouched.

---

## Files changed

| File | Type of change |
|---|---|
| `css/app.css` | Brand tokens swapped indigo → gold; new component styles; iOS safe-area |
| `index.html` | Lucide icon library wired in; emoji replaced; settings reorganised; interest rate locked; witness step marked optional; occupation converted to datalist; long-press diagnostics |
| `enrollment.html` | Brand tokens swapped indigo → gold (same palette as main app) |
| `sw.js` | v2 cache; missing assets added; push listeners removed |
| `js/scanner.js` | Bug fix: `ghana_card` → `ghana_card_number`; remove invalid `loan_id` on guarantors/witnesses |
| `js/analytics.js` | Bug fix: fudged interest math replaced with truthful “Monthly Collections”; chart colours gold |
| `js/dashboard.js` | Brand colour swap (indigo → gold) |
| `js/loans.js` | WhatsApp reminder chip + button; witness step optional; emoji titles cleaned; Lucide repaint hooks |
| `js/settings.js` | Push-notification toggle removed; diagnostics rendered via new styled rows |

## Files deleted (from `/refined`)

- `guide.html` — orphan file, no entry point reached it. See HANDOFF.md.

---

## The four table-stakes bug fixes

### 1. Scanner insert field name mismatch (`scanner.js:457`)

Before:
```js
await sb.from('borrowers').insert({ …, ghana_card: ghanaCard, … });
```
After:
```js
await sb.from('borrowers').insert({ …, ghana_card_number: ghanaCard, … });
```
The schema column is `ghana_card_number`. Old code silently dropped the field.

### 2. Scanner inserting non-existent `loan_id` (`scanner.js:497, 509`)

Before the guarantors/witnesses inserts passed `loan_id`. The schema only has `borrower_id`. Rows were rejected by Postgres; the previous version hid the error. Removed.

### 3. Fake interest math in analytics (`analytics.js:82`)

Before:
```js
values.push(total * 0.0909); // pretend 9.09% of collections is interest
```
After: the chart now shows actual monthly collections and is labelled "Monthly Collections (GH₵)". True interest earned is computed per-loan in `_renderKPIs` using `total_interest / total_repayable`.

### 4. Service worker cache list (`sw.js`)

Before: STATIC_ASSETS missing `analytics.js`, `scanner.js`, `team.js`. A fresh install or after-update could serve stale code for those modules. After: every JS module is in STATIC_ASSETS; cache name bumped to `emax-loans-v2` to force refresh. Push event listeners deleted (no push server exists, no subscriptions exist).

---

## The five product decisions

### Brand identity
- User-facing name: **E-Max**
- Legal/footer: **E-EMAX Enterprise**
- Primary accent: warm gold `#D4A94A` (replaces indigo `#5B5BD6`)
- Hover: `#E8C474`
- Rationale: gold is consistent with Ghana micro-finance branding cues, reads well on the dark theme, and differentiates from the dozens of indigo fintech apps.

### Reminders: WhatsApp deeplink, not fake push
Every loan card now has a small WhatsApp chip next to the status dot. Tapping it opens WhatsApp with a pre-filled message — overdue, upcoming, or thank-you, based on the loan state. Flow:

```
Overdue  → "Your loan is overdue and GH₵X is still outstanding…"
Upcoming → "Quick reminder — your monthly payment of GH₵X is coming up…"
Done     → "Thank you for completing your loan…"
```

Phone numbers are normalised to the `233xxxxxxxxx` format expected by `wa.me/` (handles `0xxxxxxxxx` and raw inputs). Message is URL-encoded.

### Icons: Lucide, not emoji
Emoji in the UI chrome (nav, sidebar, card titles, CTAs, steps) replaced with Lucide SVGs. Lucide renders crisply, theme-tints with `currentColor`, and is one small CDN include. `paintIcons()` is called at boot and after DOM mutations.

A handful of emoji remain in toast bodies (e.g., "Loan fully repaid!") and in `borrowers.js` empty states. These are low-stakes, non-blocking, and listed in HANDOFF.md for a follow-up pass.

### Cuts
- `guide.html` (orphan) — removed
- Push-notification toggle in Settings — removed
- Custom interest rate dropdown — replaced with a locked 10%/month display and a hidden input (preserves field ID so any consumer code keeps working)
- Diagnostics panel — hidden by default, revealed via a 1.2-second long-press on the sidebar brand

### Soft-keeps
- **Witness step** — kept but marked "optional". No red asterisks. Submit does not require witness data. In Ghana micro-finance, witnesses are sometimes formal, sometimes a neighbour writing their name; forcing it was blocking real loans.
- **Occupation** — kept as free-text `<input list="occupation-suggestions">` with a `<datalist>` of 12 common Ghana occupations (Trader, Farmer, Teacher, Driver, Hairdresser, Mechanic, Tailor, Electrician, Nurse, Shop Owner, Carpenter, Mason). Autocompletes without forcing.

---

## Design-token changes (`css/app.css`)

```css
:root {
  --accent:      #D4A94A;   /* primary gold  */
  --accent2:     #E8C474;   /* hover / bright gold */
  --accent-soft: rgba(212,169,74,0.14);
  --text3:       #5b6572;
  --num-font:    -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

Every `rgba(91,91,214, x)` became `rgba(212,169,74, x)`. Auth background gradient moved from blue-tinted to warm amber (`#1a1408 → #261c05`). The auth-glow uses `rgba(212,169,74,0.15)` for the same luminous feel without the indigo tone.

---

## Verification

Run `./run-local.sh` (see TEST-CHECKLIST.md) to start a static server on port 8080. Then work through the manual checklist. No new JS dependencies. No schema migration. All changes are drop-in on top of the existing Supabase project.

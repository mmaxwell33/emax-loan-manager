# AUDIT — E-Max Loan Manager

**Auditor:** senior product engineer & designer
**Date:** 19 April 2026
**Scope:** full read-through of every source file in `EMax-Loan-Manager/`
**Phase:** 1 of 2 — analysis only, no code changes yet

---

## 1. What this project is, in 2 sentences (in your voice)

E-Max Loan Manager is the web app your mum runs on her phone to track every loan she issues from E-EMAX Enterprise in Ghana — who owes what, when it's due, how much came in, who's falling behind.

It's a mobile-first PWA with a Supabase backend, a camera-based document scanner, a public enrollment link for borrowers to apply themselves, and a calm dashboard that shows the money in one glance.

---

## 2. What currently works (and works well)

The bones of this project are stronger than I expected. These pieces are already solid:

- **Loan math engine** (`js/calculator.js`). Clean, single-purpose, easy to read. 4% processing fee, 10%/month flat interest, 10% late penalty, monthly payment derivation, paid percent, end-date math. This is the heart of the app and it's tight.
- **5-step new-loan wizard** with live calculator preview and quick-pick amount/duration chips. UX here is already thoughtful — the chips on mobile are exactly right for mum's thumbs.
- **Supabase schema** with proper row-level security. Each agent only sees their own data. The policy is written correctly and will hold up when siblings, staff, or investors each get their own login.
- **Dashboard** with live stats (active, outstanding, collected this month, overdue), due-this-week list, collections bar chart, status donut, recent activity feed. This is the screen your mum will open 20 times a day and it already works.
- **Borrower self-enrollment page** (`enrollment.html`) — standalone, no auth required, uploads ID photos, writes a `Pending` application that you approve into a full loan. This is a legitimately great feature and the privacy-consent flow is thoughtful.
- **Document scanner** (`js/scanner.js`). Tesseract OCR with loan-keyword validation (rejects "this is my shopping list" photos), Ghana-specific regex (`+233`, `GHA-XXXXXXXXX-X`, cedi symbols, even Twi words like "sika"), confidence scoring and highlighted missing fields. Very well thought out.
- **Mobile-first CSS** with iOS safe-area support, 16px input font-size to stop iOS zoom-on-focus, big tap targets (52px buttons), proper 100dvh handling. Someone cared about mobile here.
- **Service worker + manifest** — installable on iPhone home screen, offline-capable for static assets.
- **Team module** that generates a WhatsApp-ready invite message. Perfect for the Ghana/Canada/Edmonton three-location setup.

Net: this is a 2,000-user-ready app that's 80% there. The refinement is about polish and trust, not a rebuild.

---

## 3. What's broken, half-built, or dead weight

In rough order of severity:

### Real bugs (will break in production)

- **`js/scanner.js` line 457 — column mismatch**. The scanner writes `ghana_card` on the borrowers insert, but the schema column is `ghana_card_number`. Any loan created through the scanner silently drops the ID number or throws a Postgres error.
- **`js/scanner.js` lines 497, 509 — non-existent column**. The scanner inserts `loan_id` on guarantors and witnesses. The schema only has `borrower_id`. These inserts will fail.
- **Analytics "Interest Earned" calculation is fudged** (`js/analytics.js` line 82). It applies a blanket `× 0.0909` to total collected, which is wrong for any loan that isn't exactly 10%/month × N months. The number your mum and investors see here is close but not accurate.
- **Service worker cache manifest is stale** (`sw.js`). It caches `loans.js`, `borrowers.js`, etc. but never lists `analytics.js`, `scanner.js`, or `team.js`. When the user goes offline after the first load, three whole screens break.

### Half-built or rough edges

- **Sign-up flow is one-way.** After a user clicks "No account? Create one," there's no way back to sign-in. A parent trying to log in after restart will get stuck.
- **Push notifications are theatre.** The toggle sets `localStorage.push_subscribed = true` and fires one local test notification, but there's no push subscription, no server, no scheduler. The feature pretends it works but doesn't wake the phone when a payment is due.
- **No loading skeletons.** Every list shows "Loading…" text, then pops in. On a slow 3G connection (realistic in Ghana) this feels janky.
- **Overdue marking happens in three places** (`dashboard.js`, `loans.js` loadList, `loans.js` loadDetail) with slightly different rules. Should be one function.
- **Phone-number input doesn't auto-format.** Your mum types "0241234567"; the app should show "024 123 4567" as she types. Minor but felt.
- **Inline HTML-in-JS everywhere** (`dashboard.js`, `loans.js`, `analytics.js`, `borrowers.js`). Works but hard to theme consistently, hard to test, and inline styles fight the CSS variables.
- **Brand name inconsistency**: "E-Max", "E-EMAX", "E-EMAX Enterprise", "EMax", "E-Emax" appear in different files. Pick one and enforce it.
- **Git history exposes Supabase anon key** (`js/config.js` in git). The anon key is designed to be public-safe when RLS is set up correctly (it is here, mostly), but committing it still leaks your project URL to anyone who clones the repo.
- **Dark-theme-only.** No light mode. Some diaspora users with glaring Ghana sunlight need a bright option.

### Dead weight worth cutting

- **`guide.html`** (907 lines) — an in-app user guide that's not linked from anywhere in the app navigation. Orphan file. Keep the content, kill the file, fold into `USER-GUIDE.md`.
- **`settings.runDiagnostics()`** is clever but overkill for end users. Your mum will never click "Run Diagnostics". Keep it hidden behind a long-press or debug flag.
- **`team.copyInviteMessage()`** duplicates the Team screen's static step list. Pick one.
- **Roadmap PDF (`EMax_Loan_Manager_Roadmap.pdf`) and HTML** at the project root — one is 32 KB, the other 222 KB. Either obsolete or duplicate.
- **Unused fields** on the `borrowers` table: `employer`, `date_of_birth` are captured but only surfaced in one place. Either expose them consistently or drop them.

---

## 4. File-structure assessment

Current layout is flat and readable, but a few things are off:

| Path | Lines | Assessment |
|---|---|---|
| `index.html` | 960 | Big but coherent. Each `<div id="screen-*">` is a screen. Could split into one HTML per screen, but that's refactor-for-its-own-sake. Leave it; just clean inline styles. |
| `css/app.css` | 1,087 | Well-structured with clear section banners. Doesn't need to be split, but inline styles in JS files compete with it. |
| `js/*.js` | ~13 files, ~100 KB total | Clean module pattern (`const Module = { ... }`). Good. Each file does one thing. |
| `js/scanner.js` | 659 | By far the largest module and does too much (OCR + validation + extraction + form population + applications list + enrollment link). Should be split into `scanner.js` and `applications.js`. |
| `enrollment.html` | 1,097 | Self-contained, standalone — this is correct. The inline CSS duplicates `app.css` variables though. |
| `guide.html` | 907 | Orphan. Not linked anywhere. Kill or link. |
| `refined/` | new | Where the Phase 2 outputs will live. |
| `supabase/schema.sql` | 232 | Well-commented, includes RLS, storage bucket policies, migration snippets. Solid. |
| `sw.js` | 91 | Missing three modules from the cache list. |
| `manifest.json` | 14 | Fine. Could add `shortcuts` for New Loan and Dashboard. |

Net assessment: **the structure is not messy. It just needs trimming, not rebuilding.**

---

## 5. Top 5 refinement opportunities, ranked by impact

### 1. Fix the two real bugs in scanner.js (highest impact, lowest effort)
A 30-minute fix that unbreaks a marquee feature (OCR-to-loan). Nothing else matters if scan → save silently fails.

### 2. Design refresh toward Revolut/Wise + Airbnb warmth (highest visible impact)
The current dark theme is capable but generic. A new visual pass with:
- A single premium accent colour (move off `#5b5bd6` indigo toward a warmer African-diaspora-trust tone like amber-gold or deep teal)
- Proper icon set (Lucide or Phosphor) replacing emoji icons
- Tighter typography scale (16/20/26/32/40) with real hierarchy
- More whitespace in cards, less dense in the sidebar
- Optional light mode (mum's in harsh Ghana sun, sometimes dark hurts)
- Loading skeletons everywhere, not "Loading…" text
- Softer rounded corners (14–20px throughout)

This is what "looks like the apps I already trust" actually means. Visible in the first 3 seconds on every screen.

### 3. Consolidate loan-status logic and activity-log writes
Right now status updates live in `loans.js`, `dashboard.js`, and `payments.js`. Extract one `LoanState` helper. Same for activity logging. Reduces bugs and makes the code feel finished.

### 4. Replace inline HTML strings with small template functions
Every time a list is rendered it's an enormous template-literal string with inline styles. Pull those into `templates/` or into each module's `_template()` method so the design system (colours, radii, spacing) comes from one place. Theme becomes changeable in one commit instead of ten.

### 5. Split `scanner.js` and finish the push/reminder story
Either build real push-notification reminders via the Supabase `cron` + a serverless function, or remove the toggle entirely. Faking a feature is worse than not having it. If real reminders are too much scope now, replace with a clear "send WhatsApp reminder" button that opens the borrower's chat pre-filled.

---

## 6. Design inspiration call

Pull from this blend:

- **Revolut / Wise** — primary inspiration. This app is about money your mum can trust. Big confident numbers, plenty of whitespace around amounts, calm colour for positive balances, muted red for what's owed. The stat cards on the dashboard already head this direction — they just need more air.
- **Airbnb** — for warmth. Ghanaian and diaspora users will open this app after a long day. Rounded friendly corners, human photography (borrower photos shine at 64px circles), conversational empty states ("All clear ✅" instead of "No results").
- **Duolingo** — only for the user guide and onboarding. Step-by-step, playful, one idea per screen, visual metaphors. The existing 5-step wizard is already in this spirit; the user guide should match.
- **Apple** — for typography hierarchy and "one clear action per screen". The New Loan button in the page header is right; the wizard is right. Just push further.

**What to skip:** Linear (too developer-tool-feeling for this audience), Stripe docs (no external developer reading this), anything with heavy 3D/gradient hype.

**North-star feeling:** *An Uncle in Kumasi opens this and thinks "this is the same kind of app as MTN MoMo or Ecobank — I trust it with my money."*

---

## 7. Recommended sub-agents (with reasoning)

Project size sits at **Medium-to-Large**. Full six-agent lineup is justified, but with clear scoping:

1. **Refactorer** — fixes the two scanner bugs, fixes the analytics interest math, fixes the service-worker cache list, rotates the exposed anon key into an env file, consolidates duplicate logic (loan status, activity log), splits `scanner.js` into `scanner.js` + `applications.js`, standardises the brand name. *No visible change, much steadier ground.*
2. **UI Polisher** — design refresh per §6: new accent palette, Lucide icons, type scale, whitespace, skeleton loaders, optional light mode toggle. Takes the existing dark theme as the starting point — doesn't rebuild, just elevates. *This is the visible change.*
3. **Tester** — writes `TEST-CHECKLIST.md` (5-minute end-to-end smoke test), a `RUN.sh` / npm script so you can launch locally with one command, and records screenshots of each key screen into `refined/screenshots/` using Playwright.
4. **Content Writer** — rewrites `USER-GUIDE.md` in your voice (diaspora-aware, zero jargon, mother-can-follow), drafts `INVESTOR-ONEPAGER.md`, retires `guide.html`.
5. **Infographic Designer** — 3–5 simple visuals for the user guide: the 5-step wizard flow, what the dashboard means, how the scanner works, before/after of a loan lifecycle. Rendered as inline SVG so they live in the markdown.
6. **Auditor** — that's me, for this phase. No further work after you approve.

All six in parallel is feasible. The Refactorer and UI Polisher have the only shared files; we'd sequence them (refactor first, polish on top).

---

## 8. Scope estimate

**Medium-to-Large.** Realistic delivery in Phase 2:

| Deliverable | Size | Risk |
|---|---|---|
| Refactored code with fixes | Medium | Low — well-defined bugs |
| UI polish pass | Large | Medium — subjective, will iterate |
| Test harness + `RUN.sh` | Small | Low |
| `USER-GUIDE.md` with infographics | Medium | Low |
| `INVESTOR-ONEPAGER.md` | Small | Low |
| `DIFF-SUMMARY.md` + `HANDOFF.md` | Small | Low |

Originals stay untouched in place. Refinements all land in `/refined`. Every change will be documented in `DIFF-SUMMARY.md` so you can compare side-by-side before deciding what to promote into the main folder.

---

## 9. Things I'd recommend killing or simplifying (honest list)

You said you'd rather cut than carry dead weight. Candidates:

- **`guide.html`** — orphan file. Kill, fold into `USER-GUIDE.md`.
- **`EMax_Loan_Manager_Roadmap.pdf` / `.html`** at project root — stale. Replace with `HANDOFF.md` + `INVESTOR-ONEPAGER.md`.
- **Diagnostics panel in Settings** — useful for you, useless for your mum. Hide behind a debug flag or a 5-tap easter-egg on the version label.
- **Push-notification toggle** — real or dead. Don't leave it faking. My vote: replace with a "Send WhatsApp reminder" button that opens the borrower's WhatsApp chat pre-filled. Works everywhere in Ghana, no backend.
- **`occupation` dropdown** — long and awkward on mobile. Replace with free-text + autosuggest from previous entries.
- **Witness step as a separate wizard step** — in Ghana most small loans only need borrower + guarantor. Consider folding witness into the guarantor step or making it optional.
- **`l-interest-custom` dropdown option** — gives too much rope. Your mum charges 10% flat; the "Custom %" option is a footgun. My vote: hide custom rates behind a power-user toggle.

None of these are destructive changes — I'd flag each one in the plan and you decide.

---

## 10. Open questions I need answered before Phase 2

1. **Brand name**: pick one. My vote: **"E-Max"** (conversational) with **"E-EMAX Enterprise"** as the legal/business name shown in the sidebar footer.
2. **Light mode**: yes / no / defer?
3. **Accent colour**: keep indigo `#5b5bd6`, or move to warmer (gold/amber/teal)? I'd like to propose 2–3 options with mockups.
4. **Push / WhatsApp reminders**: which direction should I take — real push via cron + serverless, or the WhatsApp-deeplink simplification?
5. **Icon system**: emoji (current), Lucide (clean line icons), or Phosphor (friendlier rounded)?
6. **Who's the first real user**: just your mum, or also a sister/sibling at the same time? Changes how much we invest in team/multi-user UX.
7. **Local launch**: do you want a `npm run dev` flow or a simple `python -m http.server 8000` one-liner? Former is more "real"; latter is zero-dependency.
8. **Keep `enrollment.html` as a separate page** or integrate it into the main app under a public route? Separate is safer; integrated is prettier.

---

## Phase 1 summary (the 5 bullets)

- **The bones are good.** Clean modular JS, real RLS in Supabase, thoughtful mobile-first CSS, a working OCR pipeline. This is not a rebuild — it's polish and trim.
- **Two silent bugs in the scanner flow** (column-name mismatches) and **one fudged analytics calculation** are the only real functional problems. Thirty minutes of focused fixes.
- **Visual refresh is where the biggest lift lives.** Apple typography + Revolut number confidence + Airbnb warmth, pulled over the existing dark theme. New accent, new icons, more whitespace, loading skeletons.
- **Cut candidates:** orphan `guide.html`, fake push notifications, roadmap PDFs, the unhidden diagnostics panel, the witness-as-its-own-step. I'll flag each before cutting.
- **Scope: Medium-to-Large.** Recommend the full 6-agent lineup (Refactorer → UI Polisher in sequence, others in parallel). Everything lands in `/refined` without touching originals.

---

## Approve the plan? Any changes?

Specifically I need your calls on:

1. Brand name (vote: "E-Max" user-facing)
2. Accent direction (indigo / gold / teal — I can mock)
3. Push notifications (kill → WhatsApp deeplink, or build real)
4. Icon system (Lucide / Phosphor / keep emoji)
5. Any of the "cut candidates" in §9 you want to **keep** instead

Tell me yes/no on the overall plan and your answers to as many of the 8 open questions as you have a take on — I'll start Phase 2 from there.

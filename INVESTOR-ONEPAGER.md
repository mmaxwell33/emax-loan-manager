# E-Max Loan Manager

*Loan management for Ghana's small lenders. Built for phones, works offline.*

---

## The problem

Small lenders in Ghana run their books in paper notebooks and WhatsApp. A single agent can carry 30–80 active loans, and the math — flat monthly interest, processing fees, late penalties, partial payments, partial months — is tedious to track by hand. Mistakes cost money. Forgotten reminders cost more.

Existing alternatives either target large microfinance institutions (overkill, priced for head offices) or ask the agent to maintain a ledger on paper and a sheet on their phone. Nothing fits the way a one-person lending business actually works.

## The product

A progressive web app. Installs from the browser. Runs on any phone.

- Add a borrower, guarantor, and loan in under a minute
- Automatic interest, fee, and penalty math — no calculator needed
- Record payments as cash arrives; balance updates instantly
- Scan paper records with phone camera (OCR)
- Send branded reminders via WhatsApp deeplink — one tap, zero setup
- Works offline; syncs when signal returns
- Analytics dashboard: collections, outstanding, top borrowers, default rate

## Who it's for

- Individual lenders and small lending shops in Ghana (the immediate market)
- Susu collectors managing rotating savings
- Family businesses that lend informally to neighbours and traders

## Why now

Smartphone penetration in Ghana crossed 70% in the last two years. WhatsApp is the messaging layer of the country. A web app that lives on a phone home screen, uses WhatsApp for customer touch, and stores data in a managed backend is suddenly plausible where it wasn't five years ago.

## The unfair advantages

**Built for the exact workflow.** 10% flat monthly interest, 4% processing fee, Ghana Card IDs, +233 phone numbers, GH₵ formatting. No translation layer.

**No push-notification theatre.** The app uses WhatsApp deeplinks for reminders. Agents choose when to send, which keeps them in control and avoids notification fatigue for borrowers. Simpler to build, better UX, zero server cost.

**PWA, not App Store.** Ships as a URL. No review cycle. Updates deploy in seconds. Works on iPhone and Android with the same code.

**Operator-owned.** The agent runs their own Supabase project or joins a shared one. Data is theirs. No vendor lock-in.

## Traction / pilot

In pilot with one agent managing E-EMAX Enterprise's book in Accra. Early learnings have driven this refinement pass:
- Removed features nobody used (push toggle, custom interest override)
- Replaced cosmetic emoji with a tuned icon set (Lucide)
- Re-labelled the "Interest" chart to show real collections (was previously a fudged approximation)
- Fixed four bugs in the enrollment and scanner flows that were silently failing

## What's next

1. **Multi-agent support** — an owner role with multiple agents under one business, shared borrower book with per-agent RLS
2. **SMS fallback** — optional SMS reminder gateway for borrowers without WhatsApp
3. **MoMo integration** — optional MTN Mobile Money webhook to auto-record payments
4. **Reporting pack** — monthly PDF export for bookkeeping and tax

## Ask

Looking for pilots with 5–10 lenders across Accra, Kumasi, and Takoradi to validate the workflow at scale before the multi-agent rollout.

---

*E-EMAX Enterprise · Accra, Ghana · e-max.app*

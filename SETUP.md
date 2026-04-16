# E-Max Loan Manager — Setup Guide
**Get the app live in ~20 minutes. Follow each step exactly.**

---

## STEP 1 — Set Up the Database (Supabase)

1. Go to **supabase.com** and sign in
2. Click your project → click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file `supabase/schema.sql` (in this folder)
5. Copy ALL the contents and paste into the SQL editor
6. Click **Run** — you should see "Success"

---

## STEP 2 — Get Your API Keys

1. In Supabase, go to **Project Settings** → **API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (long text starting with `eyJ…`)

---

## STEP 3 — Add Keys to the App

1. Open the file `js/config.js` (in this folder)
2. Replace `'https://YOUR_PROJECT_ID.supabase.co'` with your URL
3. Replace `'YOUR_ANON_KEY_HERE'` with your anon key
4. Save the file

---

## STEP 4 — Deploy to Vercel (free hosting)

1. Go to **github.com** and create a new repository called `emax-loan-manager`
2. Upload all the app files to GitHub
3. Go to **vercel.com** → sign in with GitHub
4. Click **New Project** → select your repository
5. Click **Deploy** — it goes live in ~60 seconds
6. You get a URL like `https://emax-loan-manager.vercel.app`

---

## STEP 5 — Create Your Account

1. Open the app URL in **Safari** (on iPhone) or Chrome (on Mac/Android)
2. Click **"No account? Create one"**
3. Enter your email and password
4. Check your email and click the confirmation link
5. Sign in — you're in!

---

## STEP 6 — Install on Mom's iPhone

1. Open the app URL in **Safari** on the iPhone
2. Tap the **Share** button (box with arrow at bottom of screen)
3. Tap **"Add to Home Screen"**
4. Tap **Add**
5. The app icon appears on the home screen — tap it and it opens like a real app!

---

## STEP 7 — Enable Supabase Email Auth

1. In Supabase go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Under **Authentication** → **Email Templates** you can customise the confirmation email

---

## Business Rules Configured

| Rule | Value | Where to change |
|------|-------|-----------------|
| Processing Fee | **4%** of principal | `js/config.js` → `PROCESSING_FEE_RATE` |
| Monthly Interest | **10%** per month | `js/config.js` → `MONTHLY_INTEREST_RATE` |
| Late Penalty | **10%** of monthly payment | `js/config.js` → `LATE_PENALTY_RATE` |
| Max Loan Duration | **12 months** | `js/config.js` → `MAX_DURATION_MONTHS` |

---

## Files in This Project

```
EMax-Loan-Manager/
├── index.html          ← The whole app (all screens)
├── manifest.json       ← Makes it installable on phone
├── sw.js               ← Offline support
├── css/
│   └── app.css         ← All styles (dark theme)
├── js/
│   ├── config.js       ← ⚠️ PUT YOUR SUPABASE KEYS HERE
│   ├── app.js          ← Navigation & routing
│   ├── auth.js         ← Login / logout
│   ├── calculator.js   ← Loan math engine
│   ├── loans.js        ← Create & manage loans
│   ├── borrowers.js    ← Borrower profiles
│   ├── payments.js     ← Record payments
│   ├── dashboard.js    ← Dashboard stats
│   ├── reports.js      ← Monthly reports
│   └── settings.js     ← Settings & diagnostics
├── icons/
│   ├── icon-192.png    ← App icon (phone home screen)
│   └── icon-512.png    ← App icon (larger)
└── supabase/
    └── schema.sql      ← Run this in Supabase first
```

---

## If Something Doesn't Work

Open the app → tap the ⚙️ icon → scroll down → tap **"Run Diagnostics"**

This will check every part of the system and show you exactly what's wrong.

---

*Built with ❤️ for Mom — E-Max Enterprise*

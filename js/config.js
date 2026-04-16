// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Supabase Config
// ⚠️  Replace the two values below with your
//     Supabase Project URL and Anon Key
//     Found at: supabase.com → your project
//             → Project Settings → API
// ══════════════════════════════════════════════

const SUPABASE_URL  = 'https://yekgjkgiyyilpwriwivl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlla2dqa2dpeXlpbHB3cml3aXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyODc1MzMsImV4cCI6MjA5MTg2MzUzM30.STSq_lwtZH8LFs2lof06BxbQU9C_7fVFdsEVuSWqTgk';

// Business rules — change these if the rates change
const LOAN_CONFIG = {
  PROCESSING_FEE_RATE   : 0.04,   // 4%  — charged upfront
  MONTHLY_INTEREST_RATE : 0.10,   // 10% per month — flat rate
  LATE_PENALTY_RATE     : 0.10,   // 10% of monthly payment
  MIN_DURATION_MONTHS   : 1,
  MAX_DURATION_MONTHS   : 12,
  CURRENCY              : 'GHS',
  CURRENCY_SYMBOL       : 'GH₵',
  BUSINESS_NAME         : 'E-Max Enterprise',
};

-- ══════════════════════════════════════════════════════════
-- E-MAX LOAN MANAGER — Supabase Database Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── AGENTS (business owner profile) ──────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     varchar(255),
  business_name varchar(255) DEFAULT 'E-Max Enterprise',
  phone         varchar(50),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_own" ON agents FOR ALL USING (user_id = auth.uid());

-- ─── BORROWERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS borrowers (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id          uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  full_name         varchar(255) NOT NULL,
  phone             varchar(50),
  address           text,
  ghana_card_number varchar(100),
  photo_url         text,
  id_photo_url      text,
  occupation        varchar(255),
  employer          varchar(255),
  date_of_birth     date,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "borrowers_own" ON borrowers FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── GUARANTORS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guarantors (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id          uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  borrower_id       uuid NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
  full_name         varchar(255) NOT NULL,
  phone             varchar(50),
  address           text,
  relationship      varchar(100),
  ghana_card_number varchar(100),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guarantors_own" ON guarantors FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── WITNESSES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS witnesses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
  full_name   varchar(255) NOT NULL,
  phone       varchar(50),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE witnesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "witnesses_own" ON witnesses FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── LOANS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id         uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  borrower_id      uuid NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
  guarantor_id     uuid REFERENCES guarantors(id),
  witness_id       uuid REFERENCES witnesses(id),

  -- Amounts (all in GHS)
  principal        numeric(12,2) NOT NULL,
  processing_fee   numeric(12,2) NOT NULL,   -- always 4% of principal
  interest_rate    numeric(5,2)  DEFAULT 10.00, -- 10% per month
  duration_months  integer NOT NULL,
  monthly_payment  numeric(12,2) NOT NULL,   -- (principal + total_interest) / months
  total_interest   numeric(12,2) NOT NULL,   -- principal * 10% * months
  total_repayable  numeric(12,2) NOT NULL,   -- principal + total_interest
  amount_paid      numeric(12,2) DEFAULT 0,  -- sum of payments received

  -- Dates
  start_date       date NOT NULL,
  end_date         date NOT NULL,

  -- Status: Active | Completed | Defaulted | Overdue
  status                varchar(50) DEFAULT 'Active',
  processing_fee_paid   boolean DEFAULT false,
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_own" ON loans FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── PAYMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id       uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  loan_id        uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount_paid    numeric(12,2) NOT NULL,
  penalty_amount numeric(12,2) DEFAULT 0,  -- 10% of monthly_payment if late
  payment_date   date NOT NULL DEFAULT current_date,
  month_number   integer,    -- which installment (1, 2, 3…)
  is_late        boolean DEFAULT false,
  notes          text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own" ON payments FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── ACTIVITY LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  activity_type   varchar(100),  -- LOAN_CREATED | PAYMENT_RECORDED | LOAN_COMPLETED
  description     text,
  borrower_name   varchar(255),
  loan_id         uuid,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_own" ON activity_log FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_agents_updated_at    BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trig_borrowers_updated_at BEFORE UPDATE ON borrowers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trig_loans_updated_at     BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── ENROLLMENT SUBMISSIONS ──────────────────────────────────
-- Public applications from the enrollment.html page (no auth required)
CREATE TABLE IF NOT EXISTS enrollment_submissions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id              uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  -- Borrower
  full_name             varchar(255) NOT NULL,
  phone                 varchar(50)  NOT NULL,
  address               text,
  date_of_birth         date,
  occupation            varchar(255),
  ghana_card_number     varchar(100),
  -- Guarantor
  guarantor_name        varchar(255),
  guarantor_phone       varchar(50),
  guarantor_address     text,
  guarantor_relationship varchar(100),
  guarantor_card        varchar(100),
  -- Witness
  witness_name          varchar(255),
  witness_phone         varchar(50),
  -- Loan request
  amount_requested      numeric(12,2),
  duration_months       integer,
  purpose               varchar(255),
  notes                 text,
  -- Status: Pending | Approved | Rejected
  status                varchar(50) DEFAULT 'Pending',
  -- Privacy & Documents (added v2.1)
  privacy_consent       boolean     DEFAULT false,
  consent_timestamp     timestamptz,
  id_photo_url          text,        -- URL to uploaded Ghana Card / Passport photo
  passport_photo_url    text,        -- URL to uploaded passport-size photograph
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE enrollment_submissions ENABLE ROW LEVEL SECURITY;

-- Agents can read and update their own submissions
CREATE POLICY "enroll_agent_read" ON enrollment_submissions
  FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "enroll_agent_update" ON enrollment_submissions
  FOR UPDATE USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- IMPORTANT: Allow public (unauthenticated) inserts for borrower enrollment form
CREATE POLICY "enroll_public_insert" ON enrollment_submissions
  FOR INSERT WITH CHECK (true);

-- ─── STORAGE BUCKET (for photos) ───────────────────────────
-- Run this SEPARATELY in Supabase Storage settings:
-- Create bucket called "loan-docs" → set to Public
-- Or run via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-docs', 'loan-docs', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated agents to upload their own docs
CREATE POLICY "loan_docs_agent_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'loan-docs' AND auth.role() = 'authenticated');

-- Allow ANYONE (unauthenticated borrowers) to upload enrollment docs
-- (secured by the enrollments/ prefix — agents cannot see each other's files via RLS)
CREATE POLICY "loan_docs_enrollment_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'loan-docs'
    AND (storage.foldername(name))[1] = 'enrollments'
  );

CREATE POLICY "loan_docs_public_read"  ON storage.objects
  FOR SELECT USING (bucket_id = 'loan-docs');
CREATE POLICY "loan_docs_owner_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'loan-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── MIGRATION: Add new columns if upgrading from v1 ───────────────
-- Run ONLY if you already have an existing enrollment_submissions table:
-- ALTER TABLE enrollment_submissions ADD COLUMN IF NOT EXISTS privacy_consent      boolean DEFAULT false;
-- ALTER TABLE enrollment_submissions ADD COLUMN IF NOT EXISTS consent_timestamp    timestamptz;
-- ALTER TABLE enrollment_submissions ADD COLUMN IF NOT EXISTS id_photo_url         text;
-- ALTER TABLE enrollment_submissions ADD COLUMN IF NOT EXISTS passport_photo_url   text;

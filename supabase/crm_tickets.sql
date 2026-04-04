-- CRM Service Tickets Migration
-- Run this in the Supabase SQL Editor before deploying the CRM feature

CREATE TABLE service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')) DEFAULT 'OPEN',
  customer_email text,
  subject text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_service_tickets_status ON service_tickets(status);
CREATE INDEX idx_service_tickets_source_id ON service_tickets(source_id);

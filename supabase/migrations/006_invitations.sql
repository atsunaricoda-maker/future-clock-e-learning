-- Create invitations table for member invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

-- Unique constraint: one pending invitation per email per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_email
  ON invitations (company_id, email)
  WHERE status = 'pending';

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token);

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Company admins can view invitations for their company
CREATE POLICY "Company admins can view own company invitations"
ON invitations FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT u.company_id FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'company_admin')
  )
);

-- Company admins can insert invitations for their company
CREATE POLICY "Company admins can create invitations"
ON invitations FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT u.company_id FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'company_admin')
  )
);

-- Company admins can update invitations for their company
CREATE POLICY "Company admins can update own company invitations"
ON invitations FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT u.company_id FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'company_admin')
  )
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  template TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_attendee ON sms_logs(attendee_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

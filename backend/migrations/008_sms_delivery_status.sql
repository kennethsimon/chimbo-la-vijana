ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_group_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_done_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_response JSONB;

CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_message_id ON sms_logs(provider_message_id);

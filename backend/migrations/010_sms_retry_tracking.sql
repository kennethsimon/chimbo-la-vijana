ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_group TEXT,
  ADD COLUMN IF NOT EXISTS retry_of UUID REFERENCES sms_logs(id) ON DELETE SET NULL;

UPDATE sms_logs
SET provider_reference = coalesce(
      provider_reference,
      response->'messages'->0->>'messageId',
      response->'messages'->0->>'sendReference'
    ),
    provider_status_name = coalesce(provider_status_name, response->'messages'->0->'status'->>'name'),
    provider_status_group = coalesce(provider_status_group, response->'messages'->0->'status'->>'groupName');

UPDATE sms_logs
SET status = 'failed',
    error = coalesce(
      error,
      response->'messages'->0->'status'->>'description',
      response->'messages'->0->'status'->>'name',
      'SMS provider rejected the message'
    )
WHERE response->'messages'->0->'status'->>'groupName' = 'REJECTED'
   OR response->'messages'->0->'status'->>'name' LIKE 'FAILED\_%' ESCAPE '\';

CREATE INDEX IF NOT EXISTS idx_sms_logs_status_created_at ON sms_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_retry_of ON sms_logs(retry_of);

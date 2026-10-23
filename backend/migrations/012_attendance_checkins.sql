ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'checkin';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_roles_known;

ALTER TABLE users
  ADD CONSTRAINT users_roles_known CHECK (
    roles <@ ARRAY['admin', 'exhibitor', 'food', 'checkin']::TEXT[]
    AND cardinality(roles) > 0
  );

CREATE TABLE IF NOT EXISTS attendance_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  checked_in_by_user_id UUID NOT NULL REFERENCES users(id),
  scan_day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_checkins_event_day CHECK (
    scan_day IN (DATE '2026-10-24', DATE '2026-10-25')
  ),
  CONSTRAINT attendance_checkins_attendee_day_unique UNIQUE (attendee_id, scan_day)
);

CREATE INDEX IF NOT EXISTS idx_attendance_checkins_created_at
  ON attendance_checkins(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_checkins_user
  ON attendance_checkins(checked_in_by_user_id);

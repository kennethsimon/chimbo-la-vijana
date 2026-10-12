ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS attendance_days TEXT[] NOT NULL DEFAULT ARRAY['2026-10-24','2026-10-25']::TEXT[];

ALTER TABLE attendees
  DROP CONSTRAINT IF EXISTS attendees_attendance_days_known;

ALTER TABLE attendees
  ADD CONSTRAINT attendees_attendance_days_known CHECK (
    attendance_days <@ ARRAY['2026-10-24','2026-10-25']::TEXT[]
    AND cardinality(attendance_days) > 0
  );

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS scan_day DATE NOT NULL DEFAULT DATE '2026-10-24';

DROP INDEX IF EXISTS idx_visits_attendee_booth_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_attendee_booth_day_unique
  ON visits(attendee_id, booth_id, scan_day);

ALTER TABLE food_claims
  ADD COLUMN IF NOT EXISTS scan_day DATE NOT NULL DEFAULT DATE '2026-10-24';

ALTER TABLE food_claims
  DROP CONSTRAINT IF EXISTS food_claims_attendee_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_claims_attendee_day_unique
  ON food_claims(attendee_id, scan_day);

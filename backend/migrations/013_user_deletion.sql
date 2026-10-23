ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_scanned_by_user_id_fkey,
  ALTER COLUMN scanned_by_user_id DROP NOT NULL,
  ADD CONSTRAINT visits_scanned_by_user_id_fkey
    FOREIGN KEY (scanned_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE food_claims
  DROP CONSTRAINT IF EXISTS food_claims_claimed_by_user_id_fkey,
  ALTER COLUMN claimed_by_user_id DROP NOT NULL,
  ADD CONSTRAINT food_claims_claimed_by_user_id_fkey
    FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE attendance_checkins
  DROP CONSTRAINT IF EXISTS attendance_checkins_checked_in_by_user_id_fkey,
  ALTER COLUMN checked_in_by_user_id DROP NOT NULL,
  ADD CONSTRAINT attendance_checkins_checked_in_by_user_id_fkey
    FOREIGN KEY (checked_in_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

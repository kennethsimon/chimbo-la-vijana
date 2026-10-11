ALTER TABLE users
  ADD COLUMN IF NOT EXISTS roles TEXT[];

UPDATE users
SET roles = ARRAY[role::TEXT]
WHERE roles IS NULL OR cardinality(roles) = 0;

ALTER TABLE users
  ALTER COLUMN roles SET DEFAULT ARRAY['exhibitor']::TEXT[],
  ALTER COLUMN roles SET NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS exhibitor_requires_booth;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_roles_known;

ALTER TABLE users
  ADD CONSTRAINT users_roles_known CHECK (
    roles <@ ARRAY['admin', 'exhibitor', 'food']::TEXT[]
    AND cardinality(roles) > 0
  );

ALTER TABLE users
  ADD CONSTRAINT exhibitor_requires_booth CHECK (
    NOT roles @> ARRAY['exhibitor']::TEXT[] OR booth_id IS NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_attendee_booth_unique
  ON visits(attendee_id, booth_id);

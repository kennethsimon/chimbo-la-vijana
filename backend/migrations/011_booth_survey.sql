ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS new_info TEXT,
  ADD COLUMN IF NOT EXISTS training_institution TEXT,
  ADD COLUMN IF NOT EXISTS survey_status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_purpose_known;
ALTER TABLE visits ADD CONSTRAINT visits_purpose_known CHECK (
  purpose IS NULL OR purpose IN ('question', 'service', 'issue_resolved')
);

ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_survey_status_known;
ALTER TABLE visits ADD CONSTRAINT visits_survey_status_known CHECK (
  survey_status IN ('completed', 'skipped')
);

CREATE INDEX IF NOT EXISTS idx_visits_purpose ON visits(purpose);
CREATE INDEX IF NOT EXISTS idx_visits_survey_status ON visits(survey_status);

INSERT INTO booths (name) VALUES
  ('Wizara ya Vijana'),
  ('HESLB'),
  ('Traffic Police'),
  ('PPRA'),
  ('NIDA'),
  ('Training Centre')
ON CONFLICT (name) DO NOTHING;

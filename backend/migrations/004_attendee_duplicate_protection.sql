CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_email_unique
  ON attendees (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_phone_unique
  ON attendees (phone);

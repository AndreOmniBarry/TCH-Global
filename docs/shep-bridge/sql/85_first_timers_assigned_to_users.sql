-- SHEP.HRD (shepherd-app) — run once in Supabase SQL Editor. Applied 27 Oct 2026.
-- first_timers.assigned_to referenced members(id), but every part of the app
-- (manual first-timer form, event check-in, care portal filter, the website
-- bridge) stores a users(id) there, so any assigned insert failed with 23503.
-- NOT VALID: existing rows are left as they are; only new/changed rows are checked.
BEGIN;
ALTER TABLE first_timers DROP CONSTRAINT IF EXISTS first_timers_assigned_to_fkey;
ALTER TABLE first_timers
  ADD CONSTRAINT first_timers_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
COMMIT;

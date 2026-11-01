-- SHEP.HRD (shepherd-app) — run once in Supabase SQL Editor. Applied 1 Nov 2026.
-- Website sign-ups arrived with branch_id NULL ("all branches"), so branch-scoped
-- views (care team, branch pastors) never listed them. They now take the branch of
-- the care person they are assigned to; existing rows were fixed the same way.
BEGIN;
UPDATE first_timers ft
SET branch_id = u.branch_id
FROM users u
WHERE ft.source = 'tch_website' AND ft.branch_id IS NULL
  AND u.id = ft.assigned_to AND u.branch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION tch_web_branch_from_assignee() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source = 'tch_website' AND NEW.branch_id IS NULL AND NEW.assigned_to IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM users WHERE id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tch_web_branch ON first_timers;
CREATE TRIGGER tch_web_branch BEFORE INSERT ON first_timers
  FOR EACH ROW EXECUTE FUNCTION tch_web_branch_from_assignee();
COMMIT;

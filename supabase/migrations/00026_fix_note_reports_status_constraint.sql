ALTER TABLE note_reports DROP CONSTRAINT IF EXISTS note_reports_status_check;
ALTER TABLE note_reports ADD CONSTRAINT note_reports_status_check CHECK (status = ANY (ARRAY['pending'::text, 'resolved'::text, 'rejected'::text, 'ignored'::text]));

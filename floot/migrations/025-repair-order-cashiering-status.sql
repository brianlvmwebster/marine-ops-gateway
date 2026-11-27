BEGIN;
LOCK TABLE service_jobs IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='repair_order_lines'::regclass AND conname='repair_order_lines_status_check'
      AND pg_get_constraintdef(oid) LIKE '%Ready to Cashier%') THEN RETURN; END IF;
  ALTER TABLE repair_order_lines DROP CONSTRAINT IF EXISTS repair_order_lines_status_check;
  ALTER TABLE repair_order_lines ADD CONSTRAINT repair_order_lines_status_check
    CHECK (status IN ('Pending','In progress','Done','Ready to Cashier','Cashiered','Cancelled'));

  -- The Lightspeed importer appended the source status to the end of imported job notes.
  WITH restored AS (
    UPDATE repair_order_lines
    SET status=(regexp_match(notes,'(?:^|\n\n)Lightspeed job status: (Ready to Cashier|Cashiered)(?:\n\nCustomer approval: [^\n]*)?$'))[1]
    WHERE status='Done' AND notes LIKE 'Lightspeed Job ID: %'
      AND notes ~ '(?:^|\n\n)Lightspeed job status: (Ready to Cashier|Cashiered)(?:\n\nCustomer approval: [^\n]*)?$'
    RETURNING order_id
  )
  UPDATE service_jobs SET version=version+1 WHERE id IN (SELECT order_id FROM restored);
END $$;
COMMIT;

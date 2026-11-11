-- AUD-011: Keep payment-proofs private. Admin downloads go through the app
-- (service role), never through a public Storage URL.
-- No-op when storage schema is absent (non-Supabase Postgres).

DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RETURN;
  END IF;

  UPDATE storage.buckets
  SET public = false
  WHERE id = 'payment-proofs' OR name = 'payment-proofs';

  IF to_regclass('storage.objects') IS NULL THEN
    RETURN;
  END IF;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual::text, '') ILIKE '%payment-proofs%'
        OR COALESCE(with_check::text, '') ILIKE '%payment-proofs%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

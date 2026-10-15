-- AI 业务记录可能包含客户询盘和商业资料，禁止通过 public bucket 暴露。
UPDATE storage.buckets
SET public = false
WHERE id = 'exports';

DROP POLICY IF EXISTS "public_upload_exports" ON storage.objects;
DROP POLICY IF EXISTS "public_read_exports" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_exports" ON storage.objects;
DROP POLICY IF EXISTS "users_read_own_exports" ON storage.objects;

CREATE POLICY "users_upload_own_exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_read_own_exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

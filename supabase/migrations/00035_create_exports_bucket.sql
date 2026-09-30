-- AI业务记录Excel导出：创建公开读的 exports 桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports', 'exports', true, 52428800,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
);

CREATE POLICY "public_upload_exports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exports');
CREATE POLICY "public_read_exports" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exports');

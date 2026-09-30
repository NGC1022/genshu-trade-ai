-- AI客服图片识别：存放用户上传的文创商品图片
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support_images',
  'support_images',
  true,
  1048576,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
);

-- 登录用户可上传自己的客服图片
CREATE POLICY "auth_upload_support_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support_images');

-- 公开读取
CREATE POLICY "public_read_support_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support_images');

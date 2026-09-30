-- 创建评论图片存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-images',
  'comment-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略：任何认证用户都可以上传
CREATE POLICY "任何认证用户可以上传评论图片"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-images');

-- 所有人都可以查看评论图片
CREATE POLICY "所有人可以查看评论图片"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comment-images');

-- 用户可以删除自己上传的评论图片
CREATE POLICY "用户可以删除自己的评论图片"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-images' AND owner::text = auth.uid()::text);

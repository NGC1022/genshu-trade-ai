ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_likes_list BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.show_likes_list IS '是否允许他人查看我的点赞笔记';

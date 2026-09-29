-- 创建笔记表
CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    images text[] DEFAULT '{}'::text[],
    topics text[] DEFAULT '{}'::text[],
    music text,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建笔记点赞表
CREATE TABLE IF NOT EXISTS public.note_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, note_id)
);

-- 创建笔记评论表
CREATE TABLE IF NOT EXISTS public.note_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 启用 RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

-- 笔记策略
CREATE POLICY "Anyone can view notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- 点赞策略
CREATE POLICY "Anyone can view likes" ON public.note_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can toggle likes" ON public.note_likes FOR ALL USING (auth.uid() = user_id);

-- 评论策略
CREATE POLICY "Anyone can view comments" ON public.note_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.note_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.note_comments FOR DELETE USING (auth.uid() = user_id);

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('notes_images', 'notes_images', true) ON CONFLICT (id) DO NOTHING;

-- 存储桶策略
-- 注意：Storage 策略通常需要更精细，这里简化为公开读，已验证用户上传
CREATE POLICY "Notes images are public" ON storage.objects FOR SELECT USING (bucket_id = 'notes_images');
CREATE POLICY "Authenticated users can upload note images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes_images' AND auth.role() = 'authenticated');

-- 触发器：更新笔记的点赞数和评论数
CREATE OR REPLACE FUNCTION public.handle_note_interaction()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND TG_TABLE_NAME = 'note_likes') THEN
        UPDATE public.notes SET likes_count = likes_count + 1 WHERE id = NEW.note_id;
    ELSIF (TG_OP = 'DELETE' AND TG_TABLE_NAME = 'note_likes') THEN
        UPDATE public.notes SET likes_count = likes_count - 1 WHERE id = OLD.note_id;
    ELSIF (TG_OP = 'INSERT' AND TG_TABLE_NAME = 'note_comments') THEN
        UPDATE public.notes SET comments_count = comments_count + 1 WHERE id = NEW.note_id;
    ELSIF (TG_OP = 'DELETE' AND TG_TABLE_NAME = 'note_comments') THEN
        UPDATE public.notes SET comments_count = comments_count - 1 WHERE id = OLD.note_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 绑定触发器
-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS on_like_added ON public.note_likes;
DROP TRIGGER IF EXISTS on_like_removed ON public.note_likes;
DROP TRIGGER IF EXISTS on_comment_added ON public.note_comments;
DROP TRIGGER IF EXISTS on_comment_removed ON public.note_comments;

CREATE TRIGGER on_like_added AFTER INSERT ON public.note_likes FOR EACH ROW EXECUTE FUNCTION public.handle_note_interaction();
CREATE TRIGGER on_like_removed AFTER DELETE ON public.note_likes FOR EACH ROW EXECUTE FUNCTION public.handle_note_interaction();
CREATE TRIGGER on_comment_added AFTER INSERT ON public.note_comments FOR EACH ROW EXECUTE FUNCTION public.handle_note_interaction();
CREATE TRIGGER on_comment_removed AFTER DELETE ON public.note_comments FOR EACH ROW EXECUTE FUNCTION public.handle_note_interaction();

-- 允许用户查看作者信息（通过 public_profiles）
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT id, username, avatar_url, role FROM profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 创建草稿表
CREATE TABLE IF NOT EXISTS public.note_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text,
  images text[],
  topics text[],
  location jsonb,
  recommended_products text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_note_drafts_user_id ON public.note_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_note_drafts_updated_at ON public.note_drafts(updated_at DESC);

-- RLS策略
ALTER TABLE public.note_drafts ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和管理自己的草稿
CREATE POLICY "用户可查看自己的草稿"
  ON public.note_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建草稿"
  ON public.note_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的草稿"
  ON public.note_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的草稿"
  ON public.note_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- 创建用户追踪表
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- RLS策略
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看追踪关系
CREATE POLICY "所有人可查看追踪关系"
  ON public.user_follows FOR SELECT
  USING (true);

-- 用户可以追踪其他用户
CREATE POLICY "用户可追踪他人"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- 用户可以取消追踪
CREATE POLICY "用户可取消追踪"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 为profiles表添加统计字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='followers_count') THEN
    ALTER TABLE public.profiles ADD COLUMN followers_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='following_count') THEN
    ALTER TABLE public.profiles ADD COLUMN following_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_likes') THEN
    ALTER TABLE public.profiles ADD COLUMN total_likes integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notes_count') THEN
    ALTER TABLE public.profiles ADD COLUMN notes_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
  END IF;
END $$;

-- 创建触发器函数：更新追踪者统计
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 增加被追踪者的粉丝数
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    -- 增加追踪者的关注数
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 减少被追踪者的粉丝数
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    -- 减少追踪者的关注数
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON public.user_follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- 添加新的消息类型注释
COMMENT ON COLUMN public.messages.type IS 'note_deleted: 笔记被删除, report_rejected: 举报被驳回, system: 系统消息, new_note_from_following: 追踪的用户发布新笔记';

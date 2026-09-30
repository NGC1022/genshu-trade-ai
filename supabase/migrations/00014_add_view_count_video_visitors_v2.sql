-- 添加观看量字段到notes表
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- 添加视频字段到notes表
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS videos text[];

-- 创建访客记录表（简化版，不限制每天一次）
CREATE TABLE IF NOT EXISTS public.profile_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profile_visitors_profile ON public.profile_visitors(profile_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_visitors_visitor ON public.profile_visitors(visitor_id);

-- RLS策略
ALTER TABLE public.profile_visitors ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看访客记录
CREATE POLICY "所有人可查看访客记录"
  ON public.profile_visitors FOR SELECT
  USING (true);

-- 用户可以记录访问
CREATE POLICY "用户可记录访问"
  ON public.profile_visitors FOR INSERT
  WITH CHECK (auth.uid() = visitor_id);

-- 添加隐私设置字段到profiles表
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='show_following_list') THEN
    ALTER TABLE public.profiles ADD COLUMN show_following_list boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='show_visitors') THEN
    ALTER TABLE public.profiles ADD COLUMN show_visitors boolean DEFAULT true;
  END IF;
END $$;

-- 创建触发器函数：更新笔记数量
CREATE OR REPLACE FUNCTION update_notes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_deleted IS NULL OR NEW.is_deleted = false THEN
      UPDATE profiles SET notes_count = notes_count + 1 WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.is_deleted IS NULL OR OLD.is_deleted = false) AND NEW.is_deleted = true THEN
      UPDATE profiles SET notes_count = GREATEST(0, notes_count - 1) WHERE id = NEW.user_id;
    END IF;
    IF OLD.is_deleted = true AND (NEW.is_deleted IS NULL OR NEW.is_deleted = false) THEN
      UPDATE profiles SET notes_count = notes_count + 1 WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_deleted IS NULL OR OLD.is_deleted = false THEN
      UPDATE profiles SET notes_count = GREATEST(0, notes_count - 1) WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_notes_count ON public.notes;
CREATE TRIGGER trigger_update_notes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_notes_count();

-- 初始化现有用户的笔记数量
UPDATE profiles p
SET notes_count = (
  SELECT COUNT(*) 
  FROM notes n 
  WHERE n.user_id = p.id 
  AND (n.is_deleted IS NULL OR n.is_deleted = false)
);

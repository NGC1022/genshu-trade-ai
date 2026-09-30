-- 扩展comments表，添加点赞数、父评论ID、删除标记
ALTER TABLE note_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE note_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES note_comments(id) ON DELETE CASCADE;
ALTER TABLE note_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE note_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 创建评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES note_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 创建评论点赞索引
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 创建评论举报表
CREATE TABLE IF NOT EXISTS comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES note_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT[] NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected', 'ignored')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建评论举报索引
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON comment_reports(reporter_id);

-- 创建隐藏评论表
CREATE TABLE IF NOT EXISTS comment_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES note_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 创建隐藏评论索引
CREATE INDEX IF NOT EXISTS idx_comment_hidden_user_id ON comment_hidden(user_id);

-- 创建评论点赞数自动更新触发器
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE note_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE note_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- RLS策略
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_hidden ENABLE ROW LEVEL SECURITY;

-- 评论点赞策略
CREATE POLICY "用户可以查看所有评论点赞" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "用户可以点赞评论" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以取消自己的点赞" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- 评论举报策略
CREATE POLICY "用户可以查看自己的举报" ON comment_reports FOR SELECT USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "用户可以举报评论" ON comment_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "管理员可以更新举报状态" ON comment_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 隐藏评论策略
CREATE POLICY "用户可以查看自己隐藏的评论" ON comment_hidden FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可以隐藏评论" ON comment_hidden FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以取消隐藏" ON comment_hidden FOR DELETE USING (auth.uid() = user_id);

-- 创建园区公告表
CREATE TABLE IF NOT EXISTS park_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX idx_announcements_active ON park_announcements(is_active, priority DESC, created_at DESC);

-- RLS策略
ALTER TABLE park_announcements ENABLE ROW LEVEL SECURITY;

-- 所有人可查看已激活的公告
CREATE POLICY "Anyone can view active announcements" ON park_announcements
  FOR SELECT USING (is_active = true);

-- 管理员可以管理公告
CREATE POLICY "Admins can manage announcements" ON park_announcements
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 插入初始公告数据
INSERT INTO park_announcements (title, content, priority) VALUES
('欢迎来到根书文创园', '根书文创园是集文化体验、艺术创作、非遗传承于一体的综合性文化园区。我们致力于传承和发扬中华传统文化，为游客提供独特的文化体验。', 100),
('开放时间调整通知', '根书文创园开放时间：周一至周日 9:00-18:00（最后入园时间17:30）。法定节假日正常开放，如有特殊情况将提前公告。', 90),
('春节活动预告', '春节期间（正月初一至初七）园区将举办"根书迎春"主题活动，包括传统书法体验、非遗手工制作、民俗表演等精彩内容，敬请期待！', 80);

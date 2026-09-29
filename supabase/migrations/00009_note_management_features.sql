-- 为笔记表添加管理字段
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 创建笔记举报表
CREATE TABLE IF NOT EXISTS public.note_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建笔记屏蔽表
CREATE TABLE IF NOT EXISTS public.note_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- RLS 策略
ALTER TABLE public.note_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;

-- 举报表策略
CREATE POLICY "用户可以查看自己的举报" ON public.note_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "用户可以提交举报" ON public.note_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "管理员可以查看所有举报" ON public.note_reports
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "管理员可以更新举报状态" ON public.note_reports
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 屏蔽表策略
CREATE POLICY "用户可以查看自己的屏蔽列表" ON public.note_blocks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "用户可以屏蔽笔记" ON public.note_blocks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以取消屏蔽" ON public.note_blocks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_note_reports_note_id ON public.note_reports(note_id);
CREATE INDEX IF NOT EXISTS idx_note_reports_reporter_id ON public.note_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_note_reports_status ON public.note_reports(status);
CREATE INDEX IF NOT EXISTS idx_note_blocks_user_id ON public.note_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_note_blocks_note_id ON public.note_blocks(note_id);

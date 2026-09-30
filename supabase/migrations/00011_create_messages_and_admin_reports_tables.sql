-- 创建消息表
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note_deleted', 'report_rejected', 'system')),
  title text NOT NULL,
  content text NOT NULL,
  related_note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

-- RLS策略
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的消息
CREATE POLICY "用户可查看自己的消息"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以更新自己的消息（标记为已读）
CREATE POLICY "用户可更新自己的消息"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

-- 系统可以插入消息（通过service role）
CREATE POLICY "系统可插入消息"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- 添加举报状态字段的注释
COMMENT ON COLUMN public.note_reports.status IS 'pending: 待处理, reviewed: 已审核, resolved: 已处理(删除笔记), rejected: 已驳回';

-- 创建电子票根表
CREATE TABLE IF NOT EXISTS ticket_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL,
  visit_date DATE NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  stub_image_url TEXT,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建票根索引
CREATE INDEX IF NOT EXISTS idx_ticket_stubs_user_id ON ticket_stubs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_stubs_ticket_id ON ticket_stubs(ticket_id);

-- RLS策略
ALTER TABLE ticket_stubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的票根" ON ticket_stubs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "系统可以创建票根" ON ticket_stubs FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以更新自己的票根" ON ticket_stubs FOR UPDATE USING (auth.uid() = user_id);

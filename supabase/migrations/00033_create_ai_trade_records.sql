-- AI跨境贸易助手：业务记录表
CREATE TABLE IF NOT EXISTS ai_trade_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product_translate', 'market_analysis', 'inquiry', 'quote')),
  product_id TEXT,
  product_name TEXT,
  market TEXT,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按用户+时间倒序查询
CREATE INDEX IF NOT EXISTS idx_ai_trade_records_user ON ai_trade_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_records_type ON ai_trade_records(user_id, type);

-- RLS：用户仅能访问自己的记录
ALTER TABLE ai_trade_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai trade records" ON ai_trade_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai trade records" ON ai_trade_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai trade records" ON ai_trade_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai trade records" ON ai_trade_records
  FOR DELETE USING (auth.uid() = user_id);

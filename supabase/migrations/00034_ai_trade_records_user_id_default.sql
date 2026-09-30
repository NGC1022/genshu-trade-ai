-- 修复：插入时未显式携带 user_id 导致违反 RLS 策略
-- 设置默认值为当前认证用户，作为兜底（前端同时会显式传 user_id）
ALTER TABLE ai_trade_records ALTER COLUMN user_id SET DEFAULT auth.uid();

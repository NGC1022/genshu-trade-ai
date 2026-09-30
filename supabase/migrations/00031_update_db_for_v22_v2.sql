-- 1. 更新门票价格和票种
-- 首先清除现有不相关的票种，保持整洁
DELETE FROM ticket_types;

-- 插入新的票种
INSERT INTO ticket_types (id, name, description, price, is_active)
VALUES 
  (gen_random_uuid(), '乐山大佛成人单票', '成人票单票，包含景区门票一张。', 80.00, true),
  (gen_random_uuid(), '成人联票', '包含乐山大佛景区门票 + 根书艺术馆付费讲解服务。', 88.00, true),
  (gen_random_uuid(), '根书艺术馆讲解服务', '由专业人员提供深度艺术讲解，深入了解根书文化。', 20.00, true);

-- 2. 创建数字IP表
CREATE TABLE IF NOT EXISTS digital_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  concept TEXT,
  highlights TEXT,
  background_story TEXT,
  role_setting TEXT,
  image_url TEXT,
  comic_strip TEXT[], -- 漫画系列插图URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 扩展用户信息表（支持会员体系）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS member_level TEXT DEFAULT 'normal', -- normal, silver, gold, platinum
ADD COLUMN IF NOT EXISTS member_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ;

-- 4. 创建优惠券系统
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  discount_amount DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  acquired_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建会员专属内容表
CREATE TABLE IF NOT EXISTS exclusive_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 科普知识, 幕后故事, 艺术鉴赏
  cover_image TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建 3D 打印模板表
CREATE TABLE IF NOT EXISTS three_d_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入 4 种固定 3D 打印模板
INSERT INTO three_d_templates (name, description, price)
VALUES 
  ('IP形象摆件 - 灵动系列', '基于数字IP形象设计的灵动系列摆件，底座可定制文字。', 199.00),
  ('IP形象徽章 - 荣誉系列', '精美的数字IP形象徽章，适合作为收藏或礼品，底座可定制。', 49.00),
  ('IP形象挂件 - 随行系列', '随身携带的数字IP形象挂件，为您增添一份艺术气息，底座可定制。', 29.00),
  ('IP形象笔架 - 瑞智系列', '兼具实用性与艺术性的IP形象笔架，底座可定制文字。', 129.00);

-- RLS 策略 (公共访问，简化处理)
ALTER TABLE digital_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for digital_ips" ON digital_ips FOR SELECT USING (true);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for coupons" ON coupons FOR SELECT USING (true);

ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own coupons" ON user_coupons FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE exclusive_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for exclusive_content" ON exclusive_content FOR SELECT USING (true);

ALTER TABLE three_d_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for three_d_templates" ON three_d_templates FOR SELECT USING (true);

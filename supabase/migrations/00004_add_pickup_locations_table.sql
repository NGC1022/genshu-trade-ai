-- 创建自提点表
CREATE TABLE IF NOT EXISTS pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '18:00',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX idx_pickup_locations_active ON pickup_locations(is_active);

-- RLS策略
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;

-- 所有人可查看已激活的自提点
CREATE POLICY "Anyone can view active pickup locations" ON pickup_locations
  FOR SELECT USING (is_active = true);

-- 管理员可以管理自提点
CREATE POLICY "Admins can manage pickup locations" ON pickup_locations
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 插入初始自提点数据
INSERT INTO pickup_locations (name, address, latitude, longitude, phone) VALUES
('根书文创园纪念品店', '北京市房山区青龙湖镇根书文创园1号楼', 39.7234, 116.0123, '010-12345678'),
('根书艺术馆纪念品店', '北京市房山区青龙湖镇根书文创园艺术馆', 39.7245, 116.0135, '010-87654321'),
('景区游客中心纪念品店', '北京市房山区青龙湖镇游客服务中心', 39.7256, 116.0147, '010-11223344');

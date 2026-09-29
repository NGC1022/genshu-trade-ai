-- 用户角色枚举
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- 订单状态枚举
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded');

-- 退款状态枚举
CREATE TYPE refund_status AS ENUM ('pending_review', 'processing', 'completed', 'closed', 'abnormal');

-- 配送方式枚举
CREATE TYPE delivery_method AS ENUM ('pickup', 'express');

-- 定制类型枚举
CREATE TYPE customization_type AS ENUM ('3d_print', 'premium');

-- 定制状态枚举
CREATE TYPE customization_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled');

-- 门票状态枚举
CREATE TYPE ticket_status AS ENUM ('unused', 'used', 'expired', 'refunded');

-- 用户资料表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  username TEXT UNIQUE,
  openid TEXT,
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 商品SKU表
CREATE TABLE sku (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'regular' 或 'premium'
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock_available INT DEFAULT 0,
  stock_reserved INT DEFAULT 0,
  stock_sold INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_nonneg CHECK (stock_available >= 0 AND stock_reserved >= 0 AND stock_sold >= 0)
);

-- 门票类型表
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  validity_days INT NOT NULL DEFAULT 30, -- 有效期天数
  usage_notes TEXT,
  image_url TEXT,
  stock_available INT DEFAULT 0,
  stock_reserved INT DEFAULT 0,
  stock_sold INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ticket_stock_nonneg CHECK (stock_available >= 0 AND stock_reserved >= 0 AND stock_sold >= 0)
);

-- 收货地址表
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  detail TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品订单表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,
  status order_status DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(12,2) NOT NULL,
  refunded_amount NUMERIC(12,2) DEFAULT 0,
  delivery_method delivery_method NOT NULL,
  address_id UUID REFERENCES addresses(id),
  pickup_location TEXT,
  tracking_number TEXT,
  remark TEXT,
  wechat_transaction_id TEXT,
  version INT DEFAULT 0,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 退款记录表
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_no TEXT UNIQUE,
  order_no TEXT NOT NULL REFERENCES orders(order_no),
  item_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  initiated_by TEXT NOT NULL DEFAULT 'user',
  status refund_status DEFAULT 'pending_review',
  refund_quantity INT NOT NULL DEFAULT 1,
  refund_amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  admin_note TEXT,
  wechat_refund_id TEXT,
  version INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 门票订单表
CREATE TABLE ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visit_date DATE NOT NULL,
  status order_status DEFAULT 'pending',
  wechat_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 门票表
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  qr_code TEXT NOT NULL, -- 核销二维码内容
  status ticket_status DEFAULT 'unused',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id), -- 核销员
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 定制订单表
CREATE TABLE customization_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  openid TEXT,
  type customization_type NOT NULL,
  status customization_status DEFAULT 'pending',
  
  -- 3D打印定制字段
  template_id TEXT,
  custom_text TEXT,
  preview_image_url TEXT,
  
  -- 高端定制字段
  theme TEXT,
  budget NUMERIC(12,2),
  delivery_date DATE,
  special_requirements TEXT,
  
  -- 通用字段
  deposit_amount NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  final_amount NUMERIC(12,2),
  admin_note TEXT,
  progress_note TEXT,
  wechat_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_openid ON profiles(openid);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_refunds_order_no ON refunds(order_no);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_ticket_orders_user_id ON ticket_orders(user_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX idx_customization_orders_user_id ON customization_orders(user_id);
CREATE INDEX idx_customization_orders_status ON customization_orders(status);

-- 创建图片存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('app-9dlnarhqk45d_images', 'app-9dlnarhqk45d_images', true);

-- 存储桶策略：允许所有用户上传图片
CREATE POLICY "Allow all users to upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-9dlnarhqk45d_images');

CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'app-9dlnarhqk45d_images');

-- 管理员辅助函数
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- 用户注册触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  INSERT INTO public.profiles (id, email, phone, username, openid, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data->>'username')::text, NULL),
    COALESCE((NEW.raw_user_meta_data->>'openid')::text, NULL),
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Profiles RLS策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- 公开视图
CREATE VIEW public_profiles AS
  SELECT id, username, avatar_url, role FROM profiles;

-- SKU RLS策略
ALTER TABLE sku ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active SKUs" ON sku
  FOR SELECT TO public USING (is_active = TRUE);

CREATE POLICY "Admins can manage SKUs" ON sku
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 门票类型RLS策略
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ticket types" ON ticket_types
  FOR SELECT TO public USING (is_active = TRUE);

CREATE POLICY "Admins can manage ticket types" ON ticket_types
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 地址RLS策略
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addresses" ON addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses" ON addresses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses" ON addresses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses" ON addresses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 订单RLS策略
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 退款RLS策略
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refunds" ON refunds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert refund requests" ON refunds
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all refunds" ON refunds
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update refunds" ON refunds
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 门票订单RLS策略
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ticket orders" ON ticket_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ticket orders" ON ticket_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ticket orders" ON ticket_orders
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 门票RLS策略
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets" ON tickets
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 定制订单RLS策略
ALTER TABLE customization_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customization orders" ON customization_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert customization orders" ON customization_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all customization orders" ON customization_orders
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update customization orders" ON customization_orders
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 库存管理RPC函数
CREATE OR REPLACE FUNCTION reserve_sku_stock(
  p_sku_code TEXT,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sku
  SET 
    stock_available = stock_available - p_quantity,
    stock_reserved = stock_reserved + p_quantity,
    updated_at = NOW()
  WHERE sku_code = p_sku_code AND stock_available >= p_quantity;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_sku_stock(
  p_sku_code TEXT,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sku
  SET 
    stock_reserved = stock_reserved - p_quantity,
    stock_sold = stock_sold + p_quantity,
    updated_at = NOW()
  WHERE sku_code = p_sku_code AND stock_reserved >= p_quantity;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_sku_stock(
  p_sku_code TEXT,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sku
  SET 
    stock_reserved = stock_reserved - p_quantity,
    stock_available = stock_available + p_quantity,
    updated_at = NOW()
  WHERE sku_code = p_sku_code AND stock_reserved >= p_quantity;
  
  RETURN FOUND;
END;
$$;

-- 门票库存管理RPC函数
CREATE OR REPLACE FUNCTION reserve_ticket_stock(
  p_ticket_type_id UUID,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ticket_types
  SET 
    stock_available = stock_available - p_quantity,
    stock_reserved = stock_reserved + p_quantity,
    updated_at = NOW()
  WHERE id = p_ticket_type_id AND stock_available >= p_quantity;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_ticket_stock(
  p_ticket_type_id UUID,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ticket_types
  SET 
    stock_reserved = stock_reserved - p_quantity,
    stock_sold = stock_sold + p_quantity,
    updated_at = NOW()
  WHERE id = p_ticket_type_id AND stock_reserved >= p_quantity;
  
  RETURN FOUND;
END;
$$;

-- 退款金额计算RPC函数
CREATE OR REPLACE FUNCTION get_refundable_amount(
  p_order_no TEXT,
  p_item_index INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_subtotal NUMERIC;
  v_refunded_amount NUMERIC;
BEGIN
  SELECT items->p_item_index INTO v_item
  FROM orders
  WHERE order_no = p_order_no;
  
  IF v_item IS NULL THEN
    RETURN 0;
  END IF;
  
  v_subtotal := (v_item->>'subtotal')::NUMERIC;
  v_refunded_amount := COALESCE((v_item->>'refunded_amount')::NUMERIC, 0);
  
  RETURN v_subtotal - v_refunded_amount;
END;
$$;

CREATE OR REPLACE FUNCTION update_item_refund_amount(
  p_order_no TEXT,
  p_item_index INT,
  p_refund_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_current_refunded NUMERIC;
BEGIN
  SELECT items->p_item_index INTO v_item
  FROM orders
  WHERE order_no = p_order_no;
  
  IF v_item IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_current_refunded := COALESCE((v_item->>'refunded_amount')::NUMERIC, 0);
  
  UPDATE orders
  SET 
    items = jsonb_set(
      items,
      ARRAY[p_item_index::TEXT, 'refunded_amount'],
      to_jsonb(v_current_refunded + p_refund_amount)
    ),
    refunded_amount = refunded_amount + p_refund_amount,
    updated_at = NOW()
  WHERE order_no = p_order_no;
  
  RETURN FOUND;
END;
$$;

-- 插入初始数据
INSERT INTO sku (sku_code, name, description, category, price, stock_available, image_url) VALUES
('SKU-KEY-001', '根书钥匙扣-福', '精美根书福字钥匙扣，传统文化元素', 'regular', 29.90, 100, 'placeholder-keychain-fu.jpg'),
('SKU-KEY-002', '根书钥匙扣-喜', '精美根书喜字钥匙扣，传统文化元素', 'regular', 29.90, 100, 'placeholder-keychain-xi.jpg'),
('SKU-SEAL-001', '根书印章-姓名定制', '个性化姓名印章，传统篆刻工艺', 'regular', 68.00, 50, 'placeholder-seal.jpg'),
('SKU-BOOK-001', '根书书签套装', '精美根书书签套装，5枚装', 'regular', 39.90, 80, 'placeholder-bookmark.jpg'),
('SKU-PREM-001', '根书艺术摆件', '高端根书艺术摆件，需定制', 'premium', 1888.00, 10, 'placeholder-premium-art.jpg'),
('SKU-PREM-002', '根书字画', '大师级根书字画作品，需定制', 'premium', 3888.00, 5, 'placeholder-premium-painting.jpg');

INSERT INTO ticket_types (name, description, price, original_price, validity_days, usage_notes, stock_available) VALUES
('根书体验+景区参观联名套票', '包含根书艺术馆体验和景区参观，一票通玩', 128.00, 168.00, 30, '1. 购票后30天内有效\n2. 需提前预约参观时间\n3. 一人一票，不可转让\n4. 请携带有效身份证件', 500),
('根书艺术馆单人体验票', '根书艺术馆深度体验，含专业讲解', 68.00, 88.00, 30, '1. 购票后30天内有效\n2. 需提前预约参观时间\n3. 一人一票，不可转让\n4. 含专业讲解服务', 1000);

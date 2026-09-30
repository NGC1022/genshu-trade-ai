-- ============================================================
-- 根生万象：AI跨境贸易业务自动化助手 数据层扩展
-- ============================================================

-- 商家/审核/管理员角色辅助函数（业务数据权限）
CREATE OR REPLACE FUNCTION is_merchant(check_uid uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = check_uid AND role IN ('admin','merchant','reviewer'));
$$;

-- ============================================================
-- 1. SKU 国际化与贸易字段扩展
-- ============================================================
ALTER TABLE sku
  ADD COLUMN name_en text,
  ADD COLUMN description_en text,
  ADD COLUMN material text,
  ADD COLUMN dimensions text,
  ADD COLUMN weight_grams integer,
  ADD COLUMN packaging text,
  ADD COLUMN origin text DEFAULT '中国',
  ADD COLUMN lead_time text,
  ADD COLUMN after_sales_policy text,
  ADD COLUMN sellable_countries text[] DEFAULT '{}',
  ADD COLUMN stock_warning_threshold integer DEFAULT 10,
  ADD COLUMN cost numeric;

-- ============================================================
-- 2. ai_trade_records 类型与审核扩展
-- ============================================================
ALTER TABLE ai_trade_records DROP CONSTRAINT ai_trade_records_type_check;
ALTER TABLE ai_trade_records ADD CONSTRAINT ai_trade_records_type_check
  CHECK (type = ANY (ARRAY['product_translate','market_analysis','inquiry','quote','trade_compliance','trade_document','marketing_content','customer_intent','export_plan','support_chat']::text[]));
ALTER TABLE ai_trade_records ADD COLUMN review_status text NOT NULL DEFAULT 'none';
ALTER TABLE ai_trade_records ADD CONSTRAINT ai_trade_records_review_status_check
  CHECK (review_status = ANY (ARRAY['none','pending','approved','rejected']::text[]));
ALTER TABLE ai_trade_records ADD COLUMN source text NOT NULL DEFAULT 'mock';

-- ============================================================
-- 3. 海外客户CRM
-- ============================================================
CREATE TABLE overseas_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  country text,
  contact text,
  customer_type text NOT NULL DEFAULT 'potential',
  status text NOT NULL DEFAULT 'new_inquiry',
  tags text[] DEFAULT '{}',
  intent_product text,
  intent_quantity integer,
  first_inquiry_at timestamptz DEFAULT now(),
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT overseas_customers_status_check CHECK (status = ANY (ARRAY['new_inquiry','contacted','quoted','sample_confirmed','ordered','deal_closed','completed']::text[])),
  CONSTRAINT overseas_customers_type_check CHECK (customer_type = ANY (ARRAY['potential','existing','distributor','retailer','event_organizer']::text[]))
);

CREATE TABLE customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid NOT NULL REFERENCES overseas_customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'inquiry',
  content text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT customer_communications_type_check CHECK (type = ANY (ARRAY['inquiry','reply','quote','note']::text[]))
);

-- ============================================================
-- 4. 报价单（版本管理）
-- ============================================================
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  quote_no text NOT NULL,
  customer_id uuid REFERENCES overseas_customers(id),
  customer_name text,
  product_id text,
  product_name text,
  sku_code text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CNY',
  market text,
  shipping_method text,
  shipping_cost numeric NOT NULL DEFAULT 0,
  other_cost numeric NOT NULL DEFAULT 0,
  exchange_rate numeric NOT NULL DEFAULT 1,
  exchange_rate_source text NOT NULL DEFAULT 'demo',
  product_amount numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_display numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  parent_id uuid,
  status text NOT NULL DEFAULT 'ai_generated',
  ai_description jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT quotes_status_check CHECK (status = ANY (ARRAY['ai_generated','pending_review','modified','confirmed','sent']::text[]))
);

-- ============================================================
-- 5. 贸易单证
-- ============================================================
CREATE TABLE trade_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  doc_type text NOT NULL,
  order_no text,
  customer_name text,
  content jsonb NOT NULL DEFAULT '{}',
  missing_fields text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT trade_documents_type_check CHECK (doc_type = ANY (ARRAY['proforma_invoice','commercial_invoice','packing_list','order_confirmation','shipping_instruction']::text[])),
  CONSTRAINT trade_documents_status_check CHECK (status = ANY (ARRAY['draft','pending_review','confirmed']::text[]))
);

-- ============================================================
-- 6. 售后工单
-- ============================================================
CREATE TABLE after_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  order_no text NOT NULL,
  type text NOT NULL,
  reason text,
  description text NOT NULL,
  images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT after_sales_type_check CHECK (type = ANY (ARRAY['return','exchange','refund','damage']::text[])),
  CONSTRAINT after_sales_status_check CHECK (status = ANY (ARRAY['submitted','reviewing','processing','logistics','completed','rejected']::text[]))
);

-- ============================================================
-- 7. 异常订单
-- ============================================================
CREATE TABLE order_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  order_no text NOT NULL,
  type text NOT NULL,
  description text,
  ai_suggestion jsonb,
  notify_draft text,
  status text NOT NULL DEFAULT 'identified',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT order_exceptions_type_check CHECK (type = ANY (ARRAY['logistics_delay','customs_issue','address_error','delivery_failed','package_damaged','payment_issue','refunding','customer_cancelled']::text[])),
  CONSTRAINT order_exceptions_status_check CHECK (status = ANY (ARRAY['identified','ai_suggested','confirmed','executed','recorded']::text[]))
);

-- ============================================================
-- RLS：业务表（商家可见全部，用户归属自己的数据，管理员全权）
-- ============================================================
ALTER TABLE overseas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE after_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view all customers" ON overseas_customers FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert own customers" ON overseas_customers FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update customers" ON overseas_customers FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Owners delete customers" ON overseas_customers FOR DELETE TO authenticated USING (is_admin(uid()) OR uid() = user_id);

CREATE POLICY "Merchants view communications" ON customer_communications FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert communications" ON customer_communications FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update communications" ON customer_communications FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Owners delete communications" ON customer_communications FOR DELETE TO authenticated USING (is_admin(uid()) OR uid() = user_id);

CREATE POLICY "Merchants view all quotes" ON quotes FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert quotes" ON quotes FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update quotes" ON quotes FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Owners delete quotes" ON quotes FOR DELETE TO authenticated USING (is_admin(uid()) OR uid() = user_id);

CREATE POLICY "Merchants view all documents" ON trade_documents FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert documents" ON trade_documents FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update documents" ON trade_documents FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Owners delete documents" ON trade_documents FOR DELETE TO authenticated USING (is_admin(uid()) OR uid() = user_id);

CREATE POLICY "Merchants view all after sales" ON after_sales FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert after sales" ON after_sales FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update after sales" ON after_sales FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Admins delete after sales" ON after_sales FOR DELETE TO authenticated USING (is_admin(uid()));

CREATE POLICY "Merchants view all exceptions" ON order_exceptions FOR SELECT TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Users insert exceptions" ON order_exceptions FOR INSERT TO authenticated WITH CHECK (uid() = user_id);
CREATE POLICY "Merchants update exceptions" ON order_exceptions FOR UPDATE TO authenticated USING (is_merchant(uid()) OR uid() = user_id);
CREATE POLICY "Owners delete exceptions" ON order_exceptions FOR DELETE TO authenticated USING (is_admin(uid()) OR uid() = user_id);

-- ============================================================
-- 演示数据种子：根书木质书签 + 美国市场 + 100件（课堂演示统一案例）
-- 归属演示管理员，保证演示链路数据完整
-- ============================================================
UPDATE sku SET
  name_en = 'Root Calligraphy Wooden Bookmark',
  description_en = 'Handcrafted wooden bookmark made from natural tree roots, featuring traditional Chinese root calligraphy art. Each piece is unique, embodying the beauty of intangible cultural heritage.',
  material = '天然木质（树根）',
  dimensions = '150×40×5mm',
  weight_grams = 30,
  packaging = '独立礼盒包装',
  origin = '中国',
  lead_time = '7-15天',
  after_sales_policy = '签收后7天内非人为损坏可退换',
  sellable_countries = ARRAY['美国','日本','韩国','新加坡','英国','德国','法国','澳大利亚','加拿大','马来西亚','泰国'],
  stock_warning_threshold = 20,
  cost = 12
WHERE sku_code = 'SKU-BOOK-001';

-- 演示链路需要100件可报价，确保演示库存充足
UPDATE sku SET stock_available = GREATEST(stock_available, 120) WHERE sku_code = 'SKU-BOOK-001';

INSERT INTO overseas_customers (user_id, name, country, contact, customer_type, status, tags, intent_product, intent_quantity, notes, is_demo)
SELECT '737210f0-71c1-4022-912b-a2f361b1dbc9', 'Cultural Events USA', '美国', 'events.usa@example.com', 'event_organizer', 'new_inquiry',
  ARRAY['文化活动','批量采购'], '根书木质书签', 100, '课堂演示客户：海外文化活动采购100件', true
WHERE NOT EXISTS (SELECT 1 FROM overseas_customers WHERE name = 'Cultural Events USA' AND is_demo = true);

INSERT INTO customer_communications (user_id, customer_id, type, content, language, is_demo)
SELECT '737210f0-71c1-4022-912b-a2f361b1dbc9', c.id, 'inquiry',
  'Hello, I am interested in your Root Calligraphy wooden bookmarks. We would like to purchase 100 pieces for a cultural event. Could you please provide the wholesale price and estimated delivery time?',
  'en', true
FROM overseas_customers c
WHERE c.name = 'Cultural Events USA' AND c.is_demo = true
  AND NOT EXISTS (
    SELECT 1 FROM customer_communications cc
    WHERE cc.customer_id = c.id AND cc.is_demo = true AND cc.type = 'inquiry'
  );

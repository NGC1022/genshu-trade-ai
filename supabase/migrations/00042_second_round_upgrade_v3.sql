-- 第二轮深度优化：跨境业务状态机、支付、库存、B2B/RFQ/样品/配置中心/操作日志

-- 1. 订单状态机扩展（enum 已预先扩容）+ 支付状态独立 + 订单快照增强
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (
  payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunding', 'refunded')
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'b2c';
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('b2c', 'b2b'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS trade_term text;
ALTER TABLE orders ADD CONSTRAINT orders_trade_term_check CHECK (
  trade_term IS NULL OR trade_term IN ('EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP', 'FCA', 'CPT')
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistics_plan jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_breakdown jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_snapshot jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_snapshot jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2. 订单状态变化日志表
CREATE TABLE order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL REFERENCES orders(order_no) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  operator_type text NOT NULL CHECK (operator_type IN ('system', 'user', 'admin', 'merchant')),
  operator_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 支付流水表
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL REFERENCES orders(order_no) ON DELETE CASCADE,
  transaction_no text UNIQUE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'CNY',
  channel text NOT NULL DEFAULT 'demo' CHECK (channel IN ('demo', 'wechat_pay', 'alipay', 'bank_transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_order_no ON payment_transactions(order_no);
CREATE INDEX idx_payment_transactions_transaction_no ON payment_transactions(transaction_no);

-- 4. SKU 扩展
ALTER TABLE sku ADD COLUMN is_on_sale boolean NOT NULL DEFAULT true;
ALTER TABLE sku ADD COLUMN moq integer CHECK (moq >= 0);
ALTER TABLE sku ADD COLUMN price_tiers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sku ADD COLUMN b2b_unit_price numeric(12,2);
ALTER TABLE sku ADD COLUMN sample_price numeric(12,2);

-- 5. RFQ 表
CREATE TABLE rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rfq_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES overseas_customers(id) ON DELETE SET NULL,
  sku_id uuid REFERENCES sku(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  target_market text,
  expected_delivery_date date,
  shipping_method text,
  trade_term text,
  remark text,
  ai_extracted jsonb,
  ai_extracted_at timestamptz,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'extracted', 'reviewed', 'quoted', 'closed')),
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfqs_user_id ON rfqs(user_id);
CREATE INDEX idx_rfqs_customer_id ON rfqs(customer_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);

-- 6. 样品订单表
CREATE TABLE sample_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sample_order_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES overseas_customers(id) ON DELETE SET NULL,
  sku_id uuid REFERENCES sku(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  shipping_method text,
  address_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled')),
  rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL,
  order_no text REFERENCES orders(order_no) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sample_orders_customer_id ON sample_orders(customer_id);
CREATE INDEX idx_sample_orders_user_id ON sample_orders(user_id);

-- 7. 跟进任务表
CREATE TABLE follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES overseas_customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('reply_inquiry', 'confirm_quote', 'confirm_sample', 'follow_logistics', 'follow_payment', 'custom')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  ai_suggestion text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_tasks_customer_id ON follow_up_tasks(customer_id);
CREATE INDEX idx_follow_up_tasks_status ON follow_up_tasks(status);
CREATE INDEX idx_follow_up_tasks_due_at ON follow_up_tasks(due_at);

-- 8. AI 操作记录表
CREATE TABLE ai_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_function_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('product_translate', 'market_analysis', 'inquiry', 'quote', 'support_chat', 'trade_compliance', 'trade_document', 'marketing_content', 'customer_intent', 'export_plan')),
  ai_trade_record_id uuid REFERENCES ai_trade_records(id) ON DELETE SET NULL,
  rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES overseas_customers(id) ON DELETE SET NULL,
  order_no text REFERENCES orders(order_no) ON DELETE SET NULL,
  input_summary text NOT NULL,
  input_data jsonb,
  output_result jsonb,
  model_name text,
  model_status text CHECK (model_status IN ('success', 'failed', 'timeout')),
  is_success boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES ai_operation_logs(id) ON DELETE SET NULL,
  human_modified boolean NOT NULL DEFAULT false,
  human_modified_content jsonb,
  modification_note text,
  human_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid,
  final_result jsonb,
  risk_hints text[],
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_operation_logs_user_id ON ai_operation_logs(user_id);
CREATE INDEX idx_ai_operation_logs_business_type ON ai_operation_logs(business_type);
CREATE INDEX idx_ai_operation_logs_ai_trade_record_id ON ai_operation_logs(ai_trade_record_id);
CREATE INDEX idx_ai_operation_logs_created_at ON ai_operation_logs(created_at);

-- 9. 通知模板表 + 消息中心扩展
CREATE TABLE notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('order_paid', 'order_shipped', 'customs_cleared', 'order_delivered', 'after_sale_submitted', 'quote_generated', 'inquiry_received', 'system')),
  title_zh text NOT NULL,
  content_zh text NOT NULL,
  title_en text,
  content_en text,
  variables text[] DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='related_rfq_id') THEN
    ALTER TABLE messages ADD COLUMN related_rfq_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='related_quote_id') THEN
    ALTER TABLE messages ADD COLUMN related_quote_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='related_after_sale_id') THEN
    ALTER TABLE messages ADD COLUMN related_after_sale_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='priority') THEN
    ALTER TABLE messages ADD COLUMN priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- 10. 操作日志表
CREATE TABLE operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_type text NOT NULL CHECK (operator_type IN ('user', 'admin', 'merchant', 'system', 'ai')),
  action text NOT NULL CHECK (action IN ('update_price', 'update_stock', 'confirm_quote', 'confirm_trade_doc', 'update_order_status', 'process_after_sale', 'refund', 'update_config', 'confirm_payment', 'cancel_order', 'update_customer', 'create_rfq', 'create_quote', 'create_order', 'ai_generate')),
  target_type text NOT NULL,
  target_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  note text,
  ip_address text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX idx_operation_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);

-- 11. 运营后台配置中心表
CREATE TABLE app_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  config_type text NOT NULL DEFAULT 'json' CHECK (config_type IN ('json', 'text', 'number', 'boolean')),
  description text,
  is_editable boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_configs (config_key, config_value, description) VALUES
('supported_countries', '["美国","日本","新加坡","韩国","英国","德国","澳大利亚","加拿大"]', '支持的国家/地区列表'),
('supported_currencies', '["CNY","USD","EUR","JPY","GBP","HKD","SGD","KRW","AUD","CAD"]', '支持的币种列表'),
('demo_exchange_rates', '{"USD":0.1394,"EUR":0.1285,"JPY":20.85,"GBP":0.1098,"HKD":1.09,"SGD":0.188,"KRW":185.5,"AUD":0.212,"CAD":0.189}', '演示汇率（相对CNY）'),
('logistics_plans', '[{"id":"economy","name":"经济型","nameEn":"Economy","cost":120,"minDays":12,"maxDays":20,"note":"适合非紧急大宗货物"}]', '物流方案'),
('after_sale_reasons', '["商品质量","物流破损","商品与描述不符","数量错误","配送问题","其他"]', '售后申请原因'),
('order_status_notes', '{"pending":"等待买家付款","paid":"买家已完成付款","preparing":"商家备货中","shipped":"商品已发货","in_transit":"国际运输中","customs":"目的国清关中","customs_cleared":"清关完成","last_mile":"末端配送中","delivered":"已签收","after_sales":"售后处理中","completed":"订单已完成","cancelled":"订单已取消","refunding":"退款处理中","refunded":"已退款"}', '订单状态说明'),
('demo_mode_switch', '{"enabled":true,"label":"课堂演示模式"}', '课堂演示模式总开关')
ON CONFLICT (config_key) DO NOTHING;

-- 12. 报价表扩展
ALTER TABLE quotes ADD COLUMN rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN trade_term text;
ALTER TABLE quotes ADD COLUMN price_tier jsonb;
ALTER TABLE quotes ADD COLUMN is_b2b boolean NOT NULL DEFAULT false;

-- 13. CRM 扩展
ALTER TABLE overseas_customers ADD COLUMN level text DEFAULT 'normal' CHECK (level IN ('normal', 'bronze', 'silver', 'gold', 'vip'));
ALTER TABLE overseas_customers ADD COLUMN score integer DEFAULT 0 CHECK (score >= 0);
ALTER TABLE overseas_customers ADD COLUMN source text;
ALTER TABLE overseas_customers ADD COLUMN last_contact_at timestamptz;
ALTER TABLE overseas_customers ADD COLUMN next_follow_up_at timestamptz;
ALTER TABLE overseas_customers ADD COLUMN inquiry_count integer NOT NULL DEFAULT 0;
ALTER TABLE overseas_customers ADD COLUMN quote_count integer NOT NULL DEFAULT 0;
ALTER TABLE overseas_customers ADD COLUMN order_count integer NOT NULL DEFAULT 0;
ALTER TABLE overseas_customers ADD COLUMN order_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE overseas_customers ADD COLUMN sample_order_count integer NOT NULL DEFAULT 0;

-- 14. 售后扩展
ALTER TABLE after_sales ADD COLUMN reason_category text;
ALTER TABLE after_sales ADD COLUMN required_materials text[] DEFAULT '{}';
ALTER TABLE after_sales ADD COLUMN evidence_urls text[] DEFAULT '{}';
ALTER TABLE after_sales ADD COLUMN refund_amount numeric(12,2);
ALTER TABLE after_sales ADD COLUMN approved_refund_amount numeric(12,2);
ALTER TABLE after_sales ADD COLUMN refund_approved_by uuid;
ALTER TABLE after_sales ADD COLUMN refund_approved_at timestamptz;

-- 15. AI trade records 扩展
ALTER TABLE ai_trade_records ADD COLUMN ai_operation_log_id uuid REFERENCES ai_operation_logs(id) ON DELETE SET NULL;
ALTER TABLE ai_trade_records ADD COLUMN human_modified_content jsonb;
ALTER TABLE ai_trade_records ADD COLUMN final_result jsonb;

-- 16. RLS
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_status_logs_user_isolation ON order_status_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.order_no = order_status_logs.order_no AND o.user_id = auth.uid())
    OR is_merchant(auth.uid())
  );

CREATE POLICY payment_transactions_user_isolation ON payment_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.order_no = payment_transactions.order_no AND o.user_id = auth.uid())
    OR is_merchant(auth.uid())
  );

CREATE POLICY rfqs_user_isolation ON rfqs
  FOR ALL USING (user_id = auth.uid() OR is_merchant(auth.uid()));

CREATE POLICY sample_orders_user_isolation ON sample_orders
  FOR ALL USING (user_id = auth.uid() OR is_merchant(auth.uid()));

CREATE POLICY follow_up_tasks_user_isolation ON follow_up_tasks
  FOR ALL USING (user_id = auth.uid() OR is_merchant(auth.uid()));

CREATE POLICY ai_operation_logs_user_isolation ON ai_operation_logs
  FOR ALL USING (user_id = auth.uid() OR is_merchant(auth.uid()));

CREATE POLICY notification_templates_read ON notification_templates
  FOR SELECT USING (true);

CREATE POLICY notification_templates_merchant_write ON notification_templates
  FOR ALL USING (is_merchant(auth.uid()));

CREATE POLICY operation_logs_user_isolation ON operation_logs
  FOR SELECT USING (operator_id = auth.uid() OR is_merchant(auth.uid()));

CREATE POLICY app_configs_read ON app_configs
  FOR SELECT USING (true);

CREATE POLICY app_configs_merchant_write ON app_configs
  FOR ALL USING (is_merchant(auth.uid()));

-- 17. 数据库函数
CREATE OR REPLACE FUNCTION check_order_status_transition(
  p_order_no text,
  p_new_status text,
  p_operator_type text DEFAULT 'system'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current text;
  v_allowed text[];
BEGIN
  SELECT status INTO v_current FROM orders WHERE order_no = p_order_no;
  IF v_current IS NULL THEN
    RAISE EXCEPTION '订单不存在';
  END IF;

  v_allowed := CASE v_current
    WHEN 'pending' THEN ARRAY['paid', 'cancelled']
    WHEN 'paid' THEN ARRAY['preparing', 'refunding', 'cancelled']
    WHEN 'preparing' THEN ARRAY['shipped', 'refunding', 'cancelled']
    WHEN 'shipped' THEN ARRAY['in_transit', 'after_sales']
    WHEN 'in_transit' THEN ARRAY['customs', 'after_sales']
    WHEN 'customs' THEN ARRAY['customs_cleared', 'after_sales']
    WHEN 'customs_cleared' THEN ARRAY['last_mile', 'after_sales']
    WHEN 'last_mile' THEN ARRAY['delivered', 'after_sales']
    WHEN 'delivered' THEN ARRAY['completed', 'after_sales']
    WHEN 'after_sales' THEN ARRAY['completed', 'refunded']
    WHEN 'completed' THEN ARRAY['after_sales']
    WHEN 'cancelled' THEN ARRAY[]::text[]
    WHEN 'refunding' THEN ARRAY['refunded', 'paid']
    WHEN 'refunded' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION '不允许的状态转换: % -> %', v_current, p_new_status;
  END IF;

  INSERT INTO order_status_logs (order_no, previous_status, new_status, operator_type, note)
  VALUES (p_order_no, v_current, p_new_status, p_operator_type, '状态机校验通过');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION create_payment_transaction(
  p_order_no text,
  p_transaction_no text,
  p_amount numeric,
  p_currency text DEFAULT 'CNY',
  p_channel text DEFAULT 'demo'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM payment_transactions WHERE transaction_no = p_transaction_no;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO payment_transactions (order_no, transaction_no, amount, currency, channel)
  VALUES (p_order_no, p_transaction_no, p_amount, p_currency, p_channel)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_order_payment_success_v2(
  p_order_no text,
  p_transaction_no text,
  p_amount numeric,
  p_currency text DEFAULT 'CNY',
  p_channel text DEFAULT 'demo'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_items jsonb;
  v_item jsonb;
  v_sku_id uuid;
  v_qty integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_no = p_order_no FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION '订单不存在';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN true;
  END IF;

  IF v_order.total_amount != p_amount THEN
    RAISE EXCEPTION '支付金额不匹配';
  END IF;

  PERFORM create_payment_transaction(p_order_no, p_transaction_no, p_amount, p_currency, p_channel);

  UPDATE payment_transactions
  SET status = 'paid', paid_at = now()
  WHERE transaction_no = p_transaction_no;

  PERFORM check_order_status_transition(p_order_no, 'paid', 'system');

  UPDATE orders
  SET payment_status = 'paid',
      status = 'paid',
      paid_at = COALESCE(paid_at, now()),
      version = version + 1,
      wechat_transaction_id = p_transaction_no
  WHERE order_no = p_order_no;

  v_items := v_order.items;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_sku_id := (v_item->>'sku_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_sku_id IS NOT NULL AND v_qty > 0 THEN
      PERFORM convert_sku_stock(v_sku_id, v_qty);
    END IF;
  END LOOP;

  INSERT INTO operation_logs (operator_type, action, target_type, target_id, after_data, note)
  VALUES ('system', 'confirm_payment', 'order', p_order_no, jsonb_build_object('transaction_no', p_transaction_no, 'amount', p_amount), '支付成功');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_order_and_release_stock(
  p_order_no text,
  p_reason text DEFAULT ''
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_items jsonb;
  v_item jsonb;
  v_sku_id uuid;
  v_qty integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_no = p_order_no FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION '订单不存在';
  END IF;

  IF NOT (v_order.status IN ('pending', 'paid', 'preparing')) THEN
    RAISE EXCEPTION '当前状态不允许取消: %', v_order.status;
  END IF;

  PERFORM check_order_status_transition(p_order_no, 'cancelled', 'user');

  UPDATE orders
  SET status = 'cancelled',
      payment_status = CASE WHEN payment_status = 'pending' THEN 'failed' ELSE payment_status END,
      version = version + 1
  WHERE order_no = p_order_no;

  v_items := v_order.items;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_sku_id := (v_item->>'sku_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_sku_id IS NOT NULL AND v_qty > 0 THEN
      PERFORM release_sku_stock(v_sku_id, v_qty);
    END IF;
  END LOOP;

  INSERT INTO operation_logs (operator_type, action, target_type, target_id, before_data, after_data, note)
  VALUES ('user', 'cancel_order', 'order', p_order_no, jsonb_build_object('status', v_order.status), jsonb_build_object('status', 'cancelled'), p_reason);

  RETURN true;
END;
$$;

-- 18. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rfqs', 'sample_orders', 'follow_up_tasks', 'notification_templates', 'operation_logs', 'app_configs']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t || '_updated_at', t);
  END LOOP;
END $$;

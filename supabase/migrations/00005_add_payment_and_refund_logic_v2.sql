-- 创建或更新 handle_new_user 函数以支持同步 openid
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
user_count int;
BEGIN
SELECT COUNT(*) INTO user_count FROM profiles;
-- 同步来自 auth.users 的元数据，包括 openid
INSERT INTO public.profiles (id, email, phone, role, openid, username)
VALUES (
  NEW.id,
  NEW.email,
  NEW.phone,
  CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
  COALESCE((NEW.raw_user_meta_data->>'openid')::text, NULL),
  COALESCE((NEW.raw_user_meta_data->>'username')::text, (SPLIT_PART(NEW.email, '@', 1))::text)
)
ON CONFLICT (id) DO UPDATE SET
  openid = COALESCE(EXCLUDED.openid, profiles.openid),
  email = COALESCE(EXCLUDED.email, profiles.email),
  phone = COALESCE(EXCLUDED.phone, profiles.phone);
RETURN NEW;
END;
$$;

-- 库存管理 RPC: 预减库存
CREATE OR REPLACE FUNCTION freeze_sku_stock(sku_list jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(sku_list) AS x(sku_code text, quantity int)
  LOOP
    UPDATE public.sku
    SET stock_available = stock_available - item.quantity,
        stock_reserved = stock_reserved + item.quantity,
        updated_at = NOW()
    WHERE sku_code = item.sku_code AND stock_available >= item.quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SKU % 库存不足', item.sku_code;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- 库存管理 RPC: 释放库存 (支付失败或取消)
CREATE OR REPLACE FUNCTION release_sku_stock(sku_list jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(sku_list) AS x(sku_code text, quantity int)
  LOOP
    UPDATE public.sku
    SET stock_available = stock_available + item.quantity,
        stock_reserved = stock_reserved - item.quantity,
        updated_at = NOW()
    WHERE sku_code = item.sku_code AND stock_reserved >= item.quantity;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- 库存管理 RPC: 转换库存 (支付成功)
CREATE OR REPLACE FUNCTION convert_sku_stock(sku_list jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(sku_list) AS x(sku_code text, quantity int)
  LOOP
    UPDATE public.sku
    SET stock_reserved = stock_reserved - item.quantity,
        stock_sold = stock_sold + item.quantity,
        updated_at = NOW()
    WHERE sku_code = item.sku_code AND stock_reserved >= item.quantity;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- 支付成功处理 RPC (原子性操作)
CREATE OR REPLACE FUNCTION handle_order_payment_success(p_order_no text, p_transaction_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
  v_items jsonb;
BEGIN
  -- 获取订单当前状态和商品列表
  SELECT status, items INTO v_order_status, v_items FROM public.orders WHERE order_no = p_order_no FOR UPDATE;
  
  IF v_order_status = 'pending' THEN
    -- 更新订单状态
    UPDATE public.orders
    SET status = 'paid',
        wechat_transaction_id = p_transaction_id,
        paid_at = NOW(),
        updated_at = NOW(),
        version = version + 1
    WHERE order_no = p_order_no;
    
    -- 转换库存
    PERFORM convert_sku_stock(v_items);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE; -- 已经是支付状态或订单不可用
END;
$$;

-- 门票支付成功处理 RPC
CREATE OR REPLACE FUNCTION handle_ticket_payment_success(p_order_no text, p_transaction_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
BEGIN
  -- 获取订单当前状态
  SELECT status INTO v_order_status FROM public.ticket_orders WHERE order_no = p_order_no FOR UPDATE;
  
  IF v_order_status = 'pending' THEN
    -- 更新订单状态
    UPDATE public.ticket_orders
    SET status = 'paid',
        wechat_transaction_id = p_transaction_id,
        paid_at = NOW(),
        updated_at = NOW()
    WHERE order_no = p_order_no;
    
    -- 激活门票
    UPDATE public.tickets
    SET status = 'unused',
        updated_at = NOW()
    WHERE order_no = p_order_no;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 退款管理 RPC: 获取可退款金额
CREATE OR REPLACE FUNCTION get_refundable_amount(p_order_no text, p_item_index int)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_refundable numeric;
BEGIN
  SELECT items->p_item_index INTO v_item FROM public.orders WHERE order_no = p_order_no;
  
  IF v_item IS NULL THEN
    RETURN 0;
  END IF;
  
  v_refundable = (v_item->>'subtotal')::numeric - (v_item->>'refunded_amount')::numeric;
  RETURN GREATER(v_refundable, 0);
END;
$$;

-- 退款管理 RPC: 更新商品退款金额
CREATE OR REPLACE FUNCTION update_item_refund_amount(p_order_no text, p_item_index int, p_refund_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orders
  SET items = jsonb_set(
    items,
    ARRAY[p_item_index::text, 'refunded_amount'],
    ((items->p_item_index->>'refunded_amount')::numeric + p_refund_amount)::text::jsonb
  ),
  refunded_amount = COALESCE(refunded_amount, 0) + p_refund_amount,
  updated_at = NOW(),
  version = version + 1
  WHERE order_no = p_order_no;
  
  RETURN FOUND;
END;
$$;

-- RLS 策略配置
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

-- 移除旧策略以防冲突
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can apply for refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can manage all refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can view their own ticket orders" ON public.ticket_orders;
DROP POLICY IF EXISTS "Users can create ticket orders" ON public.ticket_orders;
DROP POLICY IF EXISTS "Admins can manage all ticket orders" ON public.ticket_orders;

-- 重新创建策略
-- 允许用户查看自己的订单
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 允许用户提交订单 (初始为 pending)
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 管理员可以管理所有订单
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 允许用户查看自己的退款
CREATE POLICY "Users can view their own refunds" ON public.refunds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 允许用户申请退款
CREATE POLICY "Users can apply for refunds" ON public.refunds
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 管理员可以管理所有退款
CREATE POLICY "Admins can manage all refunds" ON public.refunds
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 允许用户查看自己的门票订单
CREATE POLICY "Users can view their own ticket orders" ON public.ticket_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 允许用户创建门票订单
CREATE POLICY "Users can create ticket orders" ON public.ticket_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 管理员可以管理所有门票订单
CREATE POLICY "Admins can manage all ticket orders" ON public.ticket_orders
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

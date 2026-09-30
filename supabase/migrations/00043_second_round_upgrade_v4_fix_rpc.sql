-- 修复 v3 迁移中的函数签名不匹配，并增强 create_goods_order 以支持第二轮新字段

-- 1. 增加库存 RPC 重载（兼容 v3 中按 sku_id + quantity 调用的版本）
CREATE OR REPLACE FUNCTION convert_sku_stock(p_sku_id uuid, p_quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sku
  SET stock_reserved = stock_reserved - p_quantity,
      stock_sold = stock_sold + p_quantity,
      updated_at = NOW()
  WHERE id = p_sku_id AND stock_reserved >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SKU % 库存转换失败', p_sku_id;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION release_sku_stock(p_sku_id uuid, p_quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sku
  SET stock_available = stock_available + p_quantity,
      stock_reserved = stock_reserved - p_quantity,
      updated_at = NOW()
  WHERE id = p_sku_id AND stock_reserved >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SKU % 库存释放失败', p_sku_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- 2. 增强商品下单 RPC：支持支付状态、订单类型、贸易条款、物流方案、费用明细、快照
CREATE OR REPLACE FUNCTION create_goods_order(
  p_user_id uuid,
  p_openid text,
  p_items jsonb,
  p_total_amount numeric,
  p_delivery_method text,
  p_address_id uuid DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_pickup_date text DEFAULT NULL,
  p_pickup_time text DEFAULT NULL,
  p_remark text DEFAULT NULL,
  p_payment_status text DEFAULT 'pending',
  p_order_type text DEFAULT 'b2c',
  p_trade_term text DEFAULT NULL,
  p_logistics_plan jsonb DEFAULT NULL,
  p_cost_breakdown jsonb DEFAULT NULL,
  p_address_snapshot jsonb DEFAULT NULL,
  p_product_snapshot jsonb DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_order_no text;
BEGIN
  -- 生成订单号
  v_order_no := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 8);

  -- 1. 冻结库存
  PERFORM public.freeze_sku_stock(p_items);

  -- 2. 插入订单
  INSERT INTO public.orders (
    order_no, user_id, openid, items, total_amount,
    delivery_method, address_id, pickup_location, pickup_date, pickup_time, remark,
    status, payment_status, order_type, trade_term, logistics_plan, cost_breakdown,
    address_snapshot, product_snapshot, version
  ) VALUES (
    v_order_no, p_user_id, p_openid, p_items, p_total_amount,
    p_delivery_method::public.delivery_method, p_address_id, p_pickup_location, p_pickup_date, p_pickup_time, p_remark,
    'pending', p_payment_status, p_order_type, p_trade_term, p_logistics_plan, p_cost_breakdown,
    p_address_snapshot, p_product_snapshot, 1
  ) RETURNING * INTO v_order;

  -- 3. 记录操作日志
  INSERT INTO operation_logs (operator_type, action, target_type, target_id, after_data, note)
  VALUES ('user', 'create_order', 'order', v_order_no, jsonb_build_object('items', p_items, 'total_amount', p_total_amount), '创建订单并锁定库存');

  RETURN v_order;
END;
$$;
